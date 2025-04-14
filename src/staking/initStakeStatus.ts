import { ethers } from 'ethers';
import { Redis } from 'ioredis';
import { BuildersClient } from './BuildersClient.js';
import { StakeStatusTracker } from './StakeStatusTracker.js';
import chalk from 'chalk';

/**
 * Initialize the stake status tracker and update all stake statuses
 * @param redisClient Redis client for persistence
 * @param provider Ethereum provider
 * @param signer Ethereum signer (optional, read-only operations work without it)
 * @param knownPoolIds Array of known pool IDs to check (optional)
 * @param knownUsers Array of known user addresses to check (optional)
 * @returns Promise resolving to the created tracker
 */
export async function initializeStakeStatusTracking(
  redisClient: Redis,
  provider: ethers.Provider,
  signer?: ethers.Signer,
  knownPoolIds: string[] = [],
  knownUsers: string[] = []
): Promise<StakeStatusTracker> {
  try {
    console.log(chalk.blue('[STAKE_STATUS] Initializing stake status tracking'));
    
    // Create the BuildersClient - if no signer is provided, we'll use a read-only client
    const buildersClient = new BuildersClient(provider, signer || provider);
    
    console.log(chalk.blue(`[STAKE_STATUS] Using network: ${buildersClient.getNetworkType()}`));
    
    // Create the stake status tracker
    const stakeTracker = await createStakeStatusTracker(redisClient, buildersClient);
    
    // Discover and update stakes
    console.log(chalk.blue('[STAKE_STATUS] Starting stake discovery and status updates'));
    await stakeTracker.discoverStakes(knownPoolIds, knownUsers);
    
    console.log(chalk.green('[STAKE_STATUS] Stake status tracking initialized successfully'));
    
    return stakeTracker;
  } catch (error) {
    console.error(chalk.red('[STAKE_STATUS] Failed to initialize stake status tracking:'), error);
    throw error;
  }
}

/**
 * Create a new StakeStatusTracker
 * @param redisClient Redis client for persistence
 * @param buildersClient BuildersClient for blockchain interaction
 * @returns Promise resolving to the created tracker
 */
async function createStakeStatusTracker(
  redisClient: Redis,
  buildersClient: BuildersClient
): Promise<StakeStatusTracker> {
  return new StakeStatusTracker(redisClient, buildersClient);
} 