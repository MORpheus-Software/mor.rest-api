
import { createClient } from 'redis';
import Redis from 'ioredis';
import chalk from 'chalk';

// Helper function to create a Redis instance
const createRedisInstance = (url: string) => {
  const redis = new Redis(url);
  return redis;
};

export async function checkRedisConnection(): Promise<boolean> {
  console.log(chalk.blue('[REDIS] Checking Redis connection...'));
  
  // First try Upstash Redis (for production)
  const upstashToken = process.env.UPSTASH_REST_API_TOKEN;
  const upstashDomain = process.env.UPSTASH_REST_API_DOMAIN;
  
  if (upstashToken && upstashDomain) {
    console.log(chalk.blue('[REDIS] Checking Upstash Redis connection...'));
    
    try {
      // Connect to Upstash Redis
      const upstashUrl = `rediss://default:${upstashToken}@${upstashDomain}:6379`;
      // Create Redis client properly
      const client = createRedisInstance(upstashUrl);
      
      // Test connection by setting and getting a key
      await client.set('test-connection', 'success');
      const value = await client.get('test-connection');
      
      // Verify connection worked
      if (value === 'success') {
        console.log(chalk.green('[REDIS] Successfully connected to Upstash Redis!'));
        await client.quit();
        return true;
      }
      
      await client.quit();
    } catch (error) {
      console.error(chalk.yellow('[REDIS] Failed to connect to Upstash Redis:'), error);
      console.log(chalk.blue('[REDIS] Falling back to local Redis...'));
    }
  } else {
    console.log(chalk.yellow('[REDIS] Upstash Redis credentials not found in env.'));
    console.log(chalk.blue('[REDIS] Falling back to local Redis...'));
  }
  
  // Then try local Redis (for development)
  try {
    console.log(chalk.blue('[REDIS] Checking local Redis connection...'));
    
    // Connect to local Redis
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    // Create Redis client properly
    const client = createRedisInstance(redisUrl);
    
    // Add error handler
    client.on('error', (err: Error) => {
      console.error(chalk.red(`[REDIS] Connection error: ${err.message}`));
    });
    
    // Test connection by setting and getting a key
    await client.set('test-connection', 'success');
    const value = await client.get('test-connection');
    
    // Verify connection worked
    if (value === 'success') {
      console.log(chalk.green('[REDIS] Successfully connected to local Redis!'));
      await client.quit();
      return true;
    }
    
    await client.quit();
    return false;
  } catch (error) {
    console.error(chalk.red('[REDIS] Failed to connect to Redis:'), error);
    return false;
  }
}
