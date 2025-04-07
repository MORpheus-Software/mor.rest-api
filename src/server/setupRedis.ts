import Redis from 'ioredis';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Redis client instance
let redisClient: Redis | null = null;

// Default Redis URL
const DEFAULT_REDIS_URL = 'redis://localhost:6379';

/**
 * Get the Redis URL from environment variables
 */
export function getRedisUrl(): string {
  return process.env.REDIS_URL || DEFAULT_REDIS_URL;
}

/**
 * Create a new Redis client
 * @returns Promise resolving to a Redis client
 */
export async function createRedisClient(): Promise<Redis> {
  const redisUrl = getRedisUrl();
  console.log(chalk.blue(`[REDIS] Creating Redis client with URL: ${redisUrl.includes('@') ? redisUrl.split('@')[0] + '@[hidden]' : redisUrl}`));
  
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });
  
  // Set up error handling
  client.on('error', (error) => {
    console.error(chalk.red('[REDIS] Redis client error:'), error);
  });
  
  return client;
}

/**
 * Get or create a Redis client
 * @returns Promise resolving to a Redis client
 */
export async function getRedisClient(): Promise<Redis> {
  if (redisClient === null) {
    redisClient = await createRedisClient();
  }
  return redisClient;
}

/**
 * Check if Redis connection is working
 * @returns Promise resolving to boolean indicating connection status
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    console.error(chalk.red('[REDIS] Redis connection check failed:'), error);
    return false;
  }
}

/**
 * Associate a user ID with a wallet address for staking checks
 * This is a helper function for testing the staking middleware
 * @param userId User ID
 * @param walletAddress Ethereum wallet address
 * @returns Promise resolving when the association is complete
 */
export async function associateUserWithWallet(userId: string, walletAddress: string): Promise<void> {
  try {
    console.log(chalk.blue(`[REDIS] Associating user ${userId} with wallet ${walletAddress}`));
    const client = await getRedisClient();
    await client.set(`user:wallet:${userId}`, walletAddress.toLowerCase());
    console.log(chalk.green(`[REDIS] Successfully associated user ${userId} with wallet ${walletAddress}`));
  } catch (error) {
    console.error(chalk.red(`[REDIS] Error associating user with wallet: ${error}`));
    throw error;
  }
}

/**
 * Set cached staking status for a user/pool combination for testing
 * @param walletAddress User's wallet address
 * @param poolId Pool ID
 * @param hasStake Whether the user has the minimum stake
 * @returns Promise resolving when the cache is set
 */
export async function setCachedStakingStatus(
  walletAddress: string, 
  poolId: string,
  hasStake: boolean
): Promise<void> {
  try {
    console.log(chalk.blue(`[REDIS] Setting cached staking status for ${walletAddress} in pool ${poolId} to ${hasStake}`));
    const client = await getRedisClient();
    await client.set(`stake:amount:${walletAddress.toLowerCase()}:${poolId}`, hasStake ? 'true' : 'false', 'EX', 3600);
    console.log(chalk.green(`[REDIS] Successfully set cached staking status`));
  } catch (error) {
    console.error(chalk.red(`[REDIS] Error setting cached staking status: ${error}`));
    throw error;
  }
}
