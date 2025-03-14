import Redis from 'ioredis';
import chalk from 'chalk';

// Redis connection options
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

// Function to create a Redis client
async function createRedisClient() {
  try {
    console.log(chalk.blue('[REDIS] Creating Redis client'));
    
    // Redis connection URL
    const redisUrl = process.env.REDIS_URL || `redis://${REDIS_HOST}:${REDIS_PORT}`;
    
    // Redis connection options
    const redisOptions: Redis.RedisOptions = {
      lazyConnect: true,
      reconnectOnError: (err) => {
        console.error(chalk.red('[REDIS] Reconnect error:', err));
        return 2; // Reconnect after 2 seconds
      },
      maxRetriesPerRequest: 3,
    };
    
    // Add password if available
    if (REDIS_PASSWORD) {
      redisOptions.password = REDIS_PASSWORD;
    }
    
    // Create Redis client using IoRedis
    const client = new Redis(redisUrl, redisOptions);
    
    // Handle errors without crashing
    client.on('error', (err: Error) => {
      console.error(chalk.red(`[REDIS] Redis error: ${err.message}`));
    });
    
    // Test the connection
    await client.ping();
    console.log(chalk.green('[REDIS] Connected to Redis'));
    
    return client;
  } catch (error) {
    console.error(chalk.red('[REDIS] Failed to connect to Redis:'), error);
    throw error;
  }
}

// Upstash Redis client creation
async function createUpstashRedisClient() {
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
    // Create IoRedis client correctly (need to properly import Redis)
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

export {
    createRedisClient,
    createUpstashRedisClient,
    setex,
    get,
    del,
    exists,
    sadd,
    smembers,
    srem,
    incr,
    decr,
};
