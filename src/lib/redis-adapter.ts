
import { Redis } from 'ioredis';
import chalk from 'chalk';

// Redis connection options
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

// Global Redis client instance
let globalRedisClient: Redis | null = null;

// Function to create a Redis client
async function createRedisClient(): Promise<Redis> {
  try {
    if (globalRedisClient) {
      console.log(chalk.blue('[REDIS_ADAPTER] Returning existing Redis client'));
      return globalRedisClient;
    }

    console.log(chalk.blue('[REDIS_ADAPTER] Creating new Redis client'));
    
    // First try to use REDIS_URL if available
    if (process.env.REDIS_URL) {
      console.log(chalk.blue(`[REDIS_ADAPTER] Using REDIS_URL: ${process.env.REDIS_URL.replace(/\/\/(.+?)@/, '//[credentials-hidden]@')}`));
      
      // Ensure we're using rediss:// for Upstash connections
      let redisUrl = process.env.REDIS_URL;
      if (redisUrl.includes('upstash.io') && !redisUrl.startsWith('rediss://')) {
        redisUrl = redisUrl.replace('redis://', 'rediss://');
        console.log(chalk.yellow('[REDIS_ADAPTER] Upgraded connection to use SSL (rediss://)'));
      }
      
      // Add detailed logging before creating the client
      console.log(chalk.blue(`[REDIS_ADAPTER] Creating Redis client with URL: ${redisUrl.replace(/\/\/(.+?)@/, '//[credentials-hidden]@')}`));
      
      // Configure Redis client options
      const options: any = {
        connectTimeout: 20000,
        enableOfflineQueue: true,
        maxRetriesPerRequest: 3,
        retryStrategy(times: number) {
          const delay = Math.min(times * 500, 5000);
          console.log(chalk.yellow(`[REDIS_ADAPTER] Connection attempt ${times}, retrying in ${delay}ms`));
          return delay;
        }
      };
      
      // Create Redis client with URL
      const client = new Redis(redisUrl, options);
      
      // Add event listeners
      client.on('connect', () => {
        console.log(chalk.green('[REDIS_ADAPTER] Connected successfully'));
      });
      
      client.on('error', (err: Error) => {
        console.error(chalk.red(`[REDIS_ADAPTER] Connection error: ${err.message}`));
      });
      
      // Store the client globally
      globalRedisClient = client;
      
      try {
        // Verify connection
        console.log(chalk.blue('[REDIS_ADAPTER] Verifying connection with PING'));
        await client.ping();
        console.log(chalk.green('[REDIS_ADAPTER] Connection verified with PING'));
      } catch (pingError) {
        console.error(chalk.red('[REDIS_ADAPTER] PING verification failed:'), pingError);
        throw pingError;
      }
      
      return client;
    } else {
      // Fall back to host/port configuration
      console.log(chalk.blue(`[REDIS_ADAPTER] Using configuration - Host: ${REDIS_HOST}, Port: ${REDIS_PORT}`));
      
      const client = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        connectTimeout: 20000,
        maxRetriesPerRequest: 3,
        enableOfflineQueue: true
      });
      
      // Add event listeners
      client.on('connect', () => {
        console.log(chalk.green('[REDIS_ADAPTER] Connected successfully'));
      });
      
      client.on('error', (err: Error) => {
        console.error(chalk.red(`[REDIS_ADAPTER] Connection error: ${err.message}`));
      });
      
      // Store the client globally
      globalRedisClient = client;
      
      // Verify connection
      await client.ping();
      console.log(chalk.green('[REDIS_ADAPTER] Connection verified with PING'));
      
      return client;
    }
  } catch (error) {
    console.error(chalk.red('[REDIS_ADAPTER] Failed to connect to Redis:'), error);
    
    // Implement retry logic for development environment
    if (process.env.NODE_ENV === 'development' || process.env.USE_LOCAL_REDIS === 'true') {
      console.log(chalk.yellow('[REDIS_ADAPTER] Development environment detected, attempting recovery...'));
      
      try {
        // Wait a short time and try again with a direct localhost connection
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(chalk.yellow('[REDIS_ADAPTER] Retrying Redis connection with localhost...'));
        
        const client = new Redis('redis://localhost:6379');
        globalRedisClient = client;
        
        await client.ping();
        console.log(chalk.green('[REDIS_ADAPTER] Recovery connection successful'));
        
        return client;
      } catch (retryError) {
        console.error(chalk.red('[REDIS_ADAPTER] Retry failed:'), retryError);
      }
    }
    
    throw error;
  }
}

// Method to set a key-value pair with expiration
async function setex(client: Redis, key: string, seconds: number, value: string): Promise<void> {
  try {
    await client.setex(key, seconds, value);
    console.log(chalk.green(`[REDIS_ADAPTER] Set key ${key} with expiration ${seconds}s`));
  } catch (error) {
    console.error(chalk.red(`[REDIS_ADAPTER] Failed to set key ${key}:`), error);
    throw error;
  }
}

// Method to set a key-value pair
async function set(client: Redis, key: string, value: string): Promise<void> {
  try {
    await client.set(key, value);
    console.log(chalk.green(`[REDIS_ADAPTER] Set key ${key}`));
  } catch (error) {
    console.error(chalk.red(`[REDIS_ADAPTER] Failed to set key ${key}:`), error);
    throw error;
  }
}

// Method to get the value of a key
async function get(client: Redis, key: string): Promise<string | null> {
  try {
    const value = await client.get(key);
    if (value) {
      console.log(chalk.green(`[REDIS_ADAPTER] Get key ${key}: ${value.substring(0, 20)}...`));
    } else {
      console.log(chalk.yellow(`[REDIS_ADAPTER] Key ${key} not found`));
    }
    return value;
  } catch (error) {
    console.error(chalk.red(`[REDIS_ADAPTER] Failed to get key ${key}:`), error);
    throw error;
  }
}

// Method to delete a key
async function del(client: Redis, key: string): Promise<void> {
  try {
    await client.del(key);
    console.log(chalk.green(`[REDIS_ADAPTER] Deleted key ${key}`));
  } catch (error) {
    console.error(chalk.red(`[REDIS_ADAPTER] Failed to delete key ${key}:`), error);
    throw error;
  }
}

// Method to check if a key exists
async function exists(client: Redis, key: string): Promise<boolean> {
  try {
    const result = await client.exists(key);
    const exists = result === 1;
    console.log(chalk.green(`[REDIS_ADAPTER] Key ${key} exists: ${exists}`));
    return exists;
  } catch (error) {
    console.error(chalk.red(`[REDIS_ADAPTER] Failed to check if key ${key} exists:`), error);
    throw error;
  }
}

// Method to add a value to a set
async function sadd(client: Redis, key: string, value: string): Promise<void> {
  try {
    await client.sadd(key, value);
    console.log(chalk.green(`[REDIS_ADAPTER] Added value ${value} to set ${key}`));
  } catch (error) {
    console.error(chalk.red(`[REDIS_ADAPTER] Failed to add value ${value} to set ${key}:`), error);
    throw error;
  }
}

// Method to get all values from a set
async function smembers(client: Redis, key: string): Promise<string[]> {
  try {
    const members = await client.smembers(key);
    console.log(chalk.green(`[REDIS_ADAPTER] Retrieved ${members.length} members from set ${key}`));
    return members;
  } catch (error) {
    console.error(chalk.red(`[REDIS_ADAPTER] Failed to retrieve members from set ${key}:`), error);
    throw error;
  }
}

// Method to remove a value from a set
async function srem(client: Redis, key: string, value: string): Promise<void> {
  try {
    await client.srem(key, value);
    console.log(chalk.green(`[REDIS_ADAPTER] Removed value ${value} from set ${key}`));
  } catch (error) {
    console.error(chalk.red(`[REDIS_ADAPTER] Failed to remove value ${value} from set ${key}:`), error);
    throw error;
  }
}

// Method to get keys matching a pattern
async function keys(client: Redis, pattern: string): Promise<string[]> {
  try {
    const keys = await client.keys(pattern);
    console.log(chalk.green(`[REDIS_ADAPTER] Found ${keys.length} keys matching pattern ${pattern}`));
    return keys;
  } catch (error) {
    console.error(chalk.red(`[REDIS_ADAPTER] Failed to get keys matching pattern ${pattern}:`), error);
    throw error;
  }
}

// Verify Redis connection is working
async function verifyRedisConnection(): Promise<boolean> {
  try {
    const client = await createRedisClient();
    await client.ping();
    console.log(chalk.green('[REDIS_ADAPTER] Connection verification successful'));
    return true;
  } catch (error) {
    console.error(chalk.red('[REDIS_ADAPTER] Connection verification failed:'), error);
    return false;
  }
}

export {
    createRedisClient,
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
};
