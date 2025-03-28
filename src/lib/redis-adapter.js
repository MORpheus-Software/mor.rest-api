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
      connectTimeout: 30000, // Increase timeout for slower connections
      maxRetriesPerRequest: 5, // Increase retries
      enableOfflineQueue: true,
      retryStrategy(times) {
        const delay = Math.min(times * 1000, 10000); // More gradual backoff
        console.log(chalk.yellow(`[REDIS] Connection attempt ${times}, retrying in ${delay}ms`));
        return delay;
      },
      // TLS options for secure connections (required for Upstash)
      tls: isSecure || isUpstash ? {
        rejectUnauthorized: false // Helps with self-signed certificates
      } : undefined,
      // Keep connection alive
      keepAlive: 10000,
    };

    // Add special handling for Upstash
    if (isUpstash) {
      console.log(chalk.blue('[REDIS] Upstash Redis detected, applying special configuration'));
      // Upstash requires TLS
      options.tls = { rejectUnauthorized: false };
      
      // Ensure we're using rediss:// for Upstash connections
      if (!isSecure) {
        const secureUrl = redisUrl.replace('redis://', 'rediss://');
        console.log(chalk.yellow(`[REDIS] Upgrading Upstash connection to secure URL: ${secureUrl.replace(/\/\/(.+?)@/, '//[credentials-hidden]@')}`));
        
        // Create Redis client with secure URL
        const redis = new Redis(secureUrl, options);
        setupEventListeners(redis);
        
        // Store the client globally
        redisClient = redis;
        
        // Verify connection with ping
        await verifyConnection(redis);
        return redis;
      }
    }
    
    // Create and test the Redis client
    const redis = new Redis(redisUrl, options);
    setupEventListeners(redis);
    
    // Store the client globally
    redisClient = redis;
    
    // Verify connection with ping
    await verifyConnection(redis);
    return redis;
  } catch (error) {
    console.error(chalk.red('[REDIS] Failed to create Redis client:'), error);
    console.error(chalk.red('[REDIS] Connection details:'), {
      url: redisUrl.replace(/\/\/(.+?)@/, '//[credentials-hidden]@'),
      isSecure: redisUrl.startsWith('rediss://'),
      isUpstash: redisUrl.includes('upstash.io')
    });
    
    // If this is Upstash and URL doesn't start with rediss://, try again with rediss://
    if (redisUrl.includes('upstash.io') && !redisUrl.startsWith('rediss://')) {
      console.log(chalk.yellow('[REDIS] Attempting to reconnect with secure URL (rediss://)'));
      
      try {
        const secureUrl = redisUrl.replace('redis://', 'rediss://');
        process.env.REDIS_URL = secureUrl; // Update env var for future connections
        
        // Create Redis client with secure URL and adjusted options
        const options = {
          connectTimeout: 30000,
          maxRetriesPerRequest: 3,
          enableOfflineQueue: true,
          tls: { rejectUnauthorized: false },
          retryStrategy(times) {
            return Math.min(times * 1000, 10000);
          }
        };
        
        const redis = new Redis(secureUrl, options);
        setupEventListeners(redis);
        
        // Store the client globally
        redisClient = redis;
        
        // Verify connection with ping
        await verifyConnection(redis);
        return redis;
      } catch (retryError) {
        console.error(chalk.red('[REDIS] Retry with secure URL failed:'), retryError);
        throw retryError;
      }
    }
    
    throw error;
  }
}

/**
 * Set up event listeners for Redis client
 */
function setupEventListeners(redis) {
  redis.on('connect', () => {
    console.log(chalk.green('[REDIS] Connected successfully'));
  });
  
  redis.on('error', (err) => {
    console.error(chalk.red(`[REDIS] Connection error: ${err.message}`));
  });
  
  redis.on('reconnecting', () => {
    console.log(chalk.yellow('[REDIS] Reconnecting...'));
  });
  
  redis.on('end', () => {
    console.log(chalk.yellow('[REDIS] Connection closed'));
    // Clear the client reference if the connection ends
    if (redisClient) {
      redisClient = null;
    }
  });
}

/**
 * Verify Redis connection with ping
 */
async function verifyConnection(redis) {
  try {
    await redis.ping();
    console.log(chalk.green('[REDIS] Connection test successful (PING)'));
    return true;
  } catch (error) {
    console.error(chalk.red('[REDIS] Connection test failed:'), error);
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

/**
 * Get Redis client with auto-creation if needed
 */
export async function getRedisClient() {
  if (!redisClient) {
    return createRedisClient();
  }
  return redisClient;
}
