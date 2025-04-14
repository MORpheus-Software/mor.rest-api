#!/usr/bin/env node
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Check if in mock/demo mode
const MOCK_MODE = process.env.VITE_USE_MOCK_DATA === 'true';

// Arbitrum Sepolia contract addresses
const TESTNET_BUILDERS_CONTRACT = '0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a';
const TESTNET_MOR_TOKEN = '0x34a285A1B1C166420Df5b6630132542923B5b27E';

// Config file path
const CONFIG_DIR = path.join(process.cwd(), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'subnet-config.json');

// Simplified ABI for the Builders Contract
const BUILDERS_CONTRACT_ABI = [
  "function stake(bytes32 poolId, uint256 amount) external returns (bool)",
  "function builderPools(bytes32 id) external view returns (bytes32 id, string name, string description, address adminAddress, uint256 startTime, bool areDepositsLocked, bool areBuilderRewardsStaked, uint256 minDeposit, bool isActive)"
];

// Simplified ABI for ERC20 Token
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify the question method
const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
};

// Get registered subnets from config file
const getRegisteredSubnets = (): any[] => {
  if (!fs.existsSync(CONFIG_FILE)) {
    return [];
  }
  
  try {
    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData);
    return config.subnets || [];
  } catch (error) {
    console.error('Error reading subnet configuration:', error);
    return [];
  }
};

// Display list of registered subnets
const displaySubnets = (subnets: any[]) => {
  if (subnets.length === 0) {
    console.log('❌ No registered subnets found.');
    return false;
  }
  
  console.log('\n📋 Registered Subnets:');
  subnets.forEach((subnet, index) => {
    console.log(`${index + 1}. ${subnet.name} (${subnet.id.substring(0, 8)}...${subnet.id.substring(subnet.id.length - 6)})`);
    console.log(`   Min Deposit: ${subnet.minDeposit} MOR, Active: ${subnet.isActive ? 'Yes' : 'No'}`);
  });
  console.log('');
  return true;
};

// Mock functions for demo mode
const mockNetworkConnection = async () => {
  console.log('🔄 [MOCK] Connecting to Arbitrum Sepolia testnet...');
  console.log('✅ [MOCK] Connected to RPC: https://sepolia-rollup.arbitrum.io/rpc');
  return true;
};

const mockVerifySubnet = async (subnetId: string) => {
  console.log('🔄 [MOCK] Verifying subnet exists...');
  console.log('\n📋 [MOCK] Subnet information:');
  console.log(`Name: TestSubnet`);
  console.log(`Description: A test subnet for development`);
  console.log(`Admin: 0x1234567890abcdef1234567890abcdef12345678`);
  console.log(`Min Deposit: 10.0 MOR`);
  console.log(`Active: true`);
  return true;
};

const mockTokenBalance = async () => {
  console.log('\n🔄 [MOCK] Checking MOR token balance...');
  console.log(`[MOCK] MOR Balance: 1000.0 MOR`);
  return true;
};

const mockApproveTokens = async () => {
  console.log('\n🔄 [MOCK] Checking token allowance...');
  console.log('🔄 [MOCK] Approving tokens for staking...');
  console.log(`⏳ [MOCK] Approval transaction submitted: 0xmocktxhash123456789`);
  console.log('⏳ [MOCK] Waiting for confirmation...');
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second mock delay
  console.log('✅ [MOCK] Approval confirmed!');
  return true;
};

const mockStakeTokens = async (subnetId: string, amount: string) => {
  console.log('\n🔄 [MOCK] Staking tokens to subnet...');
  console.log(`⏳ [MOCK] Transaction submitted: 0xmocktxhash987654321`);
  console.log('⏳ [MOCK] Waiting for confirmation...');
  await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second mock delay
  console.log(`✅ [MOCK] Transaction confirmed in block 12345678`);
  
  console.log('\n🎉 [MOCK] Successfully staked to subnet!');
  console.log('----------------------------------');
  console.log(`Amount: ${amount} MOR`);
  console.log(`Subnet ID: ${subnetId}`);
  console.log(`Transaction: https://sepolia.arbiscan.io/tx/0xmocktxhash987654321`);
  console.log('----------------------------------');
  console.log('You can view your stake on the MOR dashboard: https://dashboard.mor.org/#/builders?network=testnet');
  return true;
};

async function main() {
  try {
    console.log('🔄 Subnet Staking Script for Arbitrum Sepolia Testnet 🔄');
    
    if (MOCK_MODE) {
      console.log('⚠️ Running in MOCK/DEMO mode - no actual transactions will be made ⚠️');
    }

    // Check if required environment variables are set
    if (!process.env.PRIVATE_KEY) {
      console.error('❌ PRIVATE_KEY environment variable is not set');
      console.log('Please create a .env file with your PRIVATE_KEY');
      return;
    }

    // Get registered subnets
    const subnets = getRegisteredSubnets();
    const hasRegisteredSubnets = displaySubnets(subnets);
    
    // Get subnet ID
    let subnetId = "";
    if (hasRegisteredSubnets) {
      const selection = await question('Enter subnet number or enter a custom subnet ID: ');
      
      // Check if selection is a number (index) or a subnet ID
      const index = parseInt(selection);
      if (!isNaN(index) && index > 0 && index <= subnets.length) {
        // User selected from the list
        subnetId = subnets[index - 1].id;
        console.log(`Selected subnet: ${subnets[index - 1].name} (${subnetId})`);
      } else {
        // User entered a custom ID
        subnetId = selection;
      }
    } else {
      // No registered subnets, ask for subnet ID
      subnetId = await question('Enter subnet ID (bytes32 hash): ');
    }
    
    // Get amount to stake
    let stakeAmount = await question('Enter amount to stake (in MOR tokens): ');
    
    // Default to 10 MOR if no amount provided
    if (!stakeAmount) {
      stakeAmount = '10';
      console.log(`Using default amount: ${stakeAmount} MOR`);
    }

    // If in mock mode, use mock functions
    if (MOCK_MODE) {
      await mockNetworkConnection();
      await mockVerifySubnet(subnetId);
      await mockTokenBalance();
      
      // Confirm staking
      const confirmInput = await question(`\nConfirm staking ${stakeAmount} MOR to subnet ID ${subnetId}? (y/n): `);
      if (confirmInput.toLowerCase() !== 'y') {
        console.log('❌ Staking cancelled');
        rl.close();
        return;
      }
      
      await mockApproveTokens();
      await mockStakeTokens(subnetId, stakeAmount);
      rl.close();
      return;
    }

    // Connect to Arbitrum Sepolia
    console.log('\n🔄 Connecting to Arbitrum Sepolia testnet...');
    
    // RPC URLs for Arbitrum Sepolia
    const rpcUrls = [
      'https://sepolia-rollup.arbitrum.io/rpc',
      'https://arbitrum-sepolia.blockpi.network/v1/rpc/public',
      'https://arbitrum-sepolia.public.blastapi.io',
      'https://421614.rpc.thirdweb.com'
    ];
    
    // Try to connect using multiple RPC URLs in case one fails
    let provider;
    for (const rpcUrl of rpcUrls) {
      try {
        provider = new ethers.JsonRpcProvider(rpcUrl);
        await provider.getBlockNumber(); // Test the connection
        console.log(`✅ Connected to RPC: ${rpcUrl}`);
        break;
      } catch (error) {
        console.log(`⚠️ Failed to connect to RPC: ${rpcUrl}`);
      }
    }
    
    if (!provider) {
      console.error('❌ Failed to connect to any RPC endpoint');
      rl.close();
      return;
    }

    // Create wallet from private key
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
    console.log(`🔑 Using wallet address: ${wallet.address}`);

    // Initialize the builders contract
    const buildersContract = new ethers.Contract(
      TESTNET_BUILDERS_CONTRACT,
      BUILDERS_CONTRACT_ABI,
      wallet
    );
    
    // Initialize the MOR token contract
    const morToken = new ethers.Contract(
      TESTNET_MOR_TOKEN,
      ERC20_ABI,
      wallet
    );

    // Verify that the subnet exists
    console.log('🔄 Verifying subnet exists...');
    try {
      const subnetInfo = await buildersContract.builderPools(subnetId);
      if (!subnetInfo[0] || subnetInfo[0] === ethers.ZeroHash) {
        console.error('❌ Subnet not found with ID:', subnetId);
        rl.close();
        return;
      }
      
      console.log('\n📋 Subnet information:');
      console.log(`Name: ${subnetInfo[1]}`);
      console.log(`Description: ${subnetInfo[2]}`);
      console.log(`Admin: ${subnetInfo[3]}`);
      console.log(`Min Deposit: ${ethers.formatEther(subnetInfo[7])} MOR`);
      console.log(`Active: ${subnetInfo[8]}`);
      
      // Check if the minimum deposit requirement is met
      const minDeposit = Number(ethers.formatEther(subnetInfo[7]));
      const userAmount = Number(stakeAmount);
      if (userAmount < minDeposit) {
        console.error(`❌ Amount to stake (${userAmount} MOR) is less than the minimum deposit requirement (${minDeposit} MOR)`);
        rl.close();
        return;
      }
    } catch (error) {
      console.error('❌ Error verifying subnet:', error);
      rl.close();
      return;
    }

    // Check MOR token balance
    console.log('\n🔄 Checking MOR token balance...');
    const balance = await morToken.balanceOf(wallet.address);
    const formattedBalance = ethers.formatEther(balance);
    console.log(`MOR Balance: ${formattedBalance} MOR`);
    
    const amountToStakeWei = ethers.utils.parseEther(stakeAmount);
    if (balance < amountToStakeWei) {
      console.error(`❌ Insufficient MOR token balance. You need at least ${stakeAmount} MOR.`);
      rl.close();
      return;
    }

    // Check allowance and approve if needed
    console.log('\n🔄 Checking token allowance...');
    const allowance = await morToken.allowance(wallet.address, TESTNET_BUILDERS_CONTRACT);
    
    if (allowance < amountToStakeWei) {
      console.log('🔄 Approving tokens for staking...');
      const approveTx = await morToken.approve(TESTNET_BUILDERS_CONTRACT, amountToStakeWei);
      console.log(`⏳ Approval transaction submitted: ${approveTx.hash}`);
      console.log('⏳ Waiting for confirmation...');
      await approveTx.wait();
      console.log('✅ Approval confirmed!');
    } else {
      console.log('✅ Token allowance already sufficient.');
    }

    // Confirm staking
    const confirmInput = await question(`\nConfirm staking ${stakeAmount} MOR to subnet ID ${subnetId}? (y/n): `);
    if (confirmInput.toLowerCase() !== 'y') {
      console.log('❌ Staking cancelled');
      rl.close();
      return;
    }

    // Stake tokens
    console.log('\n🔄 Staking tokens to subnet...');
    const stakeTx = await buildersContract.stake(subnetId, amountToStakeWei);
    
    console.log(`⏳ Transaction submitted: ${stakeTx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    // Wait for the transaction to be mined
    const receipt = await stakeTx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);
    
    console.log('\n🎉 Successfully staked to subnet!');
    console.log('----------------------------------');
    console.log(`Amount: ${stakeAmount} MOR`);
    console.log(`Subnet ID: ${subnetId}`);
    console.log(`Transaction: https://sepolia.arbiscan.io/tx/${stakeTx.hash}`);
    console.log('----------------------------------');
    console.log('You can view your stake on the MOR dashboard: https://dashboard.mor.org/#/builders?network=testnet');

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