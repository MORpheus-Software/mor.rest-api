import { ethers } from 'ethers';
import chalk from 'chalk';
import { initializeStakeStatusTracking } from '../staking/initStakeStatus.js';
import { getRedisClient } from './setupRedis.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure chain ID from environment or use sensible defaults (mainnet: 42161, testnet: 421613)
const CHAIN_ID = process.env.ETHEREUM_CHAIN_ID
  ? parseInt(process.env.ETHEREUM_CHAIN_ID, 10)
  : (process.env.NODE_ENV === 'production' ? 42161 : 421613);

/**
 * Initialize the stake status tracking system on server startup
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeStakeTrackingSystem(): Promise<void> {
  try {
    console.log(chalk.yellow('='.repeat(50)));
    console.log(chalk.yellow('Initializing Stake Status Tracking'));
    console.log(chalk.yellow('='.repeat(50)));
    
    // Get Redis client
    const redisClient = await getRedisClient();
    
    // Check if we have the RPC URL environment variable
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 
                  (process.env.NODE_ENV === 'production' 
                    ? 'https://arb-sepolia.g.alchemy.com/v2/demo'  // Default for testnet
                    : 'http://localhost:8545'); // Default for local development
    
    console.log(chalk.blue(`[STAKE_TRACKER] Using RPC URL: ${rpcUrl.includes('/v2/') ? rpcUrl.split('/v2/')[0] + '/v2/[API-KEY-HIDDEN]' : rpcUrl}`));
    
    let provider;
    let blockNumber;
    
    // Create provider and test connection
    try {
      // Pass explicit chain ID to avoid network autodetection issues
      provider = new ethers.providers.JsonRpcProvider(rpcUrl, CHAIN_ID);
      blockNumber = await provider.getBlockNumber();
      console.log(chalk.green(`[STAKE_TRACKER] Connected to blockchain. Current block: ${blockNumber}`));
    } catch (error) {
      console.error(chalk.red('[STAKE_TRACKER] Error connecting to blockchain:'), error);
      console.log(chalk.yellow('[STAKE_TRACKER] For testing staking auth without a blockchain connection, add MOCK_BLOCKCHAIN=true to your .env file'));
      
      // If MOCK_BLOCKCHAIN is set, create a mock provider for testing
      if (process.env.MOCK_BLOCKCHAIN === 'true') {
        console.log(chalk.yellow('[STAKE_TRACKER] Using mock blockchain provider for testing'));
        // Simple mock provider for testing purposes
        provider = {
          getBlockNumber: async () => 123456,
          // Add other necessary methods as needed
        } as any;
      } else {
        throw new Error('Could not connect to blockchain provider');
      }
    }
    
    // Get any known pools from environment variables or config
    const knownPoolIds: string[] = [];
    
    // If we have a pool ID environment variable, add it to the list
    if (process.env.DEFAULT_POOL_ID) {
      knownPoolIds.push(process.env.DEFAULT_POOL_ID);
    }
    
    // Get any known users from environment variables or config
    const knownUsers: string[] = [];
    
    // If we have a test user environment variable, add it to the list
    if (process.env.TEST_USER_ADDRESS) {
      knownUsers.push(process.env.TEST_USER_ADDRESS);
    }
    
    // Initialize stake tracking
    const stakeTracker = await initializeStakeStatusTracking(
      redisClient,
      provider,
      undefined, // No signer needed for reading data
      knownPoolIds,
      knownUsers
    );
    
    console.log(chalk.green('[STAKE_TRACKER] Stake tracking initialized successfully'));
    console.log(chalk.yellow('='.repeat(50)));
    
    // Set up periodic updates every hour
    setInterval(async () => {
      try {
        console.log(chalk.blue('[STAKE_TRACKER] Running periodic stake status update'));
        await stakeTracker.updateAllStakeStatuses();
        console.log(chalk.green('[STAKE_TRACKER] Periodic stake status update completed'));
      } catch (error) {
        console.error(chalk.red('[STAKE_TRACKER] Error during periodic update:'), error);
      }
    }, 60 * 60 * 1000); // Every hour
    
    return;
  } catch (error) {
    console.error(chalk.red('[STAKE_TRACKER] Initialization error:'), error);
    // Don't throw - we want the server to start even if stake tracking fails
    console.log(chalk.yellow('[STAKE_TRACKER] Continuing server startup despite tracking initialization failure'));
    console.log(chalk.yellow('[STAKE_TRACKER] To test staking auth features, configure ETHEREUM_RPC_URL or set MOCK_BLOCKCHAIN=true in your .env file'));
    return;
  }
} 