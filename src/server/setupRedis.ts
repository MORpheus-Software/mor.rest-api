import { createClient } from 'redis';
import { Redis } from 'ioredis';
import chalk from 'chalk';
import dns from 'dns';
import { promisify } from 'util';

// Promisify DNS lookup for hostname validation
const dnsLookup = promisify(dns.lookup);

// Development environment detection
const isDevelopment = process.env.NODE_ENV === 'development';

// Global Redis client that will be reused throughout the application
let globalRedisClient: Redis | null = null;

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
export const createRedisInstance = (url: string): Redis => {
  if (globalRedisClient) {
    console.log(chalk.blue('[REDIS] Returning existing Redis client'));
    return globalRedisClient;
  }

  // Ensure we're using rediss:// for Upstash connections
  let redisUrl = url;
  if (url.includes('upstash.io') && !url.startsWith('rediss://')) {
    redisUrl = url.replace('redis://', 'rediss://');
    console.log(chalk.yellow('[REDIS] Upgraded connection to use SSL (rediss://)'));
  }
  
  // Mask credentials in log output
  const maskedUrl = redisUrl.replace(/\/\/(.+?)@/, '//[credentials-hidden]@');
  console.log(chalk.blue(`[REDIS] Creating Redis instance with URL: ${maskedUrl}`));
  
  // Special handling for local development
  const isLocalhost = redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1');
  
  // Configure Redis with more resilient options
  const options: any = {
    connectTimeout: 20000,
    // Enable offline queue by default (allow commands to be queued until connection is established)
    enableOfflineQueue: true,
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
  };
  
  // Development-specific configuration for local Redis
  if (isDevelopment && isLocalhost) {
    console.log(chalk.green('[REDIS] Using development-specific Redis configuration'));
    options.autoResubscribe = true;    // Auto resubscribe for local development
    options.autoResendUnfulfilledCommands = true;
    options.maxRetriesPerRequest = 5;  // More retries for local development
    options.retryStrategy = function(times: number) {
      return Math.min(times * 200, 2000); // Faster retries for local
    };
  } else {
    // Production settings
    console.log(chalk.blue('[REDIS] Using production Redis configuration'));
    options.autoResubscribe = false;
    
    // Special handling for Docker environments
    if (redisUrl.includes('host.docker.internal')) {
      console.log(chalk.blue('[REDIS] Docker host detected in Redis URL, applying special handling...'));
      options.retryStrategy = function(times: number) {
        const delay = Math.min(times * 1000, 10000); // Slower retries for Docker
        console.log(chalk.yellow(`[REDIS] Connection attempt ${times}, retrying in ${delay}ms`));
        return delay;
      };
      options.maxRetriesPerRequest = 10; // More retries for Docker
    }
  }
  
  try {
    // Create Redis client with improved options
    const redis = new Redis(redisUrl, options);
    
    // Store the client globally for reuse
    globalRedisClient = redis;
    
    // Add event listeners for better debugging
    redis.on('connect', () => {
      console.log(chalk.green('[REDIS] Connected successfully'));
    });
    
    redis.on('error', (err: Error) => {
      console.error(chalk.red(`[REDIS] Connection error: ${err.message}`));
    });
    
    redis.on('end', () => {
      console.log(chalk.yellow('[REDIS] Connection closed'));
      // Clear the global reference when connection ends
      globalRedisClient = null;
    });
    
    return redis;
  } catch (error) {
    console.error(chalk.red('[REDIS] Error creating Redis instance:'), error);
    throw error;
  }
};

// Get the currently initialized Redis client or create a new one
export function getRedisClient(): Redis {
  if (!globalRedisClient) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is required');
    }
    
    console.log(chalk.blue('[REDIS] Creating new Redis client'));
    return createRedisInstance(process.env.REDIS_URL);
  }
  
  return globalRedisClient;
}

export async function checkRedisConnection(): Promise<boolean> {
  console.log(chalk.blue('[REDIS] Checking Redis connection...'));
  
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL environment variable is required');
  }
  
  console.log(chalk.blue('[REDIS] Using REDIS_URL environment variable...'));
  
  try {
    // Some debug info to help with troubleshooting
    const redisUrl = process.env.REDIS_URL;
    console.log(chalk.blue(`[REDIS] URL format: ${redisUrl.startsWith('redis://') ? 'Standard Redis' : redisUrl.startsWith('rediss://') ? 'Secure Redis' : 'Unknown format'}`));
    
    // For local development, special handling for localhost
    if (isDevelopment && (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1'))) {
      console.log(chalk.blue('[REDIS] Detected localhost connection in development environment, applying special handling...'));
      
      // Validate hostname first to avoid long timeouts
      const hostname = new URL(redisUrl).hostname;
      const isValid = await validateHostname(hostname);
      console.log(chalk.blue(`[REDIS] Hostname verification ${isValid ? 'passed' : 'failed'}, proceeding with connection...`));
    }
    
    // Get or create a Redis client
    const client = getRedisClient();
    
    // Test connection by setting and getting a key with timeout
    console.log(chalk.blue('[REDIS] Testing connection...'));
    
    // Increase timeout for local Redis to ensure it has time to connect
    const timeoutSeconds = isDevelopment ? 30 : 15;
    
    const testPromise = new Promise<boolean>(async (resolve, reject) => {
      try {
        await client.set('test-connection', 'success');
        const value = await client.get('test-connection');
        
        // Verify connection worked
        if (value === 'success') {
          console.log(chalk.green('[REDIS] Successfully connected to Redis!'));
          resolve(true);
        } else {
          console.error(chalk.red('[REDIS] Test key returned unexpected value'));
          reject(new Error('Redis test connection failed'));
        }
      } catch (error) {
        console.error(chalk.red('[REDIS] Operation error:'), error);
        reject(error);
      }
    });
    
    // Add timeout to avoid hanging if Redis is unresponsive
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => {
        console.error(chalk.red(`[REDIS] Connection test timed out after ${timeoutSeconds} seconds`));
        reject(new Error(`Redis connection timeout after ${timeoutSeconds} seconds`));
      }, timeoutSeconds * 1000);
    });
    
    const result = await Promise.race([testPromise, timeoutPromise]);
    return result;
  } catch (error) {
    console.error(chalk.red('[REDIS] Failed to connect to Redis:'), error);
    // Don't continue without Redis
    throw new Error('Redis connection required for operation: ' + error.message);
  }
}
