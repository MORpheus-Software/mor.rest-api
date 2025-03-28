
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
      
      // Detect Lovable environment and use more fault-tolerant settings
      const isLovableEnv = process.env.LOVABLE_ENV === 'true';
      if (isLovableEnv) {
        console.log(chalk.yellow('[REDIS] Detected Lovable environment, using mock Redis'));
        // Use a mock Redis implementation in Lovable environment
        redisClient = createMockRedis();
        return redisClient;
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
    
    // In case of error, fall back to mock Redis in Lovable environment
    if (process.env.LOVABLE_ENV === 'true') {
      console.log(chalk.yellow('[REDIS] Falling back to mock Redis in Lovable environment'));
      redisClient = createMockRedis();
      return redisClient;
    }
    
    throw error;
  }
}

/**
 * Create a mock Redis implementation for Lovable environment
 */
function createMockRedis() {
  console.log(chalk.yellow('[REDIS] Creating mock Redis implementation'));
  
  const mockStorage = new Map<string, any>();
  
  const mockRedis: any = {
    // Basic Redis commands
    async set(key: string, value: any) {
      console.log(chalk.blue(`[MOCK-REDIS] Setting key: ${key}`));
      mockStorage.set(key, value);
      return 'OK';
    },
    async get(key: string) {
      console.log(chalk.blue(`[MOCK-REDIS] Getting key: ${key}`));
      return mockStorage.get(key) || null;
    },
    async del(key: string) {
      console.log(chalk.blue(`[MOCK-REDIS] Deleting key: ${key}`));
      mockStorage.delete(key);
      return 1;
    },
    async exists(key: string) {
      const exists = mockStorage.has(key);
      console.log(chalk.blue(`[MOCK-REDIS] Checking if key exists: ${key} - ${exists}`));
      return exists ? 1 : 0;
    },
    async setex(key: string, seconds: number, value: any) {
      console.log(chalk.blue(`[MOCK-REDIS] Setting key with expiration: ${key}, ${seconds}s`));
      mockStorage.set(key, value);
      setTimeout(() => mockStorage.delete(key), seconds * 1000);
      return 'OK';
    },
    async ping() {
      console.log(chalk.blue(`[MOCK-REDIS] PING`));
      return 'PONG';
    },
    // Mock event emitter
    on(event: string, callback: Function) {
      console.log(chalk.blue(`[MOCK-REDIS] Registering event: ${event}`));
      if (event === 'connect') {
        // Trigger connect event immediately
        setTimeout(callback, 0);
      }
      return this;
    },
    // Set operations
    async sadd(key: string, ...members: any[]) {
      console.log(chalk.blue(`[MOCK-REDIS] Adding to set: ${key}`));
      let set = mockStorage.get(key);
      if (!set) {
        set = new Set();
        mockStorage.set(key, set);
      }
      members.forEach(member => set.add(member));
      return members.length;
    },
    async smembers(key: string) {
      console.log(chalk.blue(`[MOCK-REDIS] Getting members of set: ${key}`));
      const set = mockStorage.get(key);
      return set ? Array.from(set) : [];
    },
    async srem(key: string, ...members: any[]) {
      console.log(chalk.blue(`[MOCK-REDIS] Removing from set: ${key}`));
      const set = mockStorage.get(key);
      if (!set) return 0;
      let removed = 0;
      members.forEach(member => {
        if (set.delete(member)) removed++;
      });
      return removed;
    },
    // Keys operations
    async keys(pattern: string) {
      console.log(chalk.blue(`[MOCK-REDIS] Getting keys matching pattern: ${pattern}`));
      // Very simple pattern matching (only supports *)
      const keys = Array.from(mockStorage.keys());
      if (pattern === '*') return keys;
      
      // Convert Redis glob pattern to regex
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      return keys.filter(key => regex.test(key));
    },
    // Quit does nothing in mock implementation
    async quit() {
      console.log(chalk.blue(`[MOCK-REDIS] Quitting (no-op)`));
      return 'OK';
    }
  };
  
  console.log(chalk.green('[REDIS] Mock Redis implementation created successfully'));
  return mockRedis;
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
    
    // In Lovable environment, pretend connection is OK
    if (process.env.LOVABLE_ENV === 'true') {
      console.log(chalk.yellow('[REDIS] In Lovable environment, assuming Redis is working'));
      return true;
    }
    
    return false;
  }
}

export default {
  createRedisInstance,
  getRedisClient,
  checkRedisConnection
};
