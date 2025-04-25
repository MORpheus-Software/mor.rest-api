import { Request, Response } from 'express';
import { getRedisClient } from '../../server/setupRedis';
import { StakeStatus } from '../../staking/StakeStatusTracker';
import chalk from 'chalk';
import { associateUserWithWallet } from '../../server/setupRedis';

// Redis key prefix for stake status
const STAKE_STATUS_PREFIX = 'stake:status:';

/**
 * Get the stake status for a specific user and pool
 * @param req Request object
 * @param res Response object
 */
export async function getStakeStatus(req: Request, res: Response) {
  try {
    const { userAddress, poolId } = req.params;
    
    if (!userAddress || !poolId) {
      return res.status(400).json({
        success: false,
        error: 'User address and pool ID are required'
      });
    }
    
    const redisClient = await getRedisClient();
    const statusKey = `${STAKE_STATUS_PREFIX}${userAddress.toLowerCase()}:${poolId}`;
    
    // Get status from Redis
    const status = await redisClient.get(statusKey);
    
    // If status doesn't exist, return UNLOCKED as default
    const stakeStatus = status || StakeStatus.UNLOCKED;
    
    return res.json({
      success: true,
      data: {
        userAddress,
        poolId,
        status: stakeStatus,
        isLocked: stakeStatus === StakeStatus.LOCKED
      }
    });
  } catch (error) {
    console.error(chalk.red('[API] Error getting stake status:'), error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get stake status'
    });
  }
}

/**
 * Get all known pool IDs
 * @param req Request object
 * @param res Response object
 */
export async function getAllPools(req: Request, res: Response) {
  try {
    const redisClient = await getRedisClient();
    const poolsKey = 'stake:pools';
    
    // Get all pools from Redis
    const pools = await redisClient.smembers(poolsKey);
    
    return res.json({
      success: true,
      data: {
        pools
      }
    });
  } catch (error) {
    console.error(chalk.red('[API] Error getting all pools:'), error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get pools'
    });
  }
}

/**
 * Get stake status for all pools for a specific user
 * @param req Request object
 * @param res Response object
 */
export async function getUserStakeStatus(req: Request, res: Response) {
  try {
    const { userAddress } = req.params;
    
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'User address is required'
      });
    }
    
    const redisClient = await getRedisClient();
    const poolsKey = 'stake:pools';
    
    // Get all pools from Redis
    const pools = await redisClient.smembers(poolsKey);
    
    // Get status for each pool
    const statusPromises = pools.map(async (poolId) => {
      const statusKey = `${STAKE_STATUS_PREFIX}${userAddress.toLowerCase()}:${poolId}`;
      const status = await redisClient.get(statusKey) || StakeStatus.UNLOCKED;
      
      return {
        poolId,
        status,
        isLocked: status === StakeStatus.LOCKED
      };
    });
    
    const statuses = await Promise.all(statusPromises);
    
    return res.json({
      success: true,
      data: {
        userAddress,
        pools: statuses
      }
    });
  } catch (error) {
    console.error(chalk.red('[API] Error getting user stake status:'), error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user stake status'
    });
  }
}

/**
 * Associate a wallet address with a user account
 * @param req Request object containing userId and walletAddress
 * @param res Response object
 */
export async function associateWalletWithUser(req: Request, res: Response) {
  try {
    const { userId } = req.body;
    const { walletAddress } = req.body;
    
    if (!userId || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'User ID and wallet address are required'
      });
    }
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }
    
    // Associate user with wallet using the existing Redis helper function
    await associateUserWithWallet(userId, walletAddress);
    
    return res.json({
      success: true,
      data: {
        userId,
        walletAddress: walletAddress.toLowerCase()
      }
    });
  } catch (error) {
    console.error(chalk.red('[API] Error associating wallet with user:'), error);
    return res.status(500).json({
      success: false,
      error: 'Failed to associate wallet with user'
    });
  }
}

// Export all handlers
export default {
  getStakeStatus,
  getAllPools,
  getUserStakeStatus,
  associateWalletWithUser
}; 