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
  
  // Base Redis options
  const options: any = {
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
  };
  
  // Production options
  if (process.env.NODE_ENV === 'production') {
    // Default production settings - more conservative
    options.retryStrategy = (times: number) => {
      return Math.min(times * 200, 2000); // Less aggressive retries in production
    };
  } 
  // Development options
  else if (process.env.NODE_ENV === 'development') {
    console.log(chalk.blue('[REDIS] Using development-specific Redis configuration'));
    // Development settings - more verbose and resilient
    options.retryStrategy = (times: number) => {
      const delay = Math.min(times * 500, 5000); // Increase delay between retries
      console.log(chalk.yellow(`[REDIS] Connection attempt ${times}, retrying in ${delay}ms`));
      return delay;
    };
    
    // CRITICAL: Enable offline queue to fix "Stream isn't writeable" errors in development
    options.enableOfflineQueue = true;
    
    // Auto-reconnect with a max retry time for development
    options.autoReconnect = true;
    options.maxReconnectTime = 5000;
  }
  
  // Common options for all environments
  options.reconnectOnError = (err: Error) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect on specific errors
      return true;
    }
    return false;
  };
  
  // Improve TLS for secure connections
  if (redisUrl.startsWith('rediss://')) {
    options.tls = { 
      rejectUnauthorized: false // Helps with self-signed certificates
    };
  }
  
  // Keep connections alive
  options.keepAlive = 10000;
  
  try {
    // Create Redis client with appropriate options
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
    
    // Add development-specific listeners
    if (process.env.NODE_ENV === 'development') {
      redis.on('reconnecting', () => {
        console.log(chalk.blue('[REDIS] Attempting to reconnect...'));
      });
    }
    
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
      
      // For Docker development with localhost, verify connectivity
      if (process.env.NODE_ENV === 'development' && (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1'))) {
        console.log(chalk.blue('[REDIS] Detected localhost connection in development environment, applying special handling...'));
        try {
          await validateHostname('localhost');
          console.log(chalk.blue('[REDIS] Hostname verification passed, proceeding with connection...'));
        } catch (error) {
          console.error(chalk.red('[REDIS] Hostname verification failed:'), error);
        }
      }
      
      // Create Redis client
      const client = createRedisInstance(redisUrl);
      
      try {
        // Test connection by setting and getting a key with timeout
        console.log(chalk.blue('[REDIS] Testing connection...'));
        
        const testPromise = new Promise<boolean>(async (resolve, reject) => {
          try {
            // Wait for connection to be ready - only needed in development
            if (process.env.NODE_ENV === 'development') {
              try {
                await client.connect();
                console.log(chalk.green('[REDIS] Client connected, testing operations...'));
              } catch (err) {
                // If connect fails, we still want to try the operations
                console.log(chalk.yellow('[REDIS] Client connect method failed, continuing with operations...'));
              }
            }
            
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
  
  // Fallback to local Redis (for development only)
  if (process.env.NODE_ENV === 'development') {
    try {
      console.log(chalk.blue('[REDIS] Development environment detected, trying local Redis fallback...'));
      
      // Connect to local Redis
      const redisUrl = 'redis://localhost:6379';
      
      // Create Redis client
      const client = createRedisInstance(redisUrl);
      
      // Test connection by setting and getting a key
      await client.set('test-connection', 'success');
      const value = await client.get('test-connection');
      
      // Verify connection worked
      if (value === 'success') {
        console.log(chalk.green('[REDIS] Successfully connected to local development Redis!'));
        await client.quit();
        return true;
      }
      
      await client.quit();
      return false;
    } catch (error) {
      console.error(chalk.red('[REDIS] Failed to connect to development Redis:'), error);
      console.log(chalk.yellow('[REDIS] Development will continue without Redis, using fallback storage.'));
      return false;
    }
  }
  
  console.log(chalk.yellow('[REDIS] No Redis configuration found and not in development mode.'));
  return false;
}
