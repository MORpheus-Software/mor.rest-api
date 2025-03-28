
// Import Redis from ioredis using proper ESM import
import { Redis } from 'ioredis';
import chalk from 'chalk';

// Global Redis client
let redisClient: Redis | null = null;

/**
 * Creates a Redis client
 */
export async function createRedisInstance() {
  try {
    if (redisClient) {
      console.log(chalk.blue('[REDIS] Using existing Redis client'));
      return redisClient;
    }
    
    console.log(chalk.blue('[REDIS] Creating new Redis client'));
    
    // Check for REDIS_URL environment variable
    if (process.env.REDIS_URL) {
      let redisUrl = process.env.REDIS_URL;
      console.log(chalk.blue(`[REDIS] Using REDIS_URL: ${redisUrl.replace(/\/\/(.+?)@/, '//[credentials-hidden]@')}`));
      
      // Ensure we're using SSL (rediss://) for Upstash connections
      if (redisUrl.includes('upstash.io') && !redisUrl.startsWith('rediss://')) {
        redisUrl = redisUrl.replace('redis://', 'rediss://');
        console.log(chalk.yellow('[REDIS] Upgraded to SSL connection (rediss://)'));
      }
      
      // Create the client with connection options
      redisClient = new Redis(redisUrl, {
        connectTimeout: 20000,
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 500, 5000);
          console.log(chalk.yellow(`[REDIS] Connection attempt ${times}, retrying in ${delay}ms`));
          return delay;
        }
      });
    } else {
      // Use default localhost connection
      console.log(chalk.blue('[REDIS] No REDIS_URL found, using localhost:6379'));
      redisClient = new Redis();
    }
    
    // Set up event listeners
    redisClient.on('connect', () => {
      console.log(chalk.green('[REDIS] Connected to Redis server'));
    });
    
    redisClient.on('error', (err) => {
      console.error(chalk.red('[REDIS] Redis connection error:'), err);
    });
    
    return redisClient;
  } catch (error) {
    console.error(chalk.red('[REDIS] Error creating Redis client:'), error);
    throw error;
  }
}

/**
 * Gets the Redis client, creating one if it doesn't exist
 */
export async function getRedisClient() {
  if (!redisClient) {
    return createRedisInstance();
  }
  return redisClient;
}

/**
 * Checks if Redis connection is working
 */
export async function checkRedisConnection() {
  try {
    console.log(chalk.blue('[REDIS] Checking Redis connection...'));
    const client = await getRedisClient();
    
    // Use PING to verify connection
    console.log(chalk.blue('[REDIS] Sending PING command...'));
    const result = await client.ping();
    
    if (result === 'PONG') {
      console.log(chalk.green('[REDIS] Redis connection successful ✓'));
      return true;
    } else {
      console.error(chalk.red('[REDIS] Redis PING returned unexpected result:'), result);
      return false;
    }
  } catch (error) {
    console.error(chalk.red('[REDIS] Redis connection check failed:'), error);
    return false;
  }
}

export default {
  createRedisInstance,
  getRedisClient,
  checkRedisConnection
};
