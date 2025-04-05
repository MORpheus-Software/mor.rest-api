#!/usr/bin/env node
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Constants
const TESTNET_BUILDERS_CONTRACT = '0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a';
const TESTNET_MOR_TOKEN = '0x34a285A1B1C166420Df5b6630132542923B5b27E';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt user for input
const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
};

// ABI for checking subnets
const BUILDERS_CONTRACT_ABI = [
  "function getPoolId(string builderPoolName_) external pure returns (bytes32)",
  "function builderPools(bytes32 builderPoolId_) external view returns (bytes32 id, string name, address admin, uint256 poolStart, uint256 withdrawLockPeriodAfterDeposit, uint256 claimLockEnd, uint256 minimalDeposit, uint256 totalDeposit, bool active)"
];

async function main() {
  try {
    console.log('🔄 Checking if subnet exists on Arbitrum Sepolia...');
    
    // Get subnet name from command line or file
    let subnetName = process.argv[2];
    
    if (!subnetName) {
      // Check if there's a config file with subnet name
      const configPath = path.join(process.cwd(), 'config', 'registration-config.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        subnetName = config.subnetName;
        console.log(`📋 Using subnet name from config: "${subnetName}"`);
      }
    }
    
    // If still no subnet name, ask for it
    if (!subnetName) {
      subnetName = await question('Enter subnet name to check: ');
    }
    
    // Connect to Arbitrum Sepolia
    console.log(`\n🔄 Connecting to Arbitrum Sepolia testnet...`);
    const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
    
    // Initialize contract (read-only is fine, no signer needed)
    const buildersContract = new ethers.Contract(
      TESTNET_BUILDERS_CONTRACT,
      BUILDERS_CONTRACT_ABI,
      provider
    );
    
    // Get the subnet ID
    const poolId = await buildersContract.getPoolId(subnetName);
    console.log(`🆔 Calculated Pool ID for "${subnetName}": ${poolId}`);
    
    // Try to get the subnet info
    console.log(`\n🔄 Checking if subnet exists...`);
    
    try {
      const poolInfo = await buildersContract.builderPools(poolId);
      
      // Check if the name is empty (doesn't exist) or not
      if (poolInfo[1] === "") {
        console.log(`✅ The subnet name "${subnetName}" is available for registration.`);
      } else {
        console.log(`⚠️ The subnet "${subnetName}" ALREADY EXISTS with the following details:`);
        console.log(`- Name: ${poolInfo[1]}`);
        console.log(`- Admin: ${poolInfo[2]}`);
        console.log(`- Pool Start: ${new Date(Number(poolInfo[3]) * 1000).toLocaleString()} (${poolInfo[3]})`);
        console.log(`- Withdraw Lock Period: ${poolInfo[4]} seconds`);
        console.log(`- Claim Lock End: ${Number(poolInfo[5]) === 0 ? 'No staking of rewards' : new Date(Number(poolInfo[5]) * 1000).toLocaleString()}`);
        console.log(`- Minimal Deposit: ${ethers.formatEther(poolInfo[6])} MOR`);
        console.log(`- Total Deposit: ${ethers.formatEther(poolInfo[7])} MOR`);
        console.log(`- Active: ${poolInfo[8]}`);
      }
    } catch (error) {
      console.log(`✅ The subnet name "${subnetName}" is available for registration.`);
      console.log(`Error checking pool: ${(error as Error).message}`);
    }
    
  } catch (error) {
    console.error('❌ An error occurred:', error);
  } finally {
    rl.close();
  }
}

// Execute the main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 