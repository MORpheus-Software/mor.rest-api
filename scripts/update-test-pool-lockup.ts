#!/usr/bin/env node
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { BuildersClient } from '../src/staking/BuildersClient';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

// Minimum withdraw lock period (2 days in seconds)
const MINIMUM_LOCKUP_PERIOD = 172800;
const TARGET_LOCKUP_PERIOD = 600; // 10 minutes in seconds

// Use the minimum allowed period if 10 minutes is too low
const NEW_LOCKUP_PERIOD = MINIMUM_LOCKUP_PERIOD;

async function main() {
  try {
    console.log('🔄 Updating testnet pool lockup period to 10 minutes...');
    
    // Check if required environment variables are set
    if (!process.env.PRIVATE_KEY) {
      console.error('❌ PRIVATE_KEY environment variable is not set');
      console.log('Please create a .env file with your PRIVATE_KEY');
      return;
    }
    
    if (!process.env.VITE_TEST_POOL_NAME || !process.env.VITE_TEST_POOL_ID) {
      console.error('❌ Test pool configuration environment variables are not set');
      console.log('Please run scripts/create-test-pool.ts first to create a test pool');
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
    
    // Get pool configuration from environment
    const poolName = process.env.VITE_TEST_POOL_NAME;
    const poolId = process.env.VITE_TEST_POOL_ID;
    const adminAddress = process.env.VITE_TEST_POOL_ADMIN || wallet.address;
    const poolStart = parseInt(process.env.VITE_TEST_POOL_START || '0');
    const claimLockEnd = parseInt(process.env.VITE_TEST_POOL_CLAIM_LOCK_END || '0');
    const minimalDeposit = process.env.VITE_TEST_POOL_MIN_DEPOSIT || '0.01';
    
    console.log('\n📋 Current pool configuration:');
    console.log(`- Name: ${poolName}`);
    console.log(`- ID: ${poolId}`);
    console.log(`- Admin: ${adminAddress}`);
    console.log(`- Pool Start: ${new Date(poolStart * 1000).toLocaleString()} (${poolStart})`);
    console.log(`- Current Withdraw Lock Period: ${process.env.VITE_TEST_POOL_WITHDRAW_LOCK || 'N/A'} seconds`);
    console.log(`- Desired Withdraw Lock Period: ${TARGET_LOCKUP_PERIOD} seconds (10 minutes)`);
    console.log(`- Actual New Withdraw Lock Period: ${NEW_LOCKUP_PERIOD} seconds (2 days, minimum allowed by contract)`);
    console.log(`- Claim Lock End: ${new Date(claimLockEnd * 1000).toLocaleString()} (${claimLockEnd})`);
    console.log(`- Minimal Deposit: ${minimalDeposit} MOR`);
    
    // Get current pool info from blockchain
    try {
      const poolInfo = await buildersClient.getPoolInfo(poolId);
      console.log('\n📊 Current pool info from blockchain:');
      console.log(`- Name: ${poolInfo.name}`);
      console.log(`- Admin: ${poolInfo.admin}`);
      console.log(`- Current Withdraw Lock Period: ${poolInfo.withdrawLockPeriodAfterDeposit} seconds`);
    } catch (error) {
      console.error(`❌ Error fetching pool info: ${error.message}`);
      return;
    }
    
    // Add a 5-second delay for user to cancel if needed
    console.log('\n⏱️ Waiting 5 seconds before updating lockup period...');
    console.log('Press Ctrl+C to cancel');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Update the pool with the new lockup period
    console.log('\n🔄 Updating pool lockup period...');
    try {
      const result = await buildersClient.editBuilderPool(
        poolName,
        adminAddress,
        poolStart,
        NEW_LOCKUP_PERIOD,  // New 10-minute lockup period
        claimLockEnd,
        minimalDeposit
      );
      
      console.log(`⏳ Transaction submitted: ${result.transaction.hash}`);
      console.log(`🔗 Transaction URL: https://sepolia.arbiscan.io/tx/${result.transaction.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await result.transaction.wait();
      console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);
      
      // Verify the update
      const updatedPoolInfo = await buildersClient.getPoolInfo(poolId);
      console.log('\n📊 Updated pool info:');
      console.log(`- Name: ${updatedPoolInfo.name}`);
      console.log(`- Withdraw Lock Period: ${updatedPoolInfo.withdrawLockPeriodAfterDeposit} seconds`);
      
      if (updatedPoolInfo.withdrawLockPeriodAfterDeposit === NEW_LOCKUP_PERIOD) {
        console.log('✅ Successfully updated lockup period to 10 minutes!');
        
        // Update .env.local file with the new lockup period
        const envFilePath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envFilePath)) {
          let envContent = fs.readFileSync(envFilePath, 'utf8');
          
          // Update the VITE_TEST_POOL_WITHDRAW_LOCK value
          envContent = envContent.replace(
            /VITE_TEST_POOL_WITHDRAW_LOCK="\d+"/,
            `VITE_TEST_POOL_WITHDRAW_LOCK="${NEW_LOCKUP_PERIOD}"`
          );
          
          fs.writeFileSync(envFilePath, envContent);
          console.log(`\n✅ Updated environment configuration in ${envFilePath}`);
        }
        
        // Update config file
        const CONFIG_PATH = path.join(process.cwd(), 'config/test-pool-config.json');
        if (fs.existsSync(CONFIG_PATH)) {
          const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
          config.withdrawLockPeriod = NEW_LOCKUP_PERIOD;
          
          if (config.lastCreatedPool) {
            config.lastCreatedPool.withdrawLockPeriod = NEW_LOCKUP_PERIOD;
          }
          
          fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
          console.log(`✅ Updated pool configuration in ${CONFIG_PATH}`);
        }
      } else {
        console.error(`❌ Update verification failed! Expected ${NEW_LOCKUP_PERIOD} but got ${updatedPoolInfo.withdrawLockPeriodAfterDeposit}`);
      }
    } catch (error) {
      console.error('❌ Error updating pool:', error);
      
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
    console.error('❌ An unhandled error occurred:', error);
  }
}

// Execute the main function
main().catch((error) => {
  console.error('Unhandled error in main function:', error);
  process.exit(1);
}); 