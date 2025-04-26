import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { getRedisClient } from '../../server/setupRedis.js';
import { BuildersClient } from '../../staking/BuildersClient.js';
import { ethers } from 'ethers';
import chalk from 'chalk';
import { AuthenticatedRequest } from './auth-middleware.js';
import { StakeStatus } from '../../staking/StakeStatusTracker.js';
import dotenv from 'dotenv';
import { normalizeUserId } from '../utils/userId';

// Load environment variables
dotenv.config();

// Configure chain ID from environment or use sensible defaults (mainnet: 42161, testnet: 421613)
const CHAIN_ID = process.env.ETHEREUM_CHAIN_ID
  ? parseInt(process.env.ETHEREUM_CHAIN_ID, 10)
  : (process.env.NODE_ENV === 'production' ? 42161 : 421613);

// Default pool ID from environment variable or fallback to a default value
const DEFAULT_POOL_ID = process.env.DEFAULT_POOL_ID || "mor.rest"; // Store as a string for now, will hash when needed

// Ethereum provider URL
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || 
                         (process.env.NODE_ENV === 'production' 
                           ? 'https://arb-sepolia.g.alchemy.com/v2/demo'
                           : 'https://sepolia-rollup.arbitrum.io/rpc');

// Redis cache key for user stake status
const USER_STAKE_PREFIX = 'stake:amount:';
// Cache expiration time for stake checks (5 minutes)
const STAKE_CACHE_TTL = 5 * 60;

// Redis key prefix for stake status
const STAKE_STATUS_PREFIX = 'stake:status:';
// Redis key for tracking all pools
const ALL_POOLS_KEY = 'stake:pools';

// Redis client for caching
let redisClient: Redis | null = null;

/**
 * Normalize a pool ID to the format expected by the blockchain
 * If the pool ID is already a valid hex value (starts with 0x and has 66 chars), 
 * assume it's already normalized. Otherwise, hash it with ethers.utils.id
 */
function normalizePoolId(poolId: string): string {
  // Check if it's already a valid bytes32 hash
  if (poolId.startsWith('0x') && poolId.length === 66) {
    return poolId;
  }
  
  // Otherwise hash it
  const hashedId = ethers.utils.id(poolId);
  console.log(chalk.blue(`[STAKE_CHECK] Normalized pool ID from "${poolId}" to "${hashedId}"`));
  return hashedId;
}

/**
 * Set Redis client for caching stake checks
 */
export function setRedisClientForStakeCheck(client: Redis) {
  redisClient = client;
  console.log(chalk.green('[STAKE_CHECK] Redis client set for stake caching'));
}

/**
 * Get all user IDs associated with a wallet address
 * @param walletAddress Ethereum wallet address
 * @returns Promise resolving to array of user IDs or empty array if none found
 */
export async function getUserIdsFromWallet(walletAddress: string): Promise<string[]> {
  try {
    const redisClient = await getRedisClient();
    const normalizedAddress = walletAddress.toLowerCase();
    const userIds = await redisClient.smembers(`wallet:users:${normalizedAddress}`);
    
    if (userIds.length === 0) {
      console.warn(chalk.yellow(`[STAKE_CHECK] No user IDs found for wallet ${normalizedAddress}`));
      return [];
    }
    
    return userIds;
  } catch (error) {
    console.error(chalk.red(`[STAKE_CHECK] Error fetching user IDs for wallet: ${error}`));
    return [];
  }
}

/**
 * Get a user ID associated with a wallet address
 * Note: If multiple users are associated with this wallet, returns the first one
 * @param walletAddress Ethereum wallet address
 * @returns Promise resolving to user ID or null if not found
 */
export async function getUserIdFromWallet(walletAddress: string): Promise<string | null> {
  try {
    const userIds = await getUserIdsFromWallet(walletAddress);
    
    if (userIds.length > 0) {
      if (userIds.length > 1) {
        console.warn(chalk.yellow(`[STAKE_CHECK] Multiple users (${userIds.length}) found for wallet ${walletAddress}, returning first one: ${userIds[0]}`));
      }
      return userIds[0];
    }
    
    return null;
  } catch (error) {
    console.error(chalk.red(`[STAKE_CHECK] Error fetching user ID for wallet: ${error}`));
    return null;
  }
}

/**
 * Get the user's wallet address from their user ID
 * In a real implementation, this would query a database
 * @param userId User ID from authentication
 * @returns Promise resolving to user's wallet address or null
 * @throws Error if the user ID is not a valid UUID
 */
export async function getUserWalletAddress(userId: string): Promise<string | null> {
  if (!userId) {
    console.warn(chalk.yellow(`[STAKE_CHECK] No user ID provided`));
    return null;
  }

  // First try to get the wallet with the original user ID
  try {
    // Validate that the userId is a properly formatted UUID
    const validatedUserId = normalizeUserId(userId);
    
    // Get the user's wallet address from Redis
    const redisClient = await getRedisClient();
    const walletAddress = await redisClient.get(`user:wallet:${validatedUserId}`);
    
    if (walletAddress) {
      console.log(chalk.green(`[STAKE_CHECK] Found wallet address ${walletAddress} for user ${validatedUserId}`));
      return walletAddress;
    }
    
    console.warn(chalk.yellow(`[STAKE_CHECK] No wallet address found for user ${validatedUserId}`));
    return null;
  } catch (error) {
    // If we get a UUID format error, try to handle it gracefully
    if (error instanceof Error && error.message.includes('Invalid user ID format')) {
      console.warn(chalk.yellow(`[STAKE_CHECK] Received non-UUID format: ${userId}, attempting to find matching wallet anyway`));
      
      try {
        // Try looking up with the original ID format anyway in case it's stored that way
        const redisClient = await getRedisClient();
        
        // First, check if there's a direct mapping for this ID format
        const directWallet = await redisClient.get(`user:wallet:${userId}`);
        if (directWallet) {
          console.log(chalk.green(`[STAKE_CHECK] Found direct wallet mapping for non-UUID: ${userId}`));
          return directWallet;
        }
        
        // Next, search for user keys that start with this ID
        if (userId.length >= 8) {
          const prefix = userId.substring(0, 8);
          const potentialUuids = await redisClient.keys(`user:${prefix}*`);
          
          // Filter to find full UUIDs that start with this prefix
          const matchingUuids = potentialUuids.filter(key => {
            const parts = key.split(':');
            return parts.length >= 2 && parts[1].startsWith(prefix) && parts[1].includes('-');
          });
          
          if (matchingUuids.length > 0) {
            // Extract the full UUID and check if it has a wallet
            const fullUuid = matchingUuids[0].split(':')[1];
            console.log(chalk.blue(`[STAKE_CHECK] Found potential full UUID match: ${fullUuid}`));
            
            const walletAddress = await redisClient.get(`user:wallet:${fullUuid}`);
            if (walletAddress) {
              console.log(chalk.green(`[STAKE_CHECK] Found wallet address by UUID prefix: ${walletAddress}`));
              return walletAddress;
            }
          }
        }
        
        console.warn(chalk.yellow(`[STAKE_CHECK] Could not find wallet for non-UUID: ${userId}`));
        return null;
      } catch (lookupError) {
        console.error(chalk.red(`[STAKE_CHECK] Error in fallback wallet lookup: ${lookupError}`));
        return null;
      }
    }
    
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
    
    // For development, always check the blockchain to ensure we have the latest data
    if (process.env.NODE_ENV !== 'production' || !cachedResult) {
      console.log(chalk.blue(`[STAKE_CHECK] Checking blockchain for latest stake data`));
      
      // Create provider
      const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_RPC_URL, CHAIN_ID);
      
      // Create BuildersClient with provider as both provider and signer
      // Note: This is read-only mode, we won't be sending transactions
      const buildersClient = new BuildersClient(
        provider,
        provider as unknown as ethers.Signer  // Type cast for read-only operations
      );
      
      try {
        // Normalize the pool ID before passing to blockchain methods
        const normalizedPoolId = normalizePoolId(poolId);
        console.log(chalk.blue(`[STAKE_CHECK] Using normalized pool ID: ${normalizedPoolId}`));
        
        // Get pool information to determine minimum stake
        const poolInfo = await buildersClient.getPoolInfo(normalizedPoolId);
        console.log(chalk.blue('[STAKE_CHECK]'), `Pool info for ${poolId}: minStake=${poolInfo.minimalDeposit.formatted}`);
        
        // Get user staking data
        const userData = await buildersClient.getUserData(userAddress, normalizedPoolId);
        console.log(chalk.blue('[STAKE_CHECK] User data for'), userAddress, ':', 'amount=', userData.deposited.formatted);
        
        // Get pool info to determine minimum stake
        const minStakeRequired = poolInfo.minimalDeposit.formatted;
        
        // Get user's stake amount
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
        console.error(chalk.red(`[STAKE_CHECK] Error checking blockchain: ${error}`));
        
        // If blockchain check fails but we have a cached result, use it
        if (cachedResult) {
          const isStaked = cachedResult === 'true';
          console.log(chalk.yellow(`[STAKE_CHECK] Fallback to cached result: ${isStaked ? 'Has minimum stake' : 'Does not have minimum stake'}`));
          return isStaked;
        }
        
        // In case of error with no cached result, default to denying access
        return false;
      }
    }
    
    // Use cached result if available and we're in production
    const isStaked = cachedResult === 'true';
    console.log(chalk.blue(`[STAKE_CHECK] Using cached result: ${isStaked ? 'Has minimum stake' : 'Does not have minimum stake'}`));
    return isStaked;
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
      if (!blockchainResult.hasMinStake) {
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
      if (blockchainResult.hasMinStake !== dbResult.hasMinimumStake || 
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
        if (blockchainResult.hasMinStake !== dbResult.hasMinimumStake || 
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
 * Check if a user has met the minimum staking requirement on the blockchain
 */
async function checkBlockchainStakeStatus(
  walletAddress: string, 
  poolId: string = DEFAULT_POOL_ID
): Promise<{ hasMinStake: boolean, isLocked: boolean }> {
  try {
    // Normalize the pool ID before making blockchain calls
    const normalizedPoolId = normalizePoolId(poolId);
    console.log(chalk.blue(`[STAKE_CHECK] Checking blockchain stake status for wallet ${walletAddress} in pool ${poolId} (normalized: ${normalizedPoolId})`));
    
    // Create provider and client for read-only operations
    const provider = new ethers.providers.JsonRpcProvider(ETHEREUM_RPC_URL);
    const buildersClient = new BuildersClient(
      provider,
      provider as unknown as ethers.Signer  // Type cast for read-only operations
    );

    // Get pool information to determine minimum stake
    const poolInfo = await buildersClient.getPoolInfo(normalizedPoolId);
    console.log(chalk.blue('[STAKE_CHECK]'), `Pool info for ${poolId}: minStake=${poolInfo.minimalDeposit.formatted}`);

    // Get user staking data
    const userData = await buildersClient.getUserData(walletAddress, normalizedPoolId);
    console.log(chalk.blue('[STAKE_CHECK] User data for'), walletAddress, ':', 'amount=', userData.deposited.formatted);

    // Check if user has minimum stake and if it's locked
    const userStake = parseFloat(userData.deposited.formatted);
    const minRequired = parseFloat(poolInfo.minimalDeposit.formatted);
    const hasMinStake = userStake >= minRequired;
    
    // Check if locked based on claimLockStart timestamp
    // If claimLockStart is in the future, the stake is locked
    const now = Math.floor(Date.now() / 1000);
    const isLocked = userData.claimLockStart.timestamp > now;

    console.log(chalk.blue(`[STAKE_CHECK] Blockchain check results: hasMinStake=${hasMinStake}, isLocked=${isLocked}`));
    return { hasMinStake, isLocked };
  } catch (error) {
    console.error(chalk.red(`[STAKE_CHECK] Error checking blockchain stake status: ${error}`));
    // Default to false for both checks in case of error
    return { hasMinStake: false, isLocked: false };
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
  blockchainResult: {hasMinStake: boolean, isLocked: boolean},
  redisClient: Redis
): Promise<void> {
  try {
    // Update minimum stake status
    const stakeCacheKey = `${USER_STAKE_PREFIX}${walletAddress.toLowerCase()}:${DEFAULT_POOL_ID}`;
    await redisClient.set(stakeCacheKey, blockchainResult.hasMinStake ? 'true' : 'false', 'EX', STAKE_CACHE_TTL);
    
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