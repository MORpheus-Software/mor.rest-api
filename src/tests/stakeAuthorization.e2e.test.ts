import { ethers } from 'ethers';
import axios from 'axios';
import { Redis } from 'ioredis';
import { BuildersClient, CONTRACT_ADDRESSES } from '../staking/BuildersClient';
import { StakeStatus } from '../staking/StakeStatusTracker';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test configuration
const TEST_CONFIG = {
  // API endpoint
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000/api/v1',
  
  // Test user credentials
  testUserId: process.env.TEST_USER_ID || 'test-user-1',
  testApiKey: process.env.TEST_API_KEY || 'sk-test-123456',
  
  // Testnet config
  testnetRpcUrl: process.env.TESTNET_RPC_URL || 'https://arb-sepolia.g.alchemy.com/v2/demo',
  privateKey: process.env.TEST_PRIVATE_KEY,
  
  // Redis config
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Builders contract addresses
  buildersContractAddress: CONTRACT_ADDRESSES.testnet.builders,
  morTokenAddress: CONTRACT_ADDRESSES.testnet.token,
  
  // Default pool
  defaultPoolId: process.env.DEFAULT_POOL_ID || ethers.id("mor.rest"),
  
  // Redis key prefixes
  stakeStatusPrefix: 'stake:status:',
  userStakePrefix: 'stake:amount:',
  
  // Timeouts
  defaultTimeout: 30000,
  graceMultiplier: 0.1, // 10% grace period
};

// Skip tests if required environment variables are missing
const skipTests = !TEST_CONFIG.privateKey || !TEST_CONFIG.testnetRpcUrl;

if (skipTests) {
  console.warn(`
    ⚠️ Skipping E2E tests due to missing configuration.
    To run these tests, please set the following environment variables:
    - TEST_PRIVATE_KEY: A private key with testnet ETH and MOR tokens
    - TESTNET_RPC_URL: RPC URL for Arbitrum Sepolia testnet
  `);
}

// Simple logging helper
const log = {
  blue: (text: string) => console.log(`[INFO] ${text}`),
  green: (text: string) => console.log(`[SUCCESS] ${text}`),
  red: (text: string) => console.error(`[ERROR] ${text}`),
  yellow: (text: string) => console.warn(`[WARNING] ${text}`)
};

// Test utilities
class TestHelper {
  provider: ethers.Provider;
  wallet: ethers.Wallet;
  signer: ethers.Signer;
  buildersClient: BuildersClient;
  redisClient: Redis;
  walletAddress: string;
  
  constructor() {
    // Initialize ethers provider
    this.provider = new ethers.JsonRpcProvider(TEST_CONFIG.testnetRpcUrl);
    
    // Create wallet and signer
    this.wallet = new ethers.Wallet(TEST_CONFIG.privateKey!, this.provider);
    this.signer = this.wallet;
    this.walletAddress = this.wallet.address;
    
    // Create BuildersClient
    this.buildersClient = new BuildersClient(
      this.provider, 
      this.signer,
      TEST_CONFIG.buildersContractAddress,
      TEST_CONFIG.morTokenAddress
    );
    
    // Create Redis client
    this.redisClient = new Redis(TEST_CONFIG.redisUrl);
  }
  
  // Create API client with auth
  createApiClient() {
    return axios.create({
      baseURL: TEST_CONFIG.apiBaseUrl,
      headers: {
        'Authorization': `Bearer ${TEST_CONFIG.testApiKey}`,
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // Allow any status code for testing
    });
  }
  
  // Associate wallet with test user
  async associateWalletWithUser() {
    await this.redisClient.set(`user:wallet:${TEST_CONFIG.testUserId}`, this.walletAddress);
    log.blue(`[TEST] Associated wallet ${this.walletAddress} with test user ${TEST_CONFIG.testUserId}`);
  }
  
  // Set database stake status directly (to create test conditions)
  async setDatabaseStakeStatus(isLocked: boolean) {
    const key = `${TEST_CONFIG.stakeStatusPrefix}${this.walletAddress.toLowerCase()}:${TEST_CONFIG.defaultPoolId}`;
    await this.redisClient.set(key, isLocked ? StakeStatus.LOCKED : StakeStatus.UNLOCKED);
    log.blue(`[TEST] Set database stake status for ${this.walletAddress} to ${isLocked ? 'LOCKED' : 'UNLOCKED'}`);
  }
  
  // Set database minimum stake status directly
  async setDatabaseMinimumStake(hasMinimumStake: boolean) {
    const key = `${TEST_CONFIG.userStakePrefix}${this.walletAddress.toLowerCase()}:${TEST_CONFIG.defaultPoolId}`;
    await this.redisClient.set(key, hasMinimumStake ? 'true' : 'false');
    log.blue(`[TEST] Set database minimum stake for ${this.walletAddress} to ${hasMinimumStake ? 'true' : 'false'}`);
  }
  
  // Get database stake status
  async getDatabaseStakeStatus(): Promise<StakeStatus | null> {
    const key = `${TEST_CONFIG.stakeStatusPrefix}${this.walletAddress.toLowerCase()}:${TEST_CONFIG.defaultPoolId}`;
    return await this.redisClient.get(key) as StakeStatus | null;
  }
  
  // Get database minimum stake status
  async getDatabaseMinimumStake(): Promise<boolean> {
    const key = `${TEST_CONFIG.userStakePrefix}${this.walletAddress.toLowerCase()}:${TEST_CONFIG.defaultPoolId}`;
    const value = await this.redisClient.get(key);
    return value === 'true';
  }
  
  // Get blockchain stake info
  async getBlockchainStakeInfo() {
    try {
      const poolInfo = await this.buildersClient.getPoolInfo(TEST_CONFIG.defaultPoolId);
      const userData = await this.buildersClient.getUserData(this.walletAddress, TEST_CONFIG.defaultPoolId);
      
      // Check minimum stake
      const stakeAmount = parseFloat(userData.deposited.formatted);
      const minRequired = parseFloat(poolInfo.minimalDeposit.formatted);
      const hasMinimumStake = stakeAmount >= minRequired;
      
      // Check if locked
      const now = Math.floor(Date.now() / 1000);
      const lockExpiry = Number(userData.lastDeposit.timestamp) + 
                         Number(poolInfo.withdrawLockPeriodAfterDeposit);
      const isLocked = now < lockExpiry;
      
      return { hasMinimumStake, isLocked };
    } catch (error) {
      log.red(`[TEST] Error getting blockchain stake info: ${error}`);
      return { hasMinimumStake: false, isLocked: false };
    }
  }
  
  // Make API request that triggers stake check
  async makeChatRequest() {
    const client = this.createApiClient();
    const startTime = Date.now();
    
    const response = await client.post('/chat/completions', {
      model: 'test-model',
      messages: [{ role: 'user', content: 'Test message' }]
    });
    
    const responseTime = Date.now() - startTime;
    
    return { response, responseTime };
  }
  
  // Clean up resources
  async cleanup() {
    await this.redisClient.quit();
  }
}

// Skip the describe block if required config is missing
(skipTests ? describe.skip : describe)('Stake Authorization E2E Tests', () => {
  // Global timeout for all tests
  jest.setTimeout(TEST_CONFIG.defaultTimeout);
  
  let helper: TestHelper;
  
  // Setup for all tests
  beforeAll(async () => {
    helper = new TestHelper();
    await helper.associateWalletWithUser();
    
    // Log wallet info
    log.blue(`[TEST] Using wallet address: ${helper.walletAddress}`);
    
    // Log blockchain stake info
    const blockchainInfo = await helper.getBlockchainStakeInfo();
    log.blue(`[TEST] Blockchain stake info: hasMinimumStake=${blockchainInfo.hasMinimumStake}, isLocked=${blockchainInfo.isLocked}`);
  });
  
  // Cleanup after all tests
  afterAll(async () => {
    await helper.cleanup();
  });
  
  /**
   * Test 1: Verify blockchain data is prioritized over database
   * 
   * This test verifies the system uses blockchain data (rather than database data)
   * when it responds within the grace period
   */
  test('Blockchain data is prioritized as source of truth', async () => {
    // Get actual blockchain state
    const blockchainInfo = await helper.getBlockchainStakeInfo();
    
    // Set database to opposite values
    await helper.setDatabaseStakeStatus(!blockchainInfo.isLocked);
    await helper.setDatabaseMinimumStake(!blockchainInfo.hasMinimumStake);
    
    // Make request that triggers stake check
    const { response } = await helper.makeChatRequest();
    
    // Check database values after request to see if they've been updated to match blockchain
    const dbStakeStatus = await helper.getDatabaseStakeStatus();
    const dbMinimumStake = await helper.getDatabaseMinimumStake();
    
    // If blockchain says user is locked, we should get 401 Unauthorized
    if (blockchainInfo.isLocked) {
      expect(response.status).toBe(401);
      expect(response.data.error?.type).toBe('stake_locked_error');
    } 
    // If blockchain says user doesn't have minimum stake, we should get 403 Forbidden
    else if (!blockchainInfo.hasMinimumStake) {
      expect(response.status).toBe(403);
      expect(response.data.error?.type).toBe('staking_requirement_not_met');
    }
    // Otherwise, request should succeed (or at least not fail due to staking)
    else {
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    }
    
    // Database should be updated to match blockchain
    expect(dbStakeStatus === StakeStatus.LOCKED).toBe(blockchainInfo.isLocked);
    expect(dbMinimumStake).toBe(blockchainInfo.hasMinimumStake);
  });
  
  /**
   * Test 2: Verify grace period keeps response times reasonable
   * 
   * This test verifies the system keeps response times reasonable
   * by using grace period logic to limit waiting for blockchain responses
   */
  test('Response times are kept reasonable with grace period', async () => {
    // Make first request to establish baseline (this should update DB)
    const { responseTime: firstResponseTime } = await helper.makeChatRequest();
    
    // Estimate grace period based on first response
    const estimatedGracePeriod = firstResponseTime * TEST_CONFIG.graceMultiplier;
    log.blue(`[TEST] First request took ${firstResponseTime}ms, estimated grace period: ${estimatedGracePeriod}ms`);
    
    // Make second request which should use DB if blockchain is slow
    const { responseTime: secondResponseTime } = await helper.makeChatRequest();
    log.blue(`[TEST] Second request took ${secondResponseTime}ms`);
    
    // The second request should either:
    // 1. Use blockchain data within grace period
    // 2. Fall back to database if blockchain is slow
    // Either way, it should not be much slower than baseline + grace period
    const maxReasonableTime = firstResponseTime * 1.5; // Allow some variance
    expect(secondResponseTime).toBeLessThan(maxReasonableTime);
  });
  
  /**
   * Test 3: Verify database synchronization
   * 
   * This test verifies the database stays synchronized with blockchain
   * after requests complete
   */
  test('Database is kept synchronized with blockchain', async () => {
    // Get initial blockchain state
    const blockchainInfo = await helper.getBlockchainStakeInfo();
    
    // Set database to incorrect values
    await helper.setDatabaseStakeStatus(!blockchainInfo.isLocked);
    await helper.setDatabaseMinimumStake(!blockchainInfo.hasMinimumStake);
    
    // Make request to trigger sync
    await helper.makeChatRequest();
    
    // Wait a short time for background sync to complete if needed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check database values after request
    const dbStakeStatus = await helper.getDatabaseStakeStatus();
    const dbMinimumStake = await helper.getDatabaseMinimumStake();
    
    // Database should now match blockchain
    expect(dbStakeStatus === StakeStatus.LOCKED).toBe(blockchainInfo.isLocked);
    expect(dbMinimumStake).toBe(blockchainInfo.hasMinimumStake);
  });
  
  /**
   * Test 4: Verify performance under slow blockchain conditions
   * 
   * This test verifies user experience remains fast even when blockchain is slow
   * by consistently returning quickly using database values as needed
   */
  test('User experience remains fast, even when blockchain is slow', async () => {
    // Get blockchain state
    const blockchainInfo = await helper.getBlockchainStakeInfo();
    
    // Set database to match blockchain (to ensure correct authorization)
    await helper.setDatabaseStakeStatus(blockchainInfo.isLocked);
    await helper.setDatabaseMinimumStake(blockchainInfo.hasMinimumStake);
    
    // Make multiple requests and measure response times
    const responseTimes = [];
    const numRequests = 3;
    
    for (let i = 0; i < numRequests; i++) {
      const { responseTime } = await helper.makeChatRequest();
      responseTimes.push(responseTime);
      log.blue(`[TEST] Request ${i+1} took ${responseTime}ms`);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Calculate statistics
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    
    log.blue(`[TEST] Average response time: ${avgResponseTime}ms, Max: ${maxResponseTime}ms`);
    
    // Verify reasonable consistency in response times
    // Maximum should not be more than 2x the average (indicates falling back to DB when needed)
    expect(maxResponseTime).toBeLessThan(avgResponseTime * 2);
  });
}); 