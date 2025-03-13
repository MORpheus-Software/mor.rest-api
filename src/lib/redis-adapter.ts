
import { createClient } from 'redis';

// Create Redis client based on environment
let redisClient: any = null;
let isConnecting = false;

// Check if code is running in browser
const isBrowser = typeof window !== 'undefined';

// First, check if a Docker Redis container is available
const hasRedisUrl = !isBrowser && process.env.REDIS_URL;

// Second, check for Upstash credentials
const hasUpstashCreds = !isBrowser && 
                        process.env.UPSTASH_REST_API_DOMAIN && 
                        process.env.UPSTASH_REST_API_TOKEN;

// If REDIS_URL is explicitly set, prioritize using Docker/local Redis
// Otherwise, use Upstash if credentials are available
const useLocalRedis = hasRedisUrl;

/**
 * Get or create a Redis client
 */
async function getRedisInstance() {
  // Return existing client if it's ready
  if (redisClient && redisClient.isReady) {
    return redisClient;
  }
  
  // Wait if already connecting
  if (isConnecting) {
    let attempts = 0;
    while (isConnecting && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (redisClient && redisClient.isReady) {
      return redisClient;
    }
  }
  
  isConnecting = true;
  
  try {
    // Get Redis URL from environment
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log(`[REDIS] Connecting to Redis at ${redisUrl}`);
    
    // Create Redis client
    redisClient = createClient({ url: redisUrl });
    
    // Set up error handler
    redisClient.on('error', (err: Error) => {
      console.error('[REDIS] Redis client error:', err);
    });
    
    // Connect to Redis
    await redisClient.connect();
    console.log('[REDIS] Connected to Redis successfully');
    
    return redisClient;
  } catch (error) {
    console.error('[REDIS] Failed to connect to Redis:', error);
    throw error;
  } finally {
    isConnecting = false;
  }
}

/**
 * Set a value in Redis
 */
export async function set(key: string, value: string, expirySeconds?: number): Promise<void> {
  try {
    if (isBrowser) {
      console.warn('[REDIS] Attempted to use Redis on client side');
      return;
    }
    
    const client = await getRedisInstance();
    
    if (expirySeconds) {
      await client.set(key, value, { EX: expirySeconds });
    } else {
      await client.set(key, value);
    }
    
    console.log(`[REDIS] Set key: ${key}`);
  } catch (error) {
    console.error('[REDIS] Error setting key:', error);
    throw error;
  }
}

/**
 * Get a value from Redis
 */
export async function get(key: string): Promise<string | null> {
  try {
    if (isBrowser) {
      console.warn('[REDIS] Attempted to use Redis on client side');
      return null;
    }
    
    const client = await getRedisInstance();
    const value = await client.get(key);
    
    console.log(`[REDIS] Get key: ${key}, Found: ${!!value}`);
    
    return value;
  } catch (error) {
    console.error('[REDIS] Error getting key:', error);
    throw error;
  }
}

/**
 * Delete a key from Redis
 */
export async function del(key: string): Promise<void> {
  try {
    if (isBrowser) {
      console.warn('[REDIS] Attempted to use Redis on client side');
      return;
    }
    
    const client = await getRedisInstance();
    await client.del(key);
    
    console.log(`[REDIS] Deleted key: ${key}`);
  } catch (error) {
    console.error('[REDIS] Error deleting key:', error);
    throw error;
  }
}

/**
 * Check if a key exists in Redis
 */
export async function exists(key: string): Promise<boolean> {
  try {
    if (isBrowser) {
      console.warn('[REDIS] Attempted to use Redis on client side');
      return false;
    }
    
    const client = await getRedisInstance();
    const result = await client.exists(key);
    
    console.log(`[REDIS] Key exists: ${key}, Result: ${!!result}`);
    
    return !!result;
  } catch (error) {
    console.error('[REDIS] Error checking if key exists:', error);
    throw error;
  }
}

/**
 * Get all keys matching a pattern
 */
export async function keys(pattern: string): Promise<string[]> {
  try {
    if (isBrowser) {
      console.warn('[REDIS] Attempted to use Redis on client side');
      return [];
    }
    
    const client = await getRedisInstance();
    const result = await client.keys(pattern);
    
    console.log(`[REDIS] Keys matching pattern: ${pattern}, Count: ${result.length}`);
    
    return result;
  } catch (error) {
    console.error('[REDIS] Error getting keys with pattern:', error);
    throw error;
  }
}

/**
 * Add a value to a set
 */
export async function sadd(key: string, ...members: string[]): Promise<number> {
  try {
    if (isBrowser) {
      console.warn('[REDIS] Attempted to use Redis on client side');
      return 0;
    }
    
    const client = await getRedisInstance();
    const result = await client.sAdd(key, members);
    
    console.log(`[REDIS] Added ${result} members to set: ${key}`);
    
    return result;
  } catch (error) {
    console.error('[REDIS] Error adding to set:', error);
    throw error;
  }
}

/**
 * Remove a value from a set
 */
export async function srem(key: string, ...members: string[]): Promise<number> {
  try {
    if (isBrowser) {
      console.warn('[REDIS] Attempted to use Redis on client side');
      return 0;
    }
    
    const client = await getRedisInstance();
    const result = await client.sRem(key, members);
    
    console.log(`[REDIS] Removed ${result} members from set: ${key}`);
    
    return result;
  } catch (error) {
    console.error('[REDIS] Error removing from set:', error);
    throw error;
  }
}

/**
 * Get all members of a set
 */
export async function smembers(key: string): Promise<string[]> {
  try {
    if (isBrowser) {
      console.warn('[REDIS] Attempted to use Redis on client side');
      return [];
    }
    
    const client = await getRedisInstance();
    const result = await client.sMembers(key);
    
    console.log(`[REDIS] Members of set: ${key}, Count: ${result.length}`);
    
    return result;
  } catch (error) {
    console.error('[REDIS] Error getting set members:', error);
    throw error;
  }
}
