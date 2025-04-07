import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { getRedisClient } from '../../server/setupRedis.js';
import { BuildersClient } from '../../staking/BuildersClient.js';
import { ethers } from 'ethers';
import chalk from 'chalk';
import { AuthenticatedRequest } from './auth-middleware.js';
import { StakeStatus } from '../../staking/StakeStatusTracker.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Default pool ID from environment variable or fallback to a default value
const DEFAULT_POOL_ID = process.env.DEFAULT_POOL_ID || 
                         ethers.id("mor.rest"); // Generate ID from name if not provided

// Ethereum provider URL
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || 
                         (process.env.NODE_ENV === 'production' 
                           ? 'https://arb-sepolia.g.alchemy.com/v2/demo'
                           : 'http://localhost:8545');

// Redis cache key for user stake status
const USER_STAKE_PREFIX = 'stake:amount:';
// Cache expiration time for stake checks (1 hour)
const STAKE_CACHE_TTL = 60 * 60;

// Redis key prefix for stake status
const STAKE_STATUS_PREFIX = 'stake:status:';
// Redis key for tracking all pools
const ALL_POOLS_KEY = 'stake:pools';

/**
 * Get the user's wallet address from their user ID
 * In a real implementation, this would query a database
 * @param userId User ID from authentication
 * @returns Promise resolving to user's wallet address or null
 */
export async function getUserWalletAddress(userId: string): Promise<string | null> {
  try {
    // In a real implementation, query the user's wallet address from a database
    // For now, we'll use a simple Redis key to store this mapping
    const redisClient = await getRedisClient();
    const walletAddress = await redisClient.get(`user:wallet:${userId}`);
    
    if (!walletAddress) {
      console.warn(chalk.yellow(`[STAKE_CHECK] No wallet address found for user ${userId}`));
      return null;
    }
    
    return walletAddress;
  } catch (error) {
    console.error(chalk.red(`[STAKE_CHECK] Error fetching user wallet address: ${error}`));
    return null;
  }
}

/**
 * Check if a user has met the minimum staking requirement
 * @param userAddress User's blockchain address
 * @param poolId Pool ID to check
 * @returns Promise resolving to boolean indicating if minimum stake is met
 */
export async function hasMinimumStake(userAddress: string, poolId: string): Promise<boolean> {
  try {
    console.log(chalk.blue(`[STAKE_CHECK] Checking minimum stake for user ${userAddress}`));
    
    // Get cached result if available
    const redisClient = await getRedisClient();
    const cacheKey = `${USER_STAKE_PREFIX}${userAddress.toLowerCase()}:${poolId}`;
    const cachedResult = await redisClient.get(cacheKey);
    
    if (cachedResult) {
      const isStaked = cachedResult === 'true';
      console.log(chalk.blue(`[STAKE_CHECK] Using cached result: ${isStaked ? 'Has minimum stake' : 'Does not have minimum stake'}`));
      return isStaked;
    }
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(ETHEREUM_RPC_URL);
    
    // Create BuildersClient
    const buildersClient = new BuildersClient(
      provider,
      new ethers.AbstractSigner(provider) // Read-only signer
    );
    
    // Get pool info to determine minimum stake
    const poolInfo = await buildersClient.getPoolInfo(poolId);
    const minStakeRequired = poolInfo.minimalDeposit.formatted;
    
    // Get user's stake amount
    const userData = await buildersClient.getUserData(userAddress, poolId);
    const userStake = userData.deposited.formatted;
    
    console.log(chalk.blue(`[STAKE_CHECK] User ${userAddress} has staked ${userStake} (minimum: ${minStakeRequired})`));
    
    // Compare stake amount with minimum requirement
    const stakeAmount = parseFloat(userStake);
    const minRequired = parseFloat(minStakeRequired);
    const hasStake = stakeAmount >= minRequired;
    
    // Cache the result
    await redisClient.set(cacheKey, hasStake ? 'true' : 'false', 'EX', STAKE_CACHE_TTL);
    
    return hasStake;
  } catch (error) {
    console.error(chalk.red(`[STAKE_CHECK] Error checking minimum stake: ${error}`));
    // In case of error, default to denying access
    return false;
  }
}

/**
 * Check if the user has the minimum required stake in the default pool
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export async function checkStakingMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    
    // Only check staking requirement if authentication passed
    if (!authReq.isAuthenticated || !authReq.userId) {
      console.log(chalk.yellow(`[STAKE_CHECK] User not authenticated, skipping stake check`));
      return next();
    }
    
    console.log(chalk.blue(`[STAKE_CHECK] Checking staking for user ${authReq.userId}`));
    
    // Get user's wallet address
    const walletAddress = await getUserWalletAddress(authReq.userId);
    
    if (!walletAddress) {
      console.warn(chalk.yellow(`[STAKE_CHECK] No wallet address found for user ${authReq.userId}, blocking access`));
      return res.status(403).json({
        error: {
          message: 'You need to connect your wallet to access this endpoint',
          type: 'staking_requirement_not_met',
          code: 'WALLET_NOT_CONNECTED'
        }
      });
    }
    
    // Check if user has minimum stake
    const hasStake = await hasMinimumStake(walletAddress, DEFAULT_POOL_ID);
    
    if (!hasStake) {
      console.warn(chalk.yellow(`[STAKE_CHECK] User ${authReq.userId} (${walletAddress}) does not have minimum stake, blocking access`));
      return res.status(403).json({
        error: {
          message: 'You need to stake MOR tokens to access this feature',
          type: 'staking_requirement_not_met',
          code: 'INSUFFICIENT_STAKE'
        }
      });
    }
    
    // User has met staking requirement
    console.log(chalk.green(`[STAKE_CHECK] User ${authReq.userId} has sufficient stake, allowing access`));
    next();
  } catch (error) {
    console.error(chalk.red(`[STAKE_CHECK] Error in staking middleware: ${error}`));
    // Allow access on error to prevent blocking legitimate users
    // In a production environment, you might want to deny access instead
    next();
  }
}

/**
 * Middleware to check if a user's stake is locked in any pool
 * If locked, the request will be blocked with 401 Unauthorized
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export async function checkStakeLockedMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    
    // Only check staking requirement if authentication passed
    if (!authReq.isAuthenticated || !authReq.userId) {
      console.log(chalk.yellow(`[STAKE_LOCK_CHECK] User not authenticated, skipping stake check`));
      return next();
    }
    
    console.log(chalk.blue(`[STAKE_LOCK_CHECK] Checking if stake is locked for user ${authReq.userId}`));
    
    // Get user's wallet address
    const walletAddress = await getUserWalletAddress(authReq.userId);
    
    if (!walletAddress) {
      console.warn(chalk.yellow(`[STAKE_LOCK_CHECK] No wallet address found for user ${authReq.userId}, allowing access`));
      return next();
    }
    
    // Get Redis client for checking stake status
    const redisClient = await getRedisClient();
    
    // Get all pools from Redis
    const pools = await redisClient.smembers(ALL_POOLS_KEY);
    
    if (pools.length === 0) {
      // No pools found, allow access
      console.log(chalk.yellow(`[STAKE_LOCK_CHECK] No pools found, allowing access`));
      return next();
    }
    
    // Check each pool to see if the user is locked in any of them
    for (const poolId of pools) {
      const statusKey = `${STAKE_STATUS_PREFIX}${walletAddress.toLowerCase()}:${poolId}`;
      const status = await redisClient.get(statusKey);
      
      if (status === StakeStatus.LOCKED) {
        // User is locked in this pool, deny access
        console.log(chalk.red(`[STAKE_LOCK_CHECK] User ${authReq.userId} (${walletAddress}) is locked in pool ${poolId}, denying access`));
        return res.status(401).json({
          error: {
            message: 'Your account is locked due to staking restrictions',
            type: 'stake_locked_error',
            pool: poolId
          }
        });
      }
    }
    
    // User is not locked in any pool, allow access
    console.log(chalk.green(`[STAKE_LOCK_CHECK] User ${authReq.userId} is not locked in any pool, allowing access`));
    next();
  } catch (error) {
    console.error(chalk.red(`[STAKE_LOCK_CHECK] Error checking stake lock status: ${error}`));
    // In case of an error, we'll allow access rather than blocking everyone
    next();
  }
}

/**
 * Combined middleware that checks blockchain status first, then falls back to database
 * with a grace period of 10% of the database response time
 */
export async function combinedStakeCheckMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    
    // Only check staking requirement if authentication passed
    if (!authReq.isAuthenticated || !authReq.userId) {
      console.log(chalk.yellow(`[STAKE_CHECK] User not authenticated, skipping stake check`));
      return next();
    }
    
    console.log(chalk.blue(`[STAKE_CHECK] Starting combined stake check for user ${authReq.userId}`));
    
    // Get user's wallet address
    const walletAddress = await getUserWalletAddress(authReq.userId);
    
    if (!walletAddress) {
      console.warn(chalk.yellow(`[STAKE_CHECK] No wallet address found for user ${authReq.userId}, blocking access`));
      return res.status(403).json({
        error: {
          message: 'You need to connect your wallet to access this endpoint',
          type: 'staking_requirement_not_met',
          code: 'WALLET_NOT_CONNECTED'
        }
      });
    }
    
    // Record start time for database check
    const dbStartTime = Date.now();
    
    // Start blockchain check first (don't await it yet)
    console.log(chalk.blue(`[STAKE_CHECK] Starting blockchain check for user ${authReq.userId}`));
    const blockchainPromise = checkBlockchainStakeStatus(walletAddress, DEFAULT_POOL_ID);
    
    // Get Redis client for database check
    const redisClient = await getRedisClient();
    
    // Run database check
    console.log(chalk.blue(`[STAKE_CHECK] Starting database check for user ${authReq.userId}`));
    const dbResult = await checkDatabaseStakeStatus(walletAddress, redisClient);
    
    // Calculate database response time and grace period (10%)
    const dbResponseTime = Date.now() - dbStartTime;
    const gracePeriod = Math.max(dbResponseTime * 0.1, 100); // At least 100ms grace period
    
    console.log(chalk.blue(`[STAKE_CHECK] Database responded in ${dbResponseTime}ms, grace period: ${gracePeriod}ms`));
    
    // Try to get blockchain result with grace period
    let blockchainResult;
    let usedBlockchainResult = false;
    
    try {
      blockchainResult = await Promise.race([
        blockchainPromise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), gracePeriod))
      ]);
      
      if (blockchainResult !== null) {
        usedBlockchainResult = true;
        console.log(chalk.green(`[STAKE_CHECK] Used blockchain result within grace period`));
      } else {
        console.log(chalk.yellow(`[STAKE_CHECK] Grace period expired, using database result`));
      }
    } catch (error) {
      console.error(chalk.red(`[STAKE_CHECK] Error in blockchain check during grace period: ${error}`));
      blockchainResult = null;
    }
    
    // If blockchain result is available, use it
    if (usedBlockchainResult) {
      if (!blockchainResult.hasMinimumStake) {
        console.warn(chalk.yellow(`[STAKE_CHECK] Blockchain check: User ${authReq.userId} does not have minimum stake, blocking access`));
        return res.status(403).json({
          error: {
            message: 'You need to stake MOR tokens to access this feature',
            type: 'staking_requirement_not_met',
            code: 'INSUFFICIENT_STAKE'
          }
        });
      }
      
      if (blockchainResult.isLocked) {
        console.warn(chalk.red(`[STAKE_CHECK] Blockchain check: User ${authReq.userId} stake is locked, blocking access`));
        return res.status(401).json({
          error: {
            message: 'Your account is locked due to staking restrictions',
            type: 'stake_locked_error',
            pool: DEFAULT_POOL_ID
          }
        });
      }
      
      // Update database in background if it differs from blockchain
      if (blockchainResult.hasMinimumStake !== dbResult.hasMinimumStake || 
          blockchainResult.isLocked !== dbResult.isLocked) {
        updateDatabaseFromBlockchain(walletAddress, blockchainResult, redisClient).catch(err => {
          console.error(chalk.red(`[STAKE_CHECK] Error updating database from blockchain: ${err}`));
        });
      }
    } else {
      // Use database result, but continue blockchain check in background
      if (!dbResult.hasMinimumStake) {
        console.warn(chalk.yellow(`[STAKE_CHECK] Database check: User ${authReq.userId} does not have minimum stake, blocking access`));
        return res.status(403).json({
          error: {
            message: 'You need to stake MOR tokens to access this feature',
            type: 'staking_requirement_not_met',
            code: 'INSUFFICIENT_STAKE'
          }
        });
      }
      
      if (dbResult.isLocked) {
        console.warn(chalk.red(`[STAKE_CHECK] Database check: User ${authReq.userId} stake is locked, blocking access`));
        return res.status(401).json({
          error: {
            message: 'Your account is locked due to staking restrictions',
            type: 'stake_locked_error',
            pool: DEFAULT_POOL_ID
          }
        });
      }
      
      // Continue blockchain check in background and update database if needed
      blockchainPromise.then(blockchainResult => {
        if (blockchainResult.hasMinimumStake !== dbResult.hasMinimumStake || 
            blockchainResult.isLocked !== dbResult.isLocked) {
          console.log(chalk.blue(`[STAKE_CHECK] Background update: Blockchain check completed, updating database`));
          updateDatabaseFromBlockchain(walletAddress, blockchainResult, redisClient).catch(err => {
            console.error(chalk.red(`[STAKE_CHECK] Error updating database from blockchain: ${err}`));
          });
        }
      }).catch(err => {
        console.error(chalk.red(`[STAKE_CHECK] Background blockchain check error: ${err}`));
      });
    }
    
    // All checks passed, allow access
    console.log(chalk.green(`[STAKE_CHECK] All checks passed for user ${authReq.userId}, allowing access`));
    next();
  } catch (error) {
    console.error(chalk.red(`[STAKE_CHECK] Error in combined stake check middleware: ${error}`));
    // Allow access on error to prevent blocking legitimate users
    // In a production environment, you might want to deny access instead
    next();
  }
}

/**
 * Check stake status directly from the blockchain
 */
async function checkBlockchainStakeStatus(walletAddress: string, poolId: string): Promise<{hasMinimumStake: boolean, isLocked: boolean}> {
  try {
    // Create provider
    const provider = new ethers.JsonRpcProvider(ETHEREUM_RPC_URL);
    
    // Create BuildersClient
    const buildersClient = new BuildersClient(
      provider,
      new ethers.AbstractSigner(provider) // Read-only signer
    );
    
    // Get pool info
    const poolInfo = await buildersClient.getPoolInfo(poolId);
    const minStakeRequired = poolInfo.minimalDeposit.formatted;
    
    // Get user's stake data
    const userData = await buildersClient.getUserData(walletAddress, poolId);
    const userStake = userData.deposited.formatted;
    
    // Check minimum stake
    const stakeAmount = parseFloat(userStake);
    const minRequired = parseFloat(minStakeRequired);
    const hasMinimumStake = stakeAmount >= minRequired;
    
    // Check if locked
    const now = Math.floor(Date.now() / 1000);
    const lockExpiry = Number(userData.lastDeposit.timestamp) + 
                       Number(poolInfo.withdrawLockPeriodAfterDeposit);
    const isLocked = now < lockExpiry;
    
    console.log(chalk.blue(`[STAKE_CHECK] Blockchain check for ${walletAddress}: hasMinimumStake=${hasMinimumStake}, isLocked=${isLocked}`));
    
    return { hasMinimumStake, isLocked };
  } catch (error) {
    console.error(chalk.red(`[STAKE_CHECK] Error checking blockchain stake status: ${error}`));
    // Default to false for both in case of error
    return { hasMinimumStake: false, isLocked: false };
  }
}

/**
 * Check stake status from the database (Redis)
 */
async function checkDatabaseStakeStatus(walletAddress: string, redisClient: Redis): Promise<{hasMinimumStake: boolean, isLocked: boolean}> {
  try {
    // Check minimum stake from database
    const stakeCacheKey = `${USER_STAKE_PREFIX}${walletAddress.toLowerCase()}:${DEFAULT_POOL_ID}`;
    const cachedStakeResult = await redisClient.get(stakeCacheKey);
    const hasMinimumStake = cachedStakeResult === 'true';
    
    // Check locked status from database
    const statusKey = `${STAKE_STATUS_PREFIX}${walletAddress.toLowerCase()}:${DEFAULT_POOL_ID}`;
    const status = await redisClient.get(statusKey);
    const isLocked = status === StakeStatus.LOCKED;
    
    console.log(chalk.blue(`[STAKE_CHECK] Database check for ${walletAddress}: hasMinimumStake=${hasMinimumStake}, isLocked=${isLocked}`));
    
    return { hasMinimumStake, isLocked };
  } catch (error) {
    console.error(chalk.red(`[STAKE_CHECK] Error checking database stake status: ${error}`));
    // Default to most permissive in case of error
    return { hasMinimumStake: true, isLocked: false };
  }
}

/**
 * Update database based on blockchain results
 */
async function updateDatabaseFromBlockchain(
  walletAddress: string, 
  blockchainResult: {hasMinimumStake: boolean, isLocked: boolean},
  redisClient: Redis
): Promise<void> {
  try {
    // Update minimum stake status
    const stakeCacheKey = `${USER_STAKE_PREFIX}${walletAddress.toLowerCase()}:${DEFAULT_POOL_ID}`;
    await redisClient.set(stakeCacheKey, blockchainResult.hasMinimumStake ? 'true' : 'false', 'EX', STAKE_CACHE_TTL);
    
    // Update locked status
    const statusKey = `${STAKE_STATUS_PREFIX}${walletAddress.toLowerCase()}:${DEFAULT_POOL_ID}`;
    await redisClient.set(statusKey, blockchainResult.isLocked ? StakeStatus.LOCKED : StakeStatus.UNLOCKED);
    
    // Ensure pool is tracked
    await redisClient.sadd(ALL_POOLS_KEY, DEFAULT_POOL_ID);
    
    console.log(chalk.green(`[STAKE_CHECK] Updated database from blockchain for ${walletAddress}`));
  } catch (error) {
    console.error(chalk.red(`[STAKE_CHECK] Error updating database from blockchain: ${error}`));
    throw error;
  }
} 