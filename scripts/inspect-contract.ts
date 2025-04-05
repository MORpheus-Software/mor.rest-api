#!/usr/bin/env node
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Constants
const TESTNET_BUILDERS_CONTRACT = '0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a';
const TESTNET_MOR_TOKEN = '0x34a285A1B1C166420Df5b6630132542923B5b27E';

async function main() {
  try {
    console.log('🔄 Inspecting contract interface on Arbitrum Sepolia...');
    
    // Connect to Arbitrum Sepolia
    console.log('\n🔄 Connecting to Arbitrum Sepolia testnet...');
    const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
    
    // Create a read-only contract instance (no signer)
    console.log('\n🔄 Creating contract instance...');
    
    // Check contract code
    const code = await provider.getCode(TESTNET_BUILDERS_CONTRACT);
    console.log(`Contract bytecode length: ${code.length} bytes`);
    
    if (code === '0x') {
      console.error('❌ No contract deployed at this address');
      return;
    }
    
    // Try to identify contract functions through function signatures
    console.log('\n🔄 Identifying contract functions...');
    
    // Common function signatures for ERC20 interactions
    const functionSignatures = {
      // Basic ERC20 functions
      '0x06fdde03': 'name()',
      '0x95d89b41': 'symbol()',
      '0x18160ddd': 'totalSupply()',
      '0x70a08231': 'balanceOf(address)',
      '0xa9059cbb': 'transfer(address,uint256)',
      '0x23b872dd': 'transferFrom(address,address,uint256)',
      '0x095ea7b3': 'approve(address,uint256)',
      '0xdd62ed3e': 'allowance(address,address)',
      
      // Potential pool creation functions
      '0x2525b3b5': 'createBuilderPool(string,address,uint256,uint256,uint256,uint256)',
      '0xbd12d3f0': 'createPool(string,address,uint256,bool,bool,uint256)',
      '0xc8936e53': 'getPoolId(string)',
      '0xf23a6e61': 'deposit(bytes32,uint256)',
      '0x2e1a7d4d': 'withdraw(uint256)',
      '0x853828b6': 'withdrawAll()',
      '0x4e71d92d': 'claim()',
      
      // Admin functions
      '0x8da5cb5b': 'owner()',
      '0x715018a6': 'renounceOwnership()',
      '0xf2fde38b': 'transferOwnership(address)',
      '0x5c975abb': 'paused()',
      '0x8456cb59': 'pause()',
      '0x3f4ba83a': 'unpause()',
    };
    
    // Check which function selectors are in the bytecode
    const identifiedFunctions = [];
    
    for (const [selector, funcName] of Object.entries(functionSignatures)) {
      if (code.includes(selector.substring(2))) {
        identifiedFunctions.push(`${funcName} (${selector})`);
      }
    }
    
    if (identifiedFunctions.length > 0) {
      console.log('Potential functions identified in bytecode:');
      identifiedFunctions.forEach(func => console.log(`- ${func}`));
    } else {
      console.log('No standard functions identified in bytecode.');
    }
    
    // Try to call some view functions to see if they work
    const viewFunctionTests = [
      { signature: 'function name() external view returns (string)', name: 'name()' },
      { signature: 'function symbol() external view returns (string)', name: 'symbol()' },
      { signature: 'function owner() external view returns (address)', name: 'owner()' },
      { signature: 'function paused() external view returns (bool)', name: 'paused()' },
      { signature: 'function getPoolCount() external view returns (uint256)', name: 'getPoolCount()' },
    ];
    
    console.log('\n🔄 Testing common view functions...');
    
    for (const func of viewFunctionTests) {
      try {
        const contract = new ethers.Contract(
          TESTNET_BUILDERS_CONTRACT,
          [func.signature],
          provider
        );
        
        const result = await contract[func.name.split('(')[0]]();
        console.log(`✅ ${func.name} => ${result}`);
      } catch (error) {
        console.log(`❌ ${func.name} => Not supported`);
      }
    }
    
    // Try to find more information about the contract using a custom ABI based on the Morpheus docs
    console.log('\n🔄 Testing contract with possible ABI...');
    
    const possibleABI = [
      "function name() external view returns (string)",
      "function symbol() external view returns (string)",
      "function getPoolId(string) external pure returns (bytes32)",
      "function createBuilderPool(string, address, uint256, uint256, uint256, uint256) external",
      "function builderPools(bytes32) external view returns (bytes32, string, address, uint256, uint256, uint256, uint256, uint256, bool)",
      "function getPoolCount() external view returns (uint256)",
      "function deposit(bytes32, uint256) external",
      "function withdraw(bytes32, uint256) external",
      "function getCurrentBuilderReward(bytes32) external view returns (uint256)",
      "function claim(bytes32, address) external"
    ];
    
    const contract = new ethers.Contract(TESTNET_BUILDERS_CONTRACT, possibleABI, provider);
    
    // Try to call getPoolId with a test name
    try {
      const testPoolName = "TestPool";
      const poolId = await contract.getPoolId(testPoolName);
      console.log(`✅ getPoolId("${testPoolName}") => ${poolId}`);
      
      // Now try to get info about this pool
      try {
        const poolInfo = await contract.builderPools(poolId);
        console.log(`Pool Info for "${testPoolName}":`);
        console.log(`- ID: ${poolInfo[0]}`);
        console.log(`- Name: ${poolInfo[1]}`);
        console.log(`- Admin: ${poolInfo[2]}`);
        console.log(`- Pool Start: ${poolInfo[3]}`);
        console.log(`- Withdraw Lock Period: ${poolInfo[4]}`);
        console.log(`- Claim Lock End: ${poolInfo[5]}`);
        console.log(`- Min Deposit: ${ethers.formatEther(poolInfo[6])}`);
        console.log(`- Total Deposit: ${ethers.formatEther(poolInfo[7])}`);
        console.log(`- Active: ${poolInfo[8]}`);
      } catch (error) {
        console.log(`❌ Failed to get pool info: ${(error as Error).message}`);
      }
    } catch (error) {
      console.log(`❌ getPoolId failed: ${(error as Error).message}`);
    }
    
    // Try to get pool count
    try {
      const poolCount = await contract.getPoolCount();
      console.log(`✅ getPoolCount() => ${poolCount}`);
    } catch (error) {
      console.log(`❌ getPoolCount failed: ${(error as Error).message}`);
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