#!/usr/bin/env node
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Arbitrum Sepolia contract addresses
const TESTNET_BUILDERS_CONTRACT = '0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a';
const TESTNET_MOR_TOKEN = '0x34a285A1B1C166420Df5b6630132542923B5b27E';

// Simplified ABI for the Builders Contract
const BUILDERS_CONTRACT_ABI = [
  "function createBuilderPool(bytes32 id, string name, string description, address adminAddress, uint256 startTime, bool areDepositsLocked, bool areBuilderRewardsStaked, uint256 minDeposit) external",
  "function builderPools(bytes32 id) external view returns (bytes32 id, string name, string description, address adminAddress, uint256 startTime, bool areDepositsLocked, bool areBuilderRewardsStaked, uint256 minDeposit, bool isActive)",
  "function getPoolCount() external view returns (uint256)"
];

async function main() {
  try {
    console.log('🔄 Debugging contract interaction on Arbitrum Sepolia...');
    
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
    console.log('🔑 Private key format check: ' + privateKey.substring(0, 6) + '...' + privateKey.substring(privateKey.length - 4));

    // Connect to Arbitrum Sepolia
    console.log('\n🔄 Connecting to Arbitrum Sepolia testnet...');
    const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`🔑 Using wallet address: ${wallet.address}`);

    // Initialize the builders contract
    const buildersContract = new ethers.Contract(
      TESTNET_BUILDERS_CONTRACT,
      BUILDERS_CONTRACT_ABI,
      wallet
    );

    // Try to get the pool count - a simple read operation
    try {
      console.log('🔄 Checking if contract is accessible with a read operation...');
      const poolCount = await buildersContract.getPoolCount();
      console.log(`✅ Contract is accessible. Current pool count: ${poolCount}`);
    } catch (error) {
      console.error('❌ Error reading from contract. The contract might not be deployed at this address or might not have this function:', error);
      console.log('Please verify the contract address and ABI are correct.');
      
      // Let's check if we can access the contract at all
      console.log('\n🔄 Checking if the contract exists at the specified address...');
      const code = await provider.getCode(TESTNET_BUILDERS_CONTRACT);
      if (code === '0x') {
        console.error('❌ No contract deployed at this address');
      } else {
        console.log('✅ Contract exists at this address. Code length:', (code.length - 2) / 2, 'bytes');
        console.log('The ABI might be incorrect or the function might not exist.');
      }
    }

    // Check if the contract has deployed pools already
    console.log('\n🔄 Checking for existing subnets/pools...');
    // Let's try a hardcoded ID just to see if the function works
    const testId = ethers.id('test-subnet');
    try {
      const poolInfo = await buildersContract.builderPools(testId);
      console.log('Pool info for test ID:', poolInfo);
    } catch (error) {
      console.log('No pool found with test ID, which is expected. Function is accessible.');
    }

    // Check if we need to approve tokens first
    console.log('\n🔄 Checking if token approval is needed...');
    const morToken = new ethers.Contract(
      TESTNET_MOR_TOKEN,
      [
        "function balanceOf(address owner) external view returns (uint256)",
        "function allowance(address owner, address spender) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)"
      ],
      wallet
    );

    // Check allowance
    const allowance = await morToken.allowance(wallet.address, TESTNET_BUILDERS_CONTRACT);
    console.log(`Current allowance: ${ethers.formatEther(allowance)} MOR`);

    // Check balance
    const balance = await morToken.balanceOf(wallet.address);
    console.log(`Current balance: ${ethers.formatEther(balance)} MOR`);

    // Check if allowance is sufficient for at least 10 MOR
    const requiredAmount = ethers.utils.parseEther('10');
    
    if (allowance < requiredAmount) {
      console.log('\n🔄 Approving tokens for the contract...');
      // Approve 100 MOR to be used by the contract
      const approvalAmount = ethers.utils.parseEther('100');
      const approveTx = await morToken.approve(TESTNET_BUILDERS_CONTRACT, approvalAmount);
      console.log(`⏳ Approval transaction submitted: ${approveTx.hash}`);
      await approveTx.wait();
      console.log('✅ Token approval confirmed');
    } else {
      console.log('✅ Token allowance is sufficient');
    }

    // Now try creating a simple test subnet
    console.log('\n🔄 Attempting to create a test subnet with minimal parameters...');
    
    // Generate a unique ID
    const subnetId = ethers.id('Debug-Test-' + Date.now().toString());
    
    // Get current timestamp for testing
    const currentTime = Math.floor(Date.now() / 1000);
    const startTime = currentTime + 300; // 5 minutes from now
    
    // Log all parameters before calling
    console.log('Parameters for createBuilderPool:');
    console.log('- subnetId:', subnetId);
    console.log('- name: Debug Test Subnet');
    console.log('- description: Test subnet for debugging');
    console.log('- adminAddress:', wallet.address);
    console.log('- startTime:', startTime, `(${new Date(startTime * 1000).toLocaleString()})`);
    console.log('- areDepositsLocked: false');
    console.log('- areBuilderRewardsStaked: true');
    console.log('- minDeposit:', ethers.formatEther(requiredAmount), 'MOR');

    try {
      const tx = await buildersContract.createBuilderPool(
        subnetId,
        'Debug Test Subnet',
        'Test subnet for debugging',
        wallet.address,
        startTime,
        false, // areDepositsLocked
        true,  // areBuilderRewardsStaked
        requiredAmount
      );
      
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);
      
      console.log('\n🎉 Subnet registered successfully!');
    } catch (error) {
      console.error('❌ Error creating subnet:', error);
      
      // Try to extract more details about the error
      if (error instanceof Error) {
        console.log('\nError details:');
        console.log('- Message:', error.message);
        
        // Check if it's a specific ethers error
        if ('code' in error) {
          console.log('- Error code:', (error as any).code);
        }
        
        // Log transaction details if available
        if ('transaction' in error) {
          console.log('- Transaction:', (error as any).transaction);
        }
        
        // Try to check if gas estimation is the issue
        try {
          console.log('\n🔄 Trying to estimate gas for the transaction...');
          const gasEstimate = await provider.estimateGas({
            to: TESTNET_BUILDERS_CONTRACT,
            from: wallet.address,
            value: 0,
            data: buildersContract.interface.encodeFunctionData('createBuilderPool', [
              subnetId,
              'Debug Test Subnet',
              'Test subnet for debugging',
              wallet.address,
              startTime,
              false,
              true,
              requiredAmount
            ])
          });
          console.log('Gas estimate:', gasEstimate.toString());
        } catch (gasError) {
          console.error('❌ Gas estimation failed:', gasError);
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