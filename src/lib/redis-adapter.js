
import { Redis } from 'ioredis';
import chalk from 'chalk';

let redisClient = null;

/**
 * Create a Redis client with improved resilience and logging
 */
export async function createRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log(chalk.blue(`[REDIS] Creating client with URL: ${redisUrl.replace(/\/\/(.+?)@/, '//[credentials-hidden]@')}`));

  try {
    // Determine if we're using a secure connection
    const isSecure = redisUrl.startsWith('rediss://');
    const isUpstash = redisUrl.includes('upstash.io');
    
    // Configure Redis with more resilient options
    const options = {
      connectTimeout: 20000,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      retryStrategy(times) {
        const delay = Math.min(times * 500, 5000);
        console.log(chalk.yellow(`[REDIS] Connection attempt ${times}, retrying in ${delay}ms`));
        return delay;
      },
      // TLS options for secure connections
      tls: isSecure ? {
        rejectUnauthorized: false // Helps with self-signed certificates
      } : undefined,
    };

    // Create and test the Redis client
    const redis = new Redis(redisUrl, options);
    
    redis.on('connect', () => {
      console.log(chalk.green('[REDIS] Connected successfully'));
    });
    
    redis.on('error', (err) => {
      console.error(chalk.red(`[REDIS] Connection error: ${err.message}`));
    });
    
    redis.on('reconnecting', () => {
      console.log(chalk.yellow('[REDIS] Reconnecting...'));
    });
    
    // Test the connection with a ping
    await redis.ping();
    console.log(chalk.green('[REDIS] Connection test successful (PING)'));
    
    // Store the client globally
    redisClient = redis;
    return redis;
  } catch (error) {
    console.error(chalk.red('[REDIS] Failed to create Redis client:'), error);
    throw error;
  }
}

/**
 * Clean up Redis connections
 */
export async function closeRedisConnection() {
  if (redisClient) {
    console.log(chalk.blue('[REDIS] Closing connection'));
    await redisClient.quit();
    redisClient = null;
  }
}
