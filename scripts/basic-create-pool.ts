#!/usr/bin/env node
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Constants
const TESTNET_BUILDERS_CONTRACT = '0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a';
const TESTNET_MOR_TOKEN = '0x34a285A1B1C166420Df5b6630132542923B5b27E';

// Simplified ABI based on the Morpheus Builder Guide
const SIMPLIFIED_ABI = [
  "function owner() external view returns (address)",
  "function getPoolId(string builderPoolName_) external pure returns (bytes32)",
  // This is the potentially correct function signature based on the Morpheus docs
  "function createBuilderPool(string name, address admin, uint256 poolStart, uint256 withdrawLockPeriodAfterDeposit, uint256 claimLockEnd, uint256 minimalDeposit) external",
  // ERC20 token approval functions
  "function balanceOf(address owner) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)"
];

async function main() {
  try {
    console.log('🔄 Basic pool creation on Arbitrum Sepolia...');
    
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
    const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`🔑 Using wallet address: ${wallet.address}`);

    // Set up basic pool parameters
    const poolName = "BasicTestPool-" + Math.floor(Math.random() * 10000);
    const adminAddress = wallet.address;
    const poolStart = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
    const withdrawLockPeriod = 1800; // 30 minutes
    const claimLockEnd = 0; // No staking of rewards
    const minimalDeposit = ethers.parseEther("1.0"); // 1 MOR

    // Calculate the pool ID
    const contractReadOnly = new ethers.Contract(
      TESTNET_BUILDERS_CONTRACT,
      SIMPLIFIED_ABI,
      provider
    );
    
    const poolId = await contractReadOnly.getPoolId(poolName);
    console.log(`\n🆔 Pool ID for "${poolName}": ${poolId}`);

    // Check MOR token balance
    const morToken = new ethers.Contract(
      TESTNET_MOR_TOKEN,
      SIMPLIFIED_ABI,
      wallet
    );
    
    const balance = await morToken.balanceOf(wallet.address);
    console.log(`\n💰 MOR token balance: ${ethers.formatEther(balance)} MOR`);
    
    if (balance < minimalDeposit) {
      console.error('❌ Insufficient MOR tokens. Please get some testnet MOR tokens first.');
      return;
    }

    // Approve the builders contract to spend MOR tokens
    const allowance = await morToken.allowance(wallet.address, TESTNET_BUILDERS_CONTRACT);
    console.log(`\n🔐 Current MOR token allowance: ${ethers.formatEther(allowance)} MOR`);
    
    if (allowance < minimalDeposit) {
      console.log('🔄 Approving MOR tokens...');
      const approveTx = await morToken.approve(TESTNET_BUILDERS_CONTRACT, ethers.parseEther("100.0"));
      console.log(`⏳ Approval transaction submitted: ${approveTx.hash}`);
      await approveTx.wait();
      console.log('✅ Approval confirmed');
    } else {
      console.log('✅ Token allowance is sufficient');
    }

    // Initialize the builders contract
    const buildersContract = new ethers.Contract(
      TESTNET_BUILDERS_CONTRACT,
      SIMPLIFIED_ABI,
      wallet
    );

    // Log the parameters for the pool creation
    console.log('\n📋 Creating pool with the following parameters:');
    console.log(`- Name: ${poolName}`);
    console.log(`- Admin: ${adminAddress}`);
    console.log(`- Pool Start: ${new Date(poolStart * 1000).toLocaleString()} (${poolStart})`);
    console.log(`- Withdraw Lock Period: ${withdrawLockPeriod} seconds`);
    console.log(`- Claim Lock End: ${claimLockEnd === 0 ? 'No staking of rewards' : new Date(claimLockEnd * 1000).toLocaleString()}`);
    console.log(`- Minimal Deposit: ${ethers.formatEther(minimalDeposit)} MOR`);

    // Add a 10-second delay for user to cancel if needed
    console.log('\n⏱️ Waiting 10 seconds before submitting transaction...');
    console.log('Press Ctrl+C to cancel');
    
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Create the pool
    console.log('\n🔄 Creating pool...');
    
    try {
      // Try estimating gas first to see if the transaction would succeed
      const gasEstimate = await buildersContract.createBuilderPool.estimateGas(
        poolName,
        adminAddress,
        poolStart,
        withdrawLockPeriod,
        claimLockEnd,
        minimalDeposit
      );
      
      console.log(`✅ Gas estimation successful: ${gasEstimate.toString()}`);
      
      // Now actually send the transaction
      const tx = await buildersContract.createBuilderPool(
        poolName,
        adminAddress,
        poolStart,
        withdrawLockPeriod,
        claimLockEnd,
        minimalDeposit,
        {
          gasLimit: Math.floor(Number(gasEstimate) * 1.2) // Add 20% buffer for gas
        }
      );
      
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      console.log(`🔗 Transaction URL: https://sepolia.arbiscan.io/tx/${tx.hash}`);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);
      
      console.log(`\n🎉 Pool "${poolName}" created successfully with ID: ${poolId}`);
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