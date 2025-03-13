
import { createClient, RedisClientType } from 'redis';

// Redis connection configuration
const REDIS_URL = process.env?.REDIS_URL || 'redis://localhost:6379';

// Safer environment detection that works in both Node.js and browser environments
const isBrowser = typeof process === 'undefined' || 
  !process.versions ||
  !process.versions.node;

// Mock Redis client for browser environments
const mockRedisClient = {
  connect: async () => console.log('Mock Redis client connected'),
  disconnect: async () => console.log('Mock Redis client disconnected'),
  set: async (key: string, value: string) => {
    console.log(`[MOCK-REDIS] SET ${key} ${value}`);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
    return 'OK';
  },
  get: async (key: string) => {
    console.log(`[MOCK-REDIS] GET ${key}`);
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  exists: async (key: string) => {
    console.log(`[MOCK-REDIS] EXISTS ${key}`);
    if (isBrowser) {
      return localStorage.getItem(key) ? 1 : 0;
    }
    return 0;
  },
  del: async (key: string) => {
    console.log(`[MOCK-REDIS] DEL ${key}`);
    if (isBrowser) {
      localStorage.removeItem(key);
    }
    return 1;
  },
  sadd: async (key: string, ...members: string[]) => {
    console.log(`[MOCK-REDIS] SADD ${key} ${members.join(' ')}`);
    if (isBrowser) {
      const existingSet = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key) || '[]') : [];
      const newSet = [...new Set([...existingSet, ...members])];
      localStorage.setItem(key, JSON.stringify(newSet));
    }
    return members.length;
  },
  srem: async (key: string, ...members: string[]) => {
    console.log(`[MOCK-REDIS] SREM ${key} ${members.join(' ')}`);
    if (isBrowser) {
      const existingSet = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key) || '[]') : [];
      const newSet = existingSet.filter((item: string) => !members.includes(item));
      localStorage.setItem(key, JSON.stringify(newSet));
    }
    return members.length;
  },
  smembers: async (key: string) => {
    console.log(`[MOCK-REDIS] SMEMBERS ${key}`);
    if (isBrowser) {
      return localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key) || '[]') : [];
    }
    return [];
  },
  keys: async (pattern: string) => {
    console.log(`[MOCK-REDIS] KEYS ${pattern}`);
    if (isBrowser) {
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
  },
};

// Choose the appropriate Redis client based on the environment
let client = isBrowser ? mockRedisClient : createClient({ url: REDIS_URL });

// Connect to Redis if not in browser
if (!isBrowser) {
  try {
    client.connect();
    console.log('Redis connected');
  } catch (error) {
    console.error('Redis connection error:', error);
  }
}

// Set a value in Redis
export async function set(key: string, value: string): Promise<string> {
  try {
    if (isBrowser) {
      return mockRedisClient.set(key, value);
    }
    return await client.set(key, value);
  } catch (error) {
    console.error(`Redis SET error for ${key}:`, error);
    throw error;
  }
}

// Get a value from Redis
export async function get(key: string): Promise<string | null> {
  try {
    if (isBrowser) {
      return mockRedisClient.get(key);
    }
    return await client.get(key);
  } catch (error) {
    console.error(`Redis GET error for ${key}:`, error);
    throw error;
  }
}

// Check if a key exists in Redis
export async function exists(key: string): Promise<number> {
  try {
    if (isBrowser) {
      return mockRedisClient.exists(key);
    }
    return await client.exists(key);
  } catch (error) {
    console.error(`Redis EXISTS error for ${key}:`, error);
    throw error;
  }
}

// Delete a key from Redis
export async function del(key: string): Promise<number> {
  try {
    if (isBrowser) {
      return mockRedisClient.del(key);
    }
    return await client.del(key);
  } catch (error) {
    console.error(`Redis DEL error for ${key}:`, error);
    throw error;
  }
}

// Add values to a set in Redis
export async function sadd(key: string, ...members: string[]): Promise<number> {
  try {
    if (isBrowser) {
      return mockRedisClient.sadd(key, ...members);
    }
    
    // Use type casting and method checking for Redis client methods
    const redisClient = client as any;
    if (typeof redisClient.sAdd === 'function') {
      return await redisClient.sAdd(key, members);
    } else if (typeof redisClient.SADD === 'function') {
      return await redisClient.SADD(key, members);
    } else if (typeof redisClient.sadd === 'function') {
      return await redisClient.sadd(key, members);
    } else {
      console.warn('Redis SADD method not found, using mock implementation');
      return mockRedisClient.sadd(key, ...members);
    }
  } catch (error) {
    console.error(`Redis SADD error for ${key}:`, error);
    throw error;
  }
}

// Remove values from a set in Redis
export async function srem(key: string, ...members: string[]): Promise<number> {
  try {
    if (isBrowser) {
      return mockRedisClient.srem(key, ...members);
    }
    
    // Use type casting and method checking for Redis client methods
    const redisClient = client as any;
    if (typeof redisClient.sRem === 'function') {
      return await redisClient.sRem(key, members);
    } else if (typeof redisClient.SREM === 'function') {
      return await redisClient.SREM(key, members);
    } else if (typeof redisClient.srem === 'function') {
      return await redisClient.srem(key, members);
    } else {
      console.warn('Redis SREM method not found, using mock implementation');
      return mockRedisClient.srem(key, ...members);
    }
  } catch (error) {
    console.error(`Redis SREM error for ${key}:`, error);
    throw error;
  }
}

// Get all members of a set in Redis
export async function smembers(key: string): Promise<string[]> {
  try {
    if (isBrowser) {
      return mockRedisClient.smembers(key);
    }
    
    // Use type casting and method checking for Redis client methods
    const redisClient = client as any;
    if (typeof redisClient.sMembers === 'function') {
      return await redisClient.sMembers(key);
    } else if (typeof redisClient.SMEMBERS === 'function') {
      return await redisClient.SMEMBERS(key);
    } else if (typeof redisClient.smembers === 'function') {
      return await redisClient.smembers(key);
    } else {
      console.warn('Redis SMEMBERS method not found, using mock implementation');
      return mockRedisClient.smembers(key);
    }
  } catch (error) {
    console.error(`Redis SMEMBERS error for ${key}:`, error);
    throw error;
  }
}

// Get keys matching a pattern in Redis
export async function keys(pattern: string): Promise<string[]> {
  try {
    if (isBrowser) {
      return mockRedisClient.keys(pattern);
    }
    return await client.keys(pattern);
  } catch (error) {
    console.error(`Redis KEYS error for ${pattern}:`, error);
    throw error;
  }
}
