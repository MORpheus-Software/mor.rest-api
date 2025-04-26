import Redis from 'ioredis';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { getRedisClient } from './redisClient';
import { normalizeUserId } from '../lib/utils/userId';

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
 * @throws Error if the user ID is not a valid UUID
 */
export async function associateUserWithWallet(userId: string, walletAddress: string): Promise<void> {
  try {
    // Validate that the userId is in the correct UUID format
    const normalizedUserId = normalizeUserId(userId);
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    console.log(chalk.blue(`[REDIS] Associating user ${normalizedUserId} with wallet ${normalizedWalletAddress}`));
    const client = await getRedisClient();
    
    // Check if this wallet is already associated with this user
    const existingWalletForUser = await client.get(`user:wallet:${normalizedUserId}`);
    if (existingWalletForUser === normalizedWalletAddress) {
      console.log(chalk.yellow(`[REDIS] User ${normalizedUserId} is already associated with wallet ${normalizedWalletAddress}. Skipping.`));
      return;
    }
    
    // If the user had a different wallet before, remove that association
    if (existingWalletForUser && existingWalletForUser !== normalizedWalletAddress) {
      console.log(chalk.yellow(`[REDIS] User ${normalizedUserId} was previously associated with wallet ${existingWalletForUser}, updating to ${normalizedWalletAddress}`));
      
      // Remove user from the old wallet's users set
      await client.srem(`wallet:users:${existingWalletForUser}`, normalizedUserId);
      
      // If the old wallet has no more users, clean up
      const oldWalletUsers = await client.smembers(`wallet:users:${existingWalletForUser}`);
      if (oldWalletUsers.length === 0) {
        console.log(chalk.yellow(`[REDIS] Removing empty wallet users set for ${existingWalletForUser}`));
        await client.del(`wallet:users:${existingWalletForUser}`);
      }
    }
    
    // Store the association both ways
    // 1. User to wallet (one-to-one)
    await client.set(`user:wallet:${normalizedUserId}`, normalizedWalletAddress);
    
    // 2. Wallet to users (one-to-many using a Redis set)
    await client.sadd(`wallet:users:${normalizedWalletAddress}`, normalizedUserId);
    
    console.log(chalk.green(`[REDIS] Successfully associated user ${normalizedUserId} with wallet ${normalizedWalletAddress}`));
  } catch (error) {
    console.error(chalk.red(`[REDIS] Error associating user with wallet: ${error}`));
    throw error;
  }
}

/**
 * Clear any wallet association for a user
 * @param userId User ID
 * @returns Promise resolving when the association is cleared
 * @throws Error if the user ID is not a valid UUID
 */
export async function clearUserWalletAssociation(userId: string): Promise<void> {
  try {
    // Validate that the userId is in the correct UUID format
    const normalizedUserId = normalizeUserId(userId);
    
    console.log(chalk.blue(`[REDIS] Clearing wallet association for user ${normalizedUserId}`));
    const client = await getRedisClient();
    
    // Get the current wallet associated with this user
    const existingWallet = await client.get(`user:wallet:${normalizedUserId}`);
    
    if (existingWallet) {
      // Remove the user from the wallet's users set
      await client.srem(`wallet:users:${existingWallet}`, normalizedUserId);
      
      // If the wallet has no more users, clean up the empty set
      const remainingUsers = await client.smembers(`wallet:users:${existingWallet}`);
      if (remainingUsers.length === 0) {
        console.log(chalk.yellow(`[REDIS] Removing empty wallet users set for ${existingWallet}`));
        await client.del(`wallet:users:${existingWallet}`);
      }
      
      // Remove the user's wallet mapping
      await client.del(`user:wallet:${normalizedUserId}`);
      
      console.log(chalk.green(`[REDIS] Successfully cleared wallet association for user ${normalizedUserId}`));
    } else {
      console.log(chalk.yellow(`[REDIS] No wallet association found for user ${normalizedUserId}`));
    }
  } catch (error) {
    console.error(chalk.red(`[REDIS] Error clearing user wallet association: ${error}`));
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

/**
 * Check if a wallet is associated with any users
 * @param walletAddress Wallet address to check
 * @returns Promise resolving to array of user IDs, empty if none
 */
export async function getWalletUsers(walletAddress: string): Promise<string[]> {
  try {
    const normalizedWalletAddress = walletAddress.toLowerCase();
    console.log(chalk.blue(`[REDIS] Checking users associated with wallet ${normalizedWalletAddress}`));
    const client = await getRedisClient();
    
    const userIds = await client.smembers(`wallet:users:${normalizedWalletAddress}`);
    
    if (userIds.length > 0) {
      console.log(chalk.yellow(`[REDIS] Wallet ${normalizedWalletAddress} is associated with ${userIds.length} users: ${userIds.join(', ')}`));
      return userIds;
    } else {
      console.log(chalk.green(`[REDIS] Wallet ${normalizedWalletAddress} is not associated with any users`));
      return [];
    }
  } catch (error) {
    console.error(chalk.red(`[REDIS] Error checking wallet associations: ${error}`));
    return [];
  }
}

/**
 * Check if a specific wallet and user are associated
 * @param walletAddress Wallet address to check
 * @param userId User ID to check
 * @returns Promise resolving to boolean indicating if association exists
 */
export async function isWalletAssociatedWithUser(walletAddress: string, userId: string): Promise<boolean> {
  try {
    const normalizedWalletAddress = walletAddress.toLowerCase();
    console.log(chalk.blue(`[REDIS] Checking if wallet ${normalizedWalletAddress} is associated with user ${userId}`));
    const client = await getRedisClient();
    
    const isMember = await client.sismember(`wallet:users:${normalizedWalletAddress}`, userId);
    
    if (isMember === 1) {
      console.log(chalk.yellow(`[REDIS] Wallet ${normalizedWalletAddress} is associated with user ${userId}`));
      return true;
    } else {
      console.log(chalk.green(`[REDIS] Wallet ${normalizedWalletAddress} is not associated with user ${userId}`));
      return false;
    }
  } catch (error) {
    console.error(chalk.red(`[REDIS] Error checking wallet user association: ${error}`));
    return false;
  }
}
