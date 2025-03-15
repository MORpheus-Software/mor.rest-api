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

// Helper function to create a Redis instance - keeping it simple for Upstash
const createRedisInstance = (url: string) => {
  // Mask credentials in log output
  const maskedUrl = url.replace(/\/\/(.+?)@/, '//[credentials-hidden]@');
  console.log(chalk.blue(`[REDIS] Creating Redis instance with URL: ${maskedUrl}`));
  
  try {
    // Simple direct connection - just like the working example
    const redis = new Redis(url);
    
    // Add event listeners for better debugging
    redis.on('connect', () => {
      console.log(chalk.green('[REDIS] Connected successfully'));
    });
    
    redis.on('error', (err: Error) => {
      console.error(chalk.red(`[REDIS] Connection error: ${err.message}`));
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
      
      // Create Redis client with simple approach (like the working example)
      const client = createRedisInstance(redisUrl);
      
      try {
        // Test connection by setting and getting a key
        console.log(chalk.blue('[REDIS] Testing connection...'));
        await client.set('test-connection', 'success');
        const value = await client.get('test-connection');
        
        // Verify connection worked
        if (value === 'success') {
          console.log(chalk.green('[REDIS] Successfully connected to Redis!'));
          await client.quit();
          return true;
        } else {
          console.error(chalk.red('[REDIS] Test key returned unexpected value'));
          await client.quit();
          return false;
        }
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
    }
  }
  
  // Try known working Upstash URL if no REDIS_URL is set
  try {
    // Using the exact format that works
    console.log(chalk.blue('[REDIS] Trying connection with known working format...'));
    const upstashUrl = process.env.UPSTASH_REDIS_URL || 'rediss://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379';
    
    // Create client with the simple working approach
    const client = createRedisInstance(upstashUrl);
    
    // Test connection
    await client.set('test-connection', 'success');
    const value = await client.get('test-connection');
    
    if (value === 'success') {
      console.log(chalk.green('[REDIS] Successfully connected to Upstash Redis!'));
      // Save the working URL for future use
      process.env.REDIS_URL = upstashUrl;
      await client.quit();
      return true;
    }
    
    await client.quit();
  } catch (error) {
    console.error(chalk.yellow('[REDIS] Failed to connect to Upstash Redis:'), error);
  }
  
  // Then try local Redis (for development)
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
