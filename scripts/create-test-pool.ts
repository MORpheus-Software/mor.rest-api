#!/usr/bin/env node
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BuildersClient } from '../src/staking/BuildersClient';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config();

// Load config file
const CONFIG_PATH = path.join(process.cwd(), 'config/test-pool-config.json');
let config = {
  poolName: "TestPool",
  withdrawLockPeriod: 172800,
  claimLockEndOffset: 86400,
  minimalDeposit: "0.01",
  startOffset: 60,
  initialDeposit: "0.05"
};

// Load existing configuration if it exists
if (fs.existsSync(CONFIG_PATH)) {
  try {
    const fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    config = { ...config, ...fileConfig };
  } catch (error) {
    console.warn('Error loading config file, using defaults:', error);
  }
}

async function main() {
  try {
    console.log('🔄 Creating test pool on Arbitrum Sepolia testnet...');
    
    // Check if required environment variables are set
    if (!process.env.PRIVATE_KEY) {
      console.error('❌ PRIVATE_KEY environment variable is not set');
      console.log('Please create a .env file with your PRIVATE_KEY');
      return;
    }

    // Format private key correctly
    let privateKey = process.env.PRIVATE_KEY;
    // Add 0x prefix if it doesn't exist
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    // Connect to Arbitrum Sepolia
    console.log('\n🔄 Connecting to Arbitrum Sepolia testnet...');
    const provider = new ethers.JsonRpcProvider(process.env.TESTNET_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc');
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`🔑 Using wallet address: ${wallet.address}`);

    // Initialize BuildersClient
    const buildersClient = new BuildersClient(
      provider,
      wallet
    );

    // Set up basic pool parameters
    const timestamp = Math.floor(Date.now() / 1000);
    const poolName = `${config.poolName}_${timestamp}`;
    const adminAddress = wallet.address;
    const poolStart = timestamp + config.startOffset; // Default: 1 minute from now
    const withdrawLockPeriod = config.withdrawLockPeriod; // Default: 2 days (minimum)
    const claimLockEnd = timestamp + config.claimLockEndOffset; // Default: 24 hours from now
    const minimalDeposit = config.minimalDeposit; // Default: 0.01 MOR token
    const initialDeposit = config.initialDeposit; // Default: 0.05 MOR

    // Generate the pool ID
    const poolId = buildersClient.getPoolId(poolName);
    console.log(`\n🆔 Pool ID for "${poolName}": ${poolId}`);

    // Check MOR token balance
    const balance = await buildersClient.getMorBalance();
    console.log(`\n💰 MOR token balance: ${ethers.formatEther(balance)} MOR`);
    
    if (balance < ethers.parseEther(initialDeposit)) {
      console.error(`❌ Insufficient MOR tokens. Need at least ${initialDeposit} MOR.`);
      return;
    }

    // Check token allowance and approve if necessary
    const allowance = await buildersClient.getMorAllowance();
    console.log(`\n🔐 Current MOR token allowance: ${ethers.formatEther(allowance)} MOR`);
    
    // The deposit amount we'll use for testing
    const depositAmount = initialDeposit;
    
    if (allowance < ethers.parseEther(depositAmount)) {
      console.log(`🔄 Approving exactly ${depositAmount} MOR tokens...`);
      const approveTx = await buildersClient.approveMorTokens(depositAmount);
      console.log(`⏳ Approval transaction submitted: ${approveTx.hash}`);
      await approveTx.wait();
      console.log('✅ Approval confirmed');
    } else {
      console.log('✅ Token allowance is sufficient');
    }

    // Log the parameters for the pool creation
    console.log('\n📋 Creating pool with the following parameters:');
    console.log(`- Name: ${poolName}`);
    console.log(`- Admin: ${adminAddress}`);
    console.log(`- Pool Start: ${new Date(poolStart * 1000).toLocaleString()} (${poolStart})`);
    console.log(`- Withdraw Lock Period: ${withdrawLockPeriod} seconds (${withdrawLockPeriod / 86400} days)`);
    console.log(`- Claim Lock End: ${new Date(claimLockEnd * 1000).toLocaleString()} (${claimLockEnd})`);
    console.log(`- Minimal Deposit: ${minimalDeposit} MOR`);

    // Add a 5-second delay for user to cancel if needed
    console.log('\n⏱️ Waiting 5 seconds before submitting transaction...');
    console.log('Press Ctrl+C to cancel');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Create the pool
    console.log('\n🔄 Creating pool...');
    
    try {
      // Create the pool
      const result = await buildersClient.createBuilderPool(
        poolName,
        adminAddress,
        poolStart,
        withdrawLockPeriod,
        claimLockEnd,
        minimalDeposit
      );
      
      console.log(`⏳ Transaction submitted: ${result.transaction.hash}`);
      console.log(`🔗 Transaction URL: https://sepolia.arbiscan.io/tx/${result.transaction.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await result.transaction.wait();
      console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);
      
      console.log(`\n🎉 Pool "${poolName}" created successfully with ID: ${poolId}`);

      // Save the configuration data for future reference
      const createdPoolConfig = {
        ...config,
        lastCreatedPool: {
          name: poolName,
          id: poolId,
          admin: adminAddress,
          start: poolStart,
          withdrawLockPeriod: withdrawLockPeriod,
          claimLockEnd: claimLockEnd,
          minimalDeposit: minimalDeposit,
          createdAt: timestamp,
          createdAtDate: new Date(timestamp * 1000).toISOString()
        }
      };
      
      // Update the config file
      const configDir = path.dirname(CONFIG_PATH);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(createdPoolConfig, null, 2));
      console.log(`\n✅ Updated pool configuration in ${CONFIG_PATH}`);

      // Update .env.local file to set the test pool
      const envFilePath = path.join(process.cwd(), '.env.local');
      
      // Read existing .env.local file if it exists
      let existingEnvContent = '';
      if (fs.existsSync(envFilePath)) {
        existingEnvContent = fs.readFileSync(envFilePath, 'utf8');
        
        // Remove any existing test pool configuration lines
        existingEnvContent = existingEnvContent
          .split('\n')
          .filter(line => !line.startsWith('VITE_TEST_POOL_'))
          .join('\n');
      }
      
      // Add the new configuration
      const newEnvConfig = `
# Test pool configuration - Updated ${new Date().toISOString()}
VITE_TEST_POOL_NAME="${poolName}"
VITE_TEST_POOL_ID="${poolId}"
VITE_TEST_POOL_ADMIN="${adminAddress}"
VITE_TEST_POOL_START="${poolStart}"
VITE_TEST_POOL_WITHDRAW_LOCK="${withdrawLockPeriod}"
VITE_TEST_POOL_CLAIM_LOCK_END="${claimLockEnd}"
VITE_TEST_POOL_MIN_DEPOSIT="${minimalDeposit}"
`;

      // Write the updated content back
      fs.writeFileSync(envFilePath, existingEnvContent + newEnvConfig);
      console.log(`\n✅ Updated test pool configuration in ${envFilePath}`);

      // Add some test data - deposit tokens to the pool
      console.log(`\n🔄 Depositing ${depositAmount} MOR to the test pool...`);
      
      // Wait for the pool to start
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime < poolStart) {
        const waitTime = poolStart - currentTime + 5; // Add 5 seconds buffer
        console.log(`Waiting ${waitTime} seconds for pool to start...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
      
      const depositTx = await buildersClient.deposit(poolId, depositAmount);
      console.log(`⏳ Deposit transaction submitted: ${depositTx.hash}`);
      
      await depositTx.wait();
      console.log(`✅ Successfully deposited ${depositAmount} MOR to the test pool`);
      
      // Output final success message with details
      console.log(`\n🎉 Test pool setup completed successfully!`);
      console.log(`\n📝 Test Pool Details:`);
      console.log(`- Name: ${poolName}`);
      console.log(`- ID: ${poolId}`);
      console.log(`- Admin: ${adminAddress}`);

      // Update the application's test pool configuration
      console.log(`\n🔄 Updating application configuration to use the new test pool...`);
      try {
        const { stdout, stderr } = await execAsync('npx tsx scripts/update-test-pool-config.ts');
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        console.log(`✅ Successfully updated application to use the new test pool`);
      } catch (configError) {
        console.error(`❌ Error updating application configuration: ${configError.message}`);
        console.log(`   You can manually update it by running: npx tsx scripts/update-test-pool-config.ts`);
      }

    } catch (error) {
      console.error('❌ Error creating pool:', error);
      
      // Try to extract more details about the error
      if (error instanceof Error) {
        console.log('\nError details:');
        console.log('- Message:', error.message);
        
        if ('reason' in error) {
          console.log('- Reason:', (error as any).reason);
        }
        
        if ('code' in error) {
          console.log('- Error code:', (error as any).code);
        }
        
        if ('data' in error) {
          console.log('- Error data:', (error as any).data);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ An error occurred:', error);
  }
}

// Execute the main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 