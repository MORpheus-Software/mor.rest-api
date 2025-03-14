import { Redis, Cluster } from 'ioredis';

type RedisClient = Redis | Cluster;

interface RedisAdapterOptions {
  clusterMode?: boolean;
}

export class RedisAdapter {
  private url: string;
  private clusterMode: boolean;
  private redisClient: RedisClient | null = null;

  constructor(url: string, clusterMode = false) {
    this.url = url;
    this.clusterMode = clusterMode;
  }

  private async createClient(): Promise<RedisClient> {
    if (this.clusterMode) {
      const nodes = this.url.split(',').map(url => ({ url }));
      return new Cluster(nodes.map(node => node.url));
    } else {
      return new Redis(this.url);
    }
  }

  private async getClient(): Promise<RedisClient> {
    if (!this.redisClient) {
      this.redisClient = await this.createClient();

      this.redisClient.on('error', (err) => {
        console.error('Redis error:', err);
        this.redisClient = null;
      });
    }
    return this.redisClient;
  }

  /**
   * Set a value in Redis with an optional expiration time.
   * @param key The key to set
   * @param value The value to set
   * @param expirationTimeSeconds Optional expiration time in seconds
   */
  async set(key: string, value: string, expirationTimeSeconds?: number): Promise<void> {
    const redis = await this.getClient();
    try {
      if (expirationTimeSeconds) {
        await redis.set(key, value, 'EX', expirationTimeSeconds);
      } else {
        await redis.set(key, value);
      }
    } finally {
      redis.quit();
    }
  }

  /**
   * Get a value from Redis
   * @param key The key to get
   * @returns The value, or null if not found
   */
  async get(key: string): Promise<string | null> {
    const redis = await this.getClient();
    try {
      return await redis.get(key);
    } finally {
      redis.quit();
    }
  }

  /**
   * Delete a key from Redis
   * @param key The key to delete
   */
  async del(key: string): Promise<void> {
    const redis = await this.getClient();
    try {
      await redis.del(key);
    } finally {
      redis.quit();
    }
  }

  /**
   * Check if a key exists in Redis
   * @param key The key to check
   * @returns True if the key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    const redis = await this.getClient();
    try {
      const result = await redis.exists(key);
      return result === 1;
    } finally {
      redis.quit();
    }
  }

  /**
   * Increment a key in Redis
   * @param key The key to increment
   * @returns The new value of the key
   */
  async incr(key: string): Promise<number> {
    const redis = await this.getClient();
    try {
      return await redis.incr(key);
    } finally {
      redis.quit();
    }
  }

  /**
   * Expire a key in Redis
   * @param key The key to expire
   * @param expirationTimeSeconds The expiration time in seconds
   */
  async expire(key: string, expirationTimeSeconds: number): Promise<void> {
    const redis = await this.getClient();
    try {
      await redis.expire(key, expirationTimeSeconds);
    } finally {
      redis.quit();
    }
  }

  /**
   * Get the time to live of a key in Redis
   * @param key The key to check
   * @returns The time to live in seconds, or -1 if the key does not exist or does not have an expiration time
   */
  async ttl(key: string): Promise<number> {
    const redis = await this.getClient();
    try {
      return await redis.ttl(key);
    } finally {
      redis.quit();
    }
  }

  /**
   * List keys matching a pattern
   * @param pattern The pattern to match
   * @returns An array of keys matching the pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const redis = await this.getClient();
    try {
      return await redis.keys(pattern);
    } finally {
      redis.quit();
    }
  }
}
