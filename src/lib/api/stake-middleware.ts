import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../../server/setupRedis';
import { StakeStatus } from '../../staking/StakeStatusTracker';
import { AuthenticatedRequest } from './auth-middleware';
import chalk from 'chalk';

// Redis key prefix for stake status
const STAKE_STATUS_PREFIX = 'stake:status:';
// Redis key for tracking all pools
const ALL_POOLS_KEY = 'stake:pools';

/**
 * Middleware to check if a user's stake is locked in any pool
 * If locked, the request will be blocked with 401 Unauthorized
 */
export async function requireUnlockedStake(req: Request, res: Response, next: NextFunction) {
  try {
    // Get authenticated request
    const authReq = req as AuthenticatedRequest;
    
    // If not authenticated, pass through to the next middleware
    // (the requireAuth middleware will handle the unauthorized response)
    if (!authReq.isAuthenticated || !authReq.userId) {
      console.log(chalk.yellow('[STAKE_CHECK] User not authenticated, skipping stake check'));
      return next();
    }
    
    // Get user ID from the authenticated request
    const userId = authReq.userId;
    
    // Get Redis client for checking stake status
    const redisClient = await getRedisClient();
    
    // Get all pools from Redis
    const pools = await redisClient.smembers(ALL_POOLS_KEY);
    
    if (pools.length === 0) {
      // No pools found, allow access
      console.log(chalk.yellow('[STAKE_CHECK] No pools found, allowing access'));
      return next();
    }
    
    // Check each pool to see if the user is locked in any of them
    for (const poolId of pools) {
      const statusKey = `${STAKE_STATUS_PREFIX}${userId.toLowerCase()}:${poolId}`;
      const status = await redisClient.get(statusKey);
      
      if (status === StakeStatus.LOCKED) {
        // User is locked in this pool, deny access
        console.log(chalk.red(`[STAKE_CHECK] User ${userId} is locked in pool ${poolId}, denying access`));
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
    console.log(chalk.green(`[STAKE_CHECK] User ${userId} is not locked in any pool, allowing access`));
    next();
  } catch (error) {
    console.error(chalk.red('[STAKE_CHECK] Error checking stake status:'), error);
    // In case of an error, we'll allow access rather than blocking everyone
    console.log(chalk.yellow('[STAKE_CHECK] Error during stake check, allowing access'));
    next();
  }
} 