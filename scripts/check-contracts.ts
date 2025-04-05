import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const TESTNET_RPC_URL = process.env.TESTNET_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
const TESTNET_BUILDERS_CONTRACT = process.env.VITE_TESTNET_BUILDERS_CONTRACT_ADDRESS || '0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a';
const TESTNET_STAKING_CONTRACT = process.env.VITE_TESTNET_STAKING_CONTRACT_ADDRESS || '0xC0eD68f163d44B6e9985F0041fDf6f67c6BCFF3f';

async function checkContract(address: string, name: string) {
  try {
    console.log(`Checking ${name} contract at address: ${address}`);
    const provider = new ethers.JsonRpcProvider(TESTNET_RPC_URL);
    
    // Check if address has code
    const code = await provider.getCode(address);
    
    if (code === '0x') {
      console.log(`❌ ${name} contract does NOT exist at ${address} (No code found)`);
      return false;
    } else {
      console.log(`✅ ${name} contract EXISTS at ${address}`);
      console.log(`Code length: ${code.length / 2 - 1} bytes`);
      return true;
    }
  } catch (error) {
    console.error(`Error checking ${name} contract:`, error);
    return false;
  }
}

async function main() {
  console.log('Checking contracts on Arbitrum Sepolia testnet...');
  console.log(`Using RPC URL: ${TESTNET_RPC_URL}`);
  
  const buildersExists = await checkContract(TESTNET_BUILDERS_CONTRACT, 'Builders');
  const stakingExists = await checkContract(TESTNET_STAKING_CONTRACT, 'Staking');
  
  console.log('\nSummary:');
  console.log(`Builders Contract: ${buildersExists ? 'EXISTS' : 'DOES NOT EXIST'}`);
  console.log(`Staking Contract: ${stakingExists ? 'EXISTS' : 'DOES NOT EXIST'}`);
}

main().catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
}); 