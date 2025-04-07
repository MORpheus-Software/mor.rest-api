import { BuildersClient } from './BuildersClient';
import { Redis } from 'ioredis';

// Redis key prefix for stake status
const STAKE_STATUS_PREFIX = 'stake:status:';
// Redis key for tracking all pools
const ALL_POOLS_KEY = 'stake:pools';
// Redis key for tracking all staked users
const ALL_USERS_KEY = 'stake:users';

// Status enum
export enum StakeStatus {
  LOCKED = 'LOCKED',
  UNLOCKED = 'UNLOCKED'
}

/**
 * StakeStatusTracker is responsible for tracking the lock status of user stakes
 * and persisting this information in Redis
 */
export class StakeStatusTracker {
  private redisClient: Redis;
  private buildersClient: BuildersClient;

  /**
   * Create a new StakeStatusTracker
   * @param redisClient Redis client for persistence
   * @param buildersClient BuildersClient for blockchain interaction
   */
  constructor(redisClient: Redis, buildersClient: BuildersClient) {
    this.redisClient = redisClient;
    this.buildersClient = buildersClient;
  }

  /**
   * Generate a Redis key for a user's stake status in a specific pool
   * @param userAddress User's blockchain address
   * @param poolId Pool ID
   * @returns Redis key string
   */
  private getStatusKey(userAddress: string, poolId: string): string {
    return `${STAKE_STATUS_PREFIX}${userAddress.toLowerCase()}:${poolId}`;
  }

  /**
   * Check if a user's stake is locked based on their last deposit and the pool's withdrawal lock period
   * @param userAddress User's blockchain address
   * @param poolId Pool ID
   * @returns Promise resolving to the stake status
   */
  async checkStakeStatus(userAddress: string, poolId: string): Promise<StakeStatus> {
    try {
      // Get pool info to get the withdrawal lock period
      const poolInfo = await this.buildersClient.getPoolInfo(poolId);
      
      // Get user data for the specific pool
      const userData = await this.buildersClient.getUserData(userAddress, poolId);
      
      if (!userData.deposited || userData.deposited.wei === BigInt(0)) {
        // User has no deposit, so there's nothing to lock
        return StakeStatus.UNLOCKED;
      }
      
      // Current timestamp in seconds
      const now = Math.floor(Date.now() / 1000);
      
      // Calculate when the lock expires
      const lockExpiry = Number(userData.lastDeposit.timestamp) + 
                         Number(poolInfo.withdrawLockPeriodAfterDeposit);
      
      // Determine status
      const status = now < lockExpiry ? StakeStatus.LOCKED : StakeStatus.UNLOCKED;
      
      return status;
    } catch (error) {
      console.error(`Error checking stake status for user ${userAddress} in pool ${poolId}:`, error);
      // Default to UNLOCKED if there's an error
      return StakeStatus.UNLOCKED;
    }
  }

  /**
   * Update and store a user's stake status
   * @param userAddress User's blockchain address
   * @param poolId Pool ID
   * @returns Promise resolving to the updated stake status
   */
  async updateStakeStatus(userAddress: string, poolId: string): Promise<StakeStatus> {
    try {
      // Check current status
      const status = await this.checkStakeStatus(userAddress, poolId);
      
      // Store in Redis
      const key = this.getStatusKey(userAddress, poolId);
      await this.redisClient.set(key, status);
      
      // Track this user and pool for future updates
      await this.redisClient.sadd(ALL_USERS_KEY, userAddress.toLowerCase());
      await this.redisClient.sadd(ALL_POOLS_KEY, poolId);
      
      return status;
    } catch (error) {
      console.error(`Error updating stake status for user ${userAddress} in pool ${poolId}:`, error);
      throw error;
    }
  }

  /**
   * Get a user's stored stake status
   * @param userAddress User's blockchain address
   * @param poolId Pool ID
   * @returns Promise resolving to the stake status
   */
  async getStakeStatus(userAddress: string, poolId: string): Promise<StakeStatus> {
    try {
      const key = this.getStatusKey(userAddress, poolId);
      const status = await this.redisClient.get(key);
      
      // If no status exists, compute and store it
      if (!status) {
        return this.updateStakeStatus(userAddress, poolId);
      }
      
      return status as StakeStatus;
    } catch (error) {
      console.error(`Error getting stake status for user ${userAddress} in pool ${poolId}:`, error);
      throw error;
    }
  }

  /**
   * Update status for all known user-pool combinations
   * @returns Promise resolving when all updates are complete
   */
  async updateAllStakeStatuses(): Promise<void> {
    try {
      // Get all users and pools
      const users = await this.redisClient.smembers(ALL_USERS_KEY);
      const pools = await this.redisClient.smembers(ALL_POOLS_KEY);
      
      if (users.length === 0 || pools.length === 0) {
        console.log('No users or pools found to update. Run discovery first.');
        return;
      }
      
      // Update all combinations
      for (const user of users) {
        for (const pool of pools) {
          await this.updateStakeStatus(user, pool);
        }
      }
      
      console.log(`Updated stake statuses for ${users.length} users across ${pools.length} pools`);
    } catch (error) {
      console.error('Error updating all stake statuses:', error);
      throw error;
    }
  }

  /**
   * Discover new pools and users from the blockchain
   * This should be run initially to populate the database
   * @param knownPoolIds Array of known pool IDs to check
   * @param knownUsers Array of known user addresses to check
   * @returns Promise resolving when discovery is complete
   */
  async discoverStakes(knownPoolIds: string[], knownUsers: string[]): Promise<void> {
    try {
      // First, add all known pools and users to our tracking sets
      for (const poolId of knownPoolIds) {
        await this.redisClient.sadd(ALL_POOLS_KEY, poolId);
      }
      
      for (const user of knownUsers) {
        await this.redisClient.sadd(ALL_USERS_KEY, user.toLowerCase());
      }
      
      // Update all combinations of known users and pools
      await this.updateAllStakeStatuses();
      
      console.log('Stake discovery completed');
    } catch (error) {
      console.error('Error during stake discovery:', error);
      throw error;
    }
  }
}

// Factory function to create a StakeStatusTracker from a Redis client and provider/signer
export async function createStakeStatusTracker(
  redisClient: Redis,
  buildersClient: BuildersClient
): Promise<StakeStatusTracker> {
  return new StakeStatusTracker(redisClient, buildersClient);
} 