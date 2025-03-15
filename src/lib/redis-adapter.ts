import { Redis } from 'ioredis';
import chalk from 'chalk';
import { getRedisClient } from '../server/setupRedis.js';

// Redis connection options
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

// Function to create a Redis client
async function createRedisClient(): Promise<Redis> {
  try {
    console.log(chalk.blue('[REDIS] Creating Redis client from adapter'));
    // Use the persistent client from setupRedis
    return getRedisClient();
  } catch (error) {
    console.error(chalk.red('[REDIS] Failed to connect to Redis:'), error);
    
    // Implement retry logic for development environment
    if (process.env.NODE_ENV === 'development') {
      console.log(chalk.yellow('[REDIS] Development environment detected, attempting recovery...'));
      
      try {
        // Wait a short time and try again
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(chalk.yellow('[REDIS] Retrying Redis connection...'));
        return getRedisClient();
      } catch (retryError) {
        console.error(chalk.red('[REDIS] Retry failed:'), retryError);
      }
    }
    
    throw error;
  }
}

// Upstash Redis client creation
async function createUpstashRedisClient(): Promise<Redis> {
  try {
    console.log(chalk.blue('[REDIS] Creating Upstash Redis client'));
    
    // Get Upstash credentials from environment variables
    const UPSTASH_REST_API_TOKEN = process.env.UPSTASH_REST_API_TOKEN;
    const UPSTASH_REST_API_DOMAIN = process.env.UPSTASH_REST_API_DOMAIN;
    
    if (!UPSTASH_REST_API_TOKEN || !UPSTASH_REST_API_DOMAIN) {
      console.error(chalk.red('[REDIS] Missing Upstash credentials in environment variables'));
      throw new Error('Missing Upstash credentials');
    }
    
    // Create Upstash Redis client using IoRedis
    const upstashUrl = `rediss://default:${UPSTASH_REST_API_TOKEN}@${UPSTASH_REST_API_DOMAIN}:6379`;
    const client = new Redis(upstashUrl);
    
    // Handle errors without crashing
    client.on('error', (err: Error) => {
      console.error(chalk.red(`[REDIS] Upstash Redis error: ${err.message}`));
    });
    
    // Test the connection
    await client.ping();
    console.log(chalk.green('[REDIS] Connected to Upstash Redis'));
    
    return client;
  } catch (error) {
    console.error(chalk.red('[REDIS] Failed to connect to Upstash Redis:'), error);
    throw error;
  }
}

// Method to set a key-value pair with expiration
async function setex(client: Redis, key: string, seconds: number, value: string): Promise<void> {
  try {
    await client.setex(key, seconds, value);
    console.log(chalk.green(`[REDIS] Set key ${key} with expiration ${seconds}s`));
  } catch (error) {
    console.error(chalk.red(`[REDIS] Failed to set key ${key}:`), error);
    throw error;
  }
}

// Method to set a key-value pair
async function set(client: Redis, key: string, value: string): Promise<void> {
  try {
    await client.set(key, value);
    console.log(chalk.green(`[REDIS] Set key ${key}`));
  } catch (error) {
    console.error(chalk.red(`[REDIS] Failed to set key ${key}:`), error);
    throw error;
  }
}

// Method to get the value of a key
async function get(client: Redis, key: string): Promise<string | null> {
  try {
    const value = await client.get(key);
    if (value) {
      console.log(chalk.green(`[REDIS] Get key ${key}: ${value.substring(0, 20)}...`));
    } else {
      console.log(chalk.yellow(`[REDIS] Key ${key} not found`));
    }
    return value;
  } catch (error) {
    console.error(chalk.red(`[REDIS] Failed to get key ${key}:`), error);
    throw error;
  }
}

// Method to delete a key
async function del(client: Redis, key: string): Promise<void> {
  try {
    await client.del(key);
    console.log(chalk.green(`[REDIS] Deleted key ${key}`));
  } catch (error) {
    console.error(chalk.red(`[REDIS] Failed to delete key ${key}:`), error);
    throw error;
  }
}

// Method to check if a key exists
async function exists(client: Redis, key: string): Promise<boolean> {
  try {
    const result = await client.exists(key);
    const exists = result === 1;
    if (exists) {
      console.log(chalk.green(`[REDIS] Key ${key} exists`));
    } else {
      console.log(chalk.yellow(`[REDIS] Key ${key} does not exist`));
    }
    return exists;
  } catch (error) {
    console.error(chalk.red(`[REDIS] Failed to check if key ${key} exists:`), error);
    throw error;
  }
}

// Method to add a value to a set
async function sadd(client: Redis, key: string, value: string): Promise<void> {
  try {
    await client.sadd(key, value);
    console.log(chalk.green(`[REDIS] Added value ${value} to set ${key}`));
  } catch (error) {
    console.error(chalk.red(`[REDIS] Failed to add value ${value} to set ${key}:`), error);
    throw error;
  }
}

// Method to get all values from a set
async function smembers(client: Redis, key: string): Promise<string[]> {
  try {
    const members = await client.smembers(key);
    console.log(chalk.green(`[REDIS] Retrieved members from set ${key}`));
    return members;
  } catch (error) {
    console.error(chalk.red(`[REDIS] Failed to retrieve members from set ${key}:`), error);
    throw error;
  }
}

// Method to remove a value from a set
async function srem(client: Redis, key: string, value: string): Promise<void> {
  try {
    await client.srem(key, value);
    console.log(chalk.green(`[REDIS] Removed value ${value} from set ${key}`));
  } catch (error) {
    console.error(chalk.red(`[REDIS] Failed to remove value ${value} from set ${key}:`), error);
    throw error;
  }
}

// Method to get keys matching a pattern
async function keys(client: Redis, pattern: string): Promise<string[]> {
  try {
    const keys = await client.keys(pattern);
    console.log(chalk.green(`[REDIS] Found ${keys.length} keys matching pattern ${pattern}`));
    return keys;
  } catch (error) {
    console.error(chalk.red(`[REDIS] Failed to get keys matching pattern ${pattern}:`), error);
    throw error;
  }
}

// Method to increment a value
async function incr(client: Redis, key: string): Promise<number> {
    try {
        const result = await client.incr(key);
        console.log(chalk.green(`[REDIS] Incremented key ${key} to ${result}`));
        return result;
    } catch (error) {
        console.error(chalk.red(`[REDIS] Failed to increment key ${key}:`), error);
        throw error;
    }
}

// Method to decrement a value
async function decr(client: Redis, key: string): Promise<number> {
    try {
        const result = await client.decr(key);
        console.log(chalk.green(`[REDIS] Decremented key ${key} to ${result}`));
        return result;
    } catch (error) {
        console.error(chalk.red(`[REDIS] Failed to decrement key ${key}:`), error);
        throw error;
    }
}

// Verify Redis connection is working
async function verifyRedisConnection(): Promise<boolean> {
  try {
    const client = await createRedisClient();
    await client.ping();
    await client.quit();
    return true;
  } catch (error) {
    console.error(chalk.red('[REDIS] Connection verification failed:'), error);
    return false;
  }
}

export {
    createRedisClient,
    createUpstashRedisClient,
    verifyRedisConnection,
    setex,
    set,
    get,
    del,
    exists,
    sadd,
    smembers,
    srem,
    keys,
    incr,
    decr,
};
