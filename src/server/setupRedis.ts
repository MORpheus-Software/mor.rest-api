import { createClient } from 'redis';
import Redis from 'ioredis';
import chalk from 'chalk';

// Helper function to create a Redis instance with timeout and retry
const createRedisInstance = (url: string) => {
  // Mask credentials in log output
  const maskedUrl = url.replace(/\/\/(.+?)@/, '//[credentials-hidden]@');
  console.log(chalk.blue(`[REDIS] Creating Redis instance with URL: ${maskedUrl}`));
  
  const options = {
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 3000);
      console.log(chalk.yellow(`[REDIS] Connection attempt ${times}, retrying in ${delay}ms`));
      return delay;
    },
    // Fix for TLS issues
    tls: url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
  };
  
  try {
    const redis = new Redis(url, options);
    
    // Add event listeners for better debugging
    redis.on('connect', () => {
      console.log(chalk.green('[REDIS] Connected successfully'));
    });
    
    redis.on('error', (err: Error) => {
      console.error(chalk.red(`[REDIS] Connection error: ${err.message}`));
    });
    
    redis.on('reconnecting', () => {
      console.log(chalk.yellow('[REDIS] Reconnecting...'));
    });
    
    return redis;
  } catch (error) {
    console.error(chalk.red('[REDIS] Error creating Redis instance:'), error);
    throw error;
  }
};

export async function checkRedisConnection(): Promise<boolean> {
  console.log(chalk.blue('[REDIS] Checking Redis connection...'));
  
  // First check if we have a direct REDIS_URL environment variable
  if (process.env.REDIS_URL) {
    console.log(chalk.blue('[REDIS] Using REDIS_URL environment variable...'));
    try {
      // Some debug info to help with troubleshooting
      const redisUrl = process.env.REDIS_URL;
      console.log(chalk.blue(`[REDIS] URL format check: ${redisUrl.startsWith('redis://') ? 'Standard Redis' : redisUrl.startsWith('rediss://') ? 'Secure Redis' : 'Unknown format'}`));
      
      // Create Redis client
      const client = createRedisInstance(redisUrl);
      
      // Test connection by setting and getting a key with timeout
      const testPromise = new Promise<boolean>(async (resolve, reject) => {
        try {
          await client.set('test-connection', 'success');
          const value = await client.get('test-connection');
          
          // Verify connection worked
          if (value === 'success') {
            console.log(chalk.green('[REDIS] Successfully connected to Redis!'));
            await client.quit();
            resolve(true);
          } else {
            console.error(chalk.red('[REDIS] Test key returned unexpected value'));
            await client.quit();
            resolve(false);
          }
        } catch (error) {
          console.error(chalk.red('[REDIS] Error during connection test:'), error);
          try {
            await client.quit();
          } catch (e) {
            // Ignore errors during client quit
          }
          reject(error);
        }
      });
      
      // Add timeout to the test
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          console.error(chalk.red('[REDIS] Connection test timed out after 5 seconds'));
          resolve(false);
        }, 5000);
      });
      
      // Race the promises
      return Promise.race([testPromise, timeoutPromise]);
    } catch (error) {
      console.error(chalk.red('[REDIS] Failed to connect to Redis:'), error);
      return false;
    }
  }
  
  // Check for Upstash format directly (newer format)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log(chalk.blue('[REDIS] Using Upstash Redis REST client...'));
    // This is a placeholder for the REST API implementation
    // Upstash has a REST API that could be used as a fallback
    console.log(chalk.yellow('[REDIS] REST API implementation not available, trying standard connection...'));
  }
  
  // Fallback to Upstash Redis (for production) - standard Redis protocol
  const upstashRedisUrl = process.env.UPSTASH_REDIS_URL;
  
  if (upstashRedisUrl) {
    console.log(chalk.blue('[REDIS] Checking Upstash Redis connection using URL...'));
    
    try {
      // Create Redis client properly
      const client = createRedisInstance(upstashRedisUrl);
      
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
      console.log(chalk.blue('[REDIS] Trying alternative Upstash connection method...'));
    }
  }
  
  // Try classic Upstash connection format with token and domain
  const upstashToken = process.env.UPSTASH_REST_API_TOKEN;
  const upstashDomain = process.env.UPSTASH_REST_API_DOMAIN;
  
  if (upstashToken && upstashDomain) {
    console.log(chalk.blue('[REDIS] Checking Upstash Redis connection using token and domain...'));
    
    try {
      // Connect to Upstash Redis using the standard format
      // Note: Upstash format changed over time, trying multiple formats
      const upstashFormats = [
        `rediss://default:${upstashToken}@${upstashDomain}:6379`,
        `redis://default:${upstashToken}@${upstashDomain}:6379`,
        `rediss://:${upstashToken}@${upstashDomain}:6379`
      ];
      
      for (const upstashUrl of upstashFormats) {
        try {
          console.log(chalk.blue(`[REDIS] Trying Upstash format: ${upstashUrl.replace(/\/\/(.+?)@/, '//[credentials-hidden]@')}`));
          
          // Create Redis client properly
          const client = createRedisInstance(upstashUrl);
          
          // Test connection by setting and getting a key
          await client.set('test-connection', 'success');
          const value = await client.get('test-connection');
          
          // Verify connection worked
          if (value === 'success') {
            console.log(chalk.green('[REDIS] Successfully connected to Upstash Redis!'));
            // Store the successful URL in an environment variable for future use
            process.env.UPSTASH_REDIS_URL = upstashUrl;
            await client.quit();
            return true;
          }
          
          await client.quit();
        } catch (formatError) {
          console.error(chalk.yellow(`[REDIS] Failed with format ${upstashUrl.replace(/\/\/(.+?)@/, '//[credentials-hidden]@')}:`), formatError.message);
        }
      }
      
      console.error(chalk.red('[REDIS] All Upstash connection formats failed'));
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
    const redisUrl = 'redis://localhost:6379';
    // Create Redis client properly
    const client = createRedisInstance(redisUrl);
    
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
    console.log(chalk.yellow('[REDIS] Application will continue without Redis, using fallback storage.'));
    return false;
  }
}
