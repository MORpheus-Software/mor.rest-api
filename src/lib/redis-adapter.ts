
import { createClient } from 'redis';
import * as Redis from 'ioredis';
import chalk from 'chalk';

// -----------------
// Redis configuration
// -----------------

// Detect if we're in a browser environment
const isBrowser = typeof process === 'undefined' || 
  !process.versions ||
  !process.versions.node;

// Get Redis URL from environment variable or use default local URL
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Check if Upstash credentials are provided
const UPSTASH_REST_API_DOMAIN = process.env.UPSTASH_REST_API_DOMAIN;
const UPSTASH_REST_API_TOKEN = process.env.UPSTASH_REST_API_TOKEN;
const useUpstash = UPSTASH_REST_API_DOMAIN && UPSTASH_REST_API_TOKEN;

// -----------------
// Redis client state
// -----------------

// Redis client instance
let redisClient: any = null;
let isConnecting = false;
let lastConnectionAttempt = 0;

// -----------------
// In-memory fallback storage for both server and browser
// -----------------

// Browser storage using localStorage
const browserStorage = {
  connect: async () => console.log('[REDIS] Browser storage connected'),
  disconnect: async () => console.log('[REDIS] Browser storage disconnected'),
  get: async (key: string) => {
    console.log(`[REDIS] Browser GET ${key}`);
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  set: async (key: string, value: string) => {
    console.log(`[REDIS] Browser SET ${key}`);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
    return 'OK';
  },
  exists: async (key: string) => {
    console.log(`[REDIS] Browser EXISTS ${key}`);
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) ? 1 : 0;
    }
    return 0;
  },
  del: async (key: string) => {
    console.log(`[REDIS] Browser DEL ${key}`);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
    return 1;
  },
  sadd: async (key: string, ...members: string[]) => {
    console.log(`[REDIS] Browser SADD ${key} ${members.join(' ')}`);
    if (typeof localStorage !== 'undefined') {
      const existingSet = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key) || '[]') : [];
      const newSet = [...new Set([...existingSet, ...members])];
      localStorage.setItem(key, JSON.stringify(newSet));
    }
    return members.length;
  },
  srem: async (key: string, ...members: string[]) => {
    console.log(`[REDIS] Browser SREM ${key} ${members.join(' ')}`);
    if (typeof localStorage !== 'undefined') {
      const existingSet = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key) || '[]') : [];
      const newSet = existingSet.filter((item: string) => !members.includes(item));
      localStorage.setItem(key, JSON.stringify(newSet));
    }
    return members.length;
  },
  smembers: async (key: string) => {
    console.log(`[REDIS] Browser SMEMBERS ${key}`);
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key) || '[]') : [];
    }
    return [];
  },
  keys: async (pattern: string) => {
    console.log(`[REDIS] Browser KEYS ${pattern}`);
    if (typeof localStorage !== 'undefined') {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(pattern.replace('*', ''))) {
          keys.push(key);
        }
      }
      return keys;
    }
    return [];
  }
};

// Server memory storage using Maps
const serverStorageMap = new Map<string, string>();
const serverSetMap = new Map<string, Set<string>>();

const serverStorage = {
  connect: async () => console.log('[REDIS] Server memory storage connected'),
  disconnect: async () => console.log('[REDIS] Server memory storage disconnected'),
  get: async (key: string) => {
    console.log(`[REDIS] Server GET ${key}`);
    return serverStorageMap.get(key) || null;
  },
  set: async (key: string, value: string) => {
    console.log(`[REDIS] Server SET ${key}`);
    serverStorageMap.set(key, value);
    return 'OK';
  },
  exists: async (key: string) => {
    console.log(`[REDIS] Server EXISTS ${key}`);
    return serverStorageMap.has(key) ? 1 : 0;
  },
  del: async (key: string) => {
    console.log(`[REDIS] Server DEL ${key}`);
    serverStorageMap.delete(key);
    return 1;
  },
  sadd: async (key: string, ...members: string[]) => {
    console.log(`[REDIS] Server SADD ${key} ${members.join(' ')}`);
    if (!serverSetMap.has(key)) {
      serverSetMap.set(key, new Set());
    }
    const set = serverSetMap.get(key)!;
    members.forEach(member => set.add(member));
    return members.length;
  },
  srem: async (key: string, ...members: string[]) => {
    console.log(`[REDIS] Server SREM ${key} ${members.join(' ')}`);
    if (!serverSetMap.has(key)) {
      return 0;
    }
    const set = serverSetMap.get(key)!;
    let count = 0;
    members.forEach(member => {
      if (set.delete(member)) {
        count++;
      }
    });
    return count;
  },
  smembers: async (key: string) => {
    console.log(`[REDIS] Server SMEMBERS ${key}`);
    if (!serverSetMap.has(key)) {
      return [];
    } 
    return Array.from(serverSetMap.get(key)!);
  },
  keys: async (pattern: string) => {
    console.log(`[REDIS] Server KEYS ${pattern}`);
    const prefix = pattern.replace('*', '');
    return Array.from(serverStorageMap.keys()).filter(key => key.startsWith(prefix));
  },
};

// -----------------
// Redis client management
// -----------------

/**
 * Get or create a Redis client - handles both local Redis and Upstash
 */
async function getRedisInstance() {
  // Return existing client if connected and ready
  if (redisClient && redisClient.isReady) {
    return redisClient;
  }
  
  // Don't attempt reconnection too frequently
  const now = Date.now();
  if (isConnecting || (now - lastConnectionAttempt < 5000)) {
    console.log('[REDIS] Connection already in progress or attempted recently');
    return null;
  }
  
  isConnecting = true;
  lastConnectionAttempt = now;
  
  try {
    // Check if we should use Upstash
    if (useUpstash) {
      console.log(`[REDIS] Connecting to Upstash Redis at ${UPSTASH_REST_API_DOMAIN}`);
      
      // Create Upstash Redis client using IoRedis
      const upstashUrl = `rediss://default:${UPSTASH_REST_API_TOKEN}@${UPSTASH_REST_API_DOMAIN}:6379`;
      redisClient = new Redis.default(upstashUrl);
      
      // Handle errors without crashing
      redisClient.on('error', (err: Error) => {
        console.error('[REDIS] Upstash connection error:', err.message);
      });
      
      console.log('[REDIS] Successfully connected to Upstash Redis');
      isConnecting = false;
      return redisClient;
    } else {
      // Use local Redis
      console.log(`[REDIS] Connecting to local Redis at ${REDIS_URL}`);
      
      // Create Redis client
      redisClient = createClient({
        url: REDIS_URL,
        socket: {
          connectTimeout: 5000, // 5 seconds timeout
          reconnectStrategy: (retries: number) => {
            if (retries > 2) {
              console.log('[REDIS] Max reconnection attempts reached');
              return false;
            }
            return Math.min(retries * 1000, 3000); // 1s, 2s, 3s
          }
        }
      });
      
      // Handle errors without crashing
      redisClient.on('error', (err: Error) => {
        console.error('[REDIS] Connection error:', err.message);
      });
      
      // Connect to Redis
      await redisClient.connect();
      console.log('[REDIS] Successfully connected to local Redis server');
      isConnecting = false;
      return redisClient;
    }
  } catch (error) {
    console.error('[REDIS] Failed to create or connect to Redis:', error instanceof Error ? error.message : String(error));
    isConnecting = false;
    redisClient = null; // Reset client on error
    return null;
  }
}

/**
 * Verify Redis connection and store a test value
 */
export async function verifyRedisConnection(): Promise<boolean> {
  try {
    const testKey = `redis-test-${Date.now()}`;
    const testValue = `test-value-${Date.now()}`;
    
    console.log(`[REDIS] Testing connection with key: ${testKey}`);
    
    // Try to set a test value
    await set(testKey, testValue);
    
    // Try to get the test value
    const retrievedValue = await get(testKey);
    
    // Clean up test key
    await del(testKey);
    
    if (retrievedValue === testValue) {
      console.log('[REDIS] Connection test successful');
      return true;
    } else {
      console.error('[REDIS] Connection test failed: Value mismatch');
      return false;
    }
  } catch (error) {
    console.error('[REDIS] Connection test failed with error:', error);
    return false;
  }
}

/**
 * Choose the appropriate storage backend
 */
async function getStorage() {
  if (isBrowser) {
    return browserStorage;
  }
  
  // Try to get Redis client
  const client = await getRedisInstance();
  if (client && client.isReady) {
    // Return a wrapper that ensures Redis commands are called correctly
    return {
      connect: async () => {},
      disconnect: async () => client.disconnect ? client.disconnect() : client.quit(),
      get: async (key: string) => client.get(key),
      set: async (key: string, value: string) => useUpstash ? client.set(key, value) : client.set(key, value),
      exists: async (key: string) => client.exists(key),
      del: async (key: string) => client.del(key),
      sadd: async (key: string, ...members: string[]) => {
        // IoRedis and node-redis have different APIs for sadd
        if (useUpstash) {
          return client.sadd(key, ...members);
        } else {
          return client.sAdd(key, members);
        }
      },
      srem: async (key: string, ...members: string[]) => {
        // IoRedis and node-redis have different APIs for srem
        if (useUpstash) {
          return client.srem(key, ...members);
        } else {
          return client.sRem(key, members);
        }
      },
      smembers: async (key: string) => {
        // IoRedis and node-redis have different APIs for smembers
        if (useUpstash) {
          return client.smembers(key);
        } else {
          return client.sMembers(key);
        }
      },
      keys: async (pattern: string) => client.keys(pattern)
    };
  }
  
  // Fall back to server-side memory storage
  console.log('[REDIS] Falling back to server memory storage');
  return serverStorage;
}

// -----------------
// Redis operations with fallback
// -----------------

/**
 * Set a value in Redis
 */
export async function set(key: string, value: string): Promise<string> {
  try {
    const storage = await getStorage();
    return await storage.set(key, value);
  } catch (error) {
    console.error('[REDIS] SET error:', error instanceof Error ? error.message : String(error));
    // Use appropriate fallback based on environment
    return isBrowser 
      ? await browserStorage.set(key, value)
      : await serverStorage.set(key, value);
  }
}

/**
 * Get a value from Redis
 */
export async function get(key: string): Promise<string | null> {
  try {
    const storage = await getStorage();
    return await storage.get(key);
  } catch (error) {
    console.error('[REDIS] GET error:', error instanceof Error ? error.message : String(error));
    // Use appropriate fallback based on environment
    return isBrowser 
      ? await browserStorage.get(key)
      : await serverStorage.get(key);
  }
}

/**
 * Check if a key exists in Redis
 */
export async function exists(key: string): Promise<number> {
  try {
    const storage = await getStorage();
    return await storage.exists(key);
  } catch (error) {
    console.error('[REDIS] EXISTS error:', error instanceof Error ? error.message : String(error));
    // Use appropriate fallback based on environment
    return isBrowser 
      ? await browserStorage.exists(key)
      : await serverStorage.exists(key);
  }
}

/**
 * Delete a key from Redis
 */
export async function del(key: string): Promise<number> {
  try {
    const storage = await getStorage();
    return await storage.del(key);
  } catch (error) {
    console.error('[REDIS] DEL error:', error instanceof Error ? error.message : String(error));
    // Use appropriate fallback based on environment
    return isBrowser 
      ? await browserStorage.del(key)
      : await serverStorage.del(key);
  }
}

/**
 * Add members to a Redis set
 */
export async function sadd(key: string, ...members: string[]): Promise<number> {
  try {
    const storage = await getStorage();
    return await storage.sadd(key, ...members);
  } catch (error) {
    console.error('[REDIS] SADD error:', error instanceof Error ? error.message : String(error));
    // Use appropriate fallback based on environment
    return isBrowser 
      ? await browserStorage.sadd(key, ...members)
      : await serverStorage.sadd(key, ...members);
  }
}

/**
 * Remove members from a Redis set
 */
export async function srem(key: string, ...members: string[]): Promise<number> {
  try {
    const storage = await getStorage();
    return await storage.srem(key, ...members);
  } catch (error) {
    console.error('[REDIS] SREM error:', error instanceof Error ? error.message : String(error));
    // Use appropriate fallback based on environment
    return isBrowser 
      ? await browserStorage.srem(key, ...members)
      : await serverStorage.srem(key, ...members);
  }
}

/**
 * Get all members of a Redis set
 */
export async function smembers(key: string): Promise<string[]> {
  try {
    const storage = await getStorage();
    return await storage.smembers(key);
  } catch (error) {
    console.error('[REDIS] SMEMBERS error:', error instanceof Error ? error.message : String(error));
    // Use appropriate fallback based on environment
    return isBrowser 
      ? await browserStorage.smembers(key)
      : await serverStorage.smembers(key);
  }
}

/**
 * Get all keys matching a pattern
 */
export async function keys(pattern: string): Promise<string[]> {
  try {
    const storage = await getStorage();
    return await storage.keys(pattern);
  } catch (error) {
    console.error('[REDIS] KEYS error:', error instanceof Error ? error.message : String(error));
    // Use appropriate fallback based on environment
    return isBrowser 
      ? await browserStorage.keys(pattern)
      : await serverStorage.keys(pattern);
  }
}
