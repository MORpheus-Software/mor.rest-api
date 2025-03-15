import { createClient } from 'redis';
import Redis from 'ioredis';
import chalk from 'chalk';
import dns from 'dns';
import { promisify } from 'util';

// Promisify DNS lookup for hostname validation
const dnsLookup = promisify(dns.lookup);

// Helper function to validate hostname before connection attempt
async function validateHostname(hostname: string): Promise<boolean> {
  try {
    console.log(chalk.blue(`[REDIS] Validating hostname: ${hostname}`));
    await dnsLookup(hostname);
    console.log(chalk.green(`[REDIS] Hostname validation successful for: ${hostname}`));
    return true;
  } catch (error) {
    console.error(chalk.red(`[REDIS] Hostname validation failed for: ${hostname}`), error);
    return false;
  }
}

// Helper function to create a Redis instance with better stability
const createRedisInstance = (url: string) => {
  // Ensure we're using rediss:// for Upstash connections
  let redisUrl = url;
  if (url.includes('upstash.io') && !url.startsWith('rediss://')) {
    redisUrl = url.replace('redis://', 'rediss://');
    console.log(chalk.yellow('[REDIS] Upgraded connection to use SSL (rediss://)'));
  }
  
  // Mask credentials in log output
  const maskedUrl = redisUrl.replace(/\/\/(.+?)@/, '//[credentials-hidden]@');
  console.log(chalk.blue(`[REDIS] Creating Redis instance with URL: ${maskedUrl}`));
  
  // Configure Redis with more resilient options
  const options = {
    connectTimeout: 10000,
    // Lower the maxRetriesPerRequest to avoid excessive reconnections
    maxRetriesPerRequest: 3,
    // Avoid hammering the server with reconnection attempts
    retryStrategy(times: number) {
      const delay = Math.min(times * 500, 5000); // Increase delay between retries
      console.log(chalk.yellow(`[REDIS] Connection attempt ${times}, retrying in ${delay}ms`));
      return delay;
    },
    // Better handling of connection issues
    reconnectOnError(err: Error) {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        // Only reconnect on specific errors
        return true;
      }
      return false;
    },
    // Improve TLS for secure connections
    tls: redisUrl.startsWith('rediss://') ? { 
      rejectUnauthorized: false // Helps with self-signed certificates
    } : undefined,
    // Keep connections alive
    keepAlive: 10000,
    // Disable auto-reconnect in some error scenarios
    autoResubscribe: false,
    // Avoid queuing operations when disconnected
    enableOfflineQueue: false
  };
  
  try {
    // Create Redis client with improved options
    const redis = new Redis(redisUrl, options);
    
    // Add event listeners for better debugging
    redis.on('connect', () => {
      console.log(chalk.green('[REDIS] Connected successfully'));
    });
    
    redis.on('error', (err: Error) => {
      console.error(chalk.red(`[REDIS] Connection error: ${err.message}`));
    });
    
    redis.on('end', () => {
      console.log(chalk.yellow('[REDIS] Connection closed'));
    });
    
    return redis;
  } catch (error) {
    console.error(chalk.red('[REDIS] Error creating Redis instance:'), error);
    throw error;
  }
};

// Current Upstash URL patterns from their documentation
const UPSTASH_REGIONS = ['us1', 'us2', 'eu1', 'eu2', 'ap1'];

// Known Upstash domain patterns
const UPSTASH_DOMAIN_PATTERNS = [
  'upstash.io',
  'upstash-redis.io',
  'upstash.com'
];

// Helper function to check if a URL is likely an Upstash URL
function isUpstashUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check against known Upstash domain patterns
    return UPSTASH_DOMAIN_PATTERNS.some(pattern => hostname.includes(pattern));
  } catch (error) {
    return false;
  }
}

export async function checkRedisConnection(): Promise<boolean> {
  console.log(chalk.blue('[REDIS] Checking Redis connection...'));
  
  // First check if we have a direct REDIS_URL environment variable
  if (process.env.REDIS_URL) {
    console.log(chalk.blue('[REDIS] Using REDIS_URL environment variable...'));
    try {
      // Some debug info to help with troubleshooting
      const redisUrl = process.env.REDIS_URL;
      console.log(chalk.blue(`[REDIS] URL format: ${redisUrl.startsWith('redis://') ? 'Standard Redis' : redisUrl.startsWith('rediss://') ? 'Secure Redis' : 'Unknown format'}`));
      
      // Create Redis client
      const client = createRedisInstance(redisUrl);
      
      try {
        // Test connection by setting and getting a key with timeout
        console.log(chalk.blue('[REDIS] Testing connection...'));
        
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
            console.error(chalk.red('[REDIS] Operation error:'), error);
            try {
              await client.quit();
            } catch (e) {
              // Ignore errors during client quit
            }
            reject(error);
          }
        });
        
        // Add timeout to avoid hanging if Redis is unresponsive
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => {
            console.error(chalk.red('[REDIS] Connection test timed out after 5 seconds'));
            resolve(false);
          }, 5000);
        });
        
        return Promise.race([testPromise, timeoutPromise]);
      } catch (opError) {
        console.error(chalk.red('[REDIS] Operation error:'), opError);
        try {
          await client.quit();
        } catch (e) {
          // Ignore errors during client quit
        }
        return false;
      }
    } catch (error) {
      console.error(chalk.red('[REDIS] Failed to connect to Redis:'), error);
      console.log(chalk.yellow('[REDIS] Application will continue without Redis, using fallback storage.'));
      return false;
    }
  }
  
  // Fallback to local Redis (for development)
  try {
    console.log(chalk.blue('[REDIS] Checking local Redis connection...'));
    
    // Connect to local Redis
    const redisUrl = 'redis://localhost:6379';
    
    // Create Redis client
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
