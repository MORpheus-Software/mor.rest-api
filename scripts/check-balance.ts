#!/usr/bin/env node
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Arbitrum Sepolia contract addresses
const TESTNET_MOR_TOKEN = '0x34a285A1B1C166420Df5b6630132542923B5b27E';

// Simplified ABI for ERC20 Token
const ERC20_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)"
];

async function main() {
  try {
    console.log('🔄 Checking wallet balance on Arbitrum Sepolia...');
    
    // Check if required environment variables are set
    if (!process.env.PRIVATE_KEY) {
      console.error('❌ PRIVATE_KEY environment variable is not set');
      console.log('Please create a .env file with your PRIVATE_KEY');
      return;
    }

    // RPC URLs for Arbitrum Sepolia
    const rpcUrl = 'https://sepolia-rollup.arbitrum.io/rpc';
    
    // Connect to provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
    console.log(`🔑 Wallet address: ${wallet.address}`);

    // Check ETH balance
    const ethBalance = await provider.getBalance(wallet.address);
    console.log(`💰 ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    // Exit if ETH balance is zero
    if (ethBalance.toString() === '0') {
      console.error('❌ Your wallet has 0 ETH. You need ETH to pay for gas.');
      console.log('Please get Arbitrum Sepolia ETH from a faucet: https://www.alchemy.com/faucets/arbitrum-sepolia');
      return;
    }
    
    // Check MOR token balance
    try {
      const morToken = new ethers.Contract(TESTNET_MOR_TOKEN, ERC20_ABI, provider);
      const symbol = await morToken.symbol();
      const tokenBalance = await morToken.balanceOf(wallet.address);
      const decimals = await morToken.decimals();
      
      console.log(`💰 ${symbol} balance: ${ethers.formatUnits(tokenBalance, decimals)} ${symbol}`);
      
      // Check if MOR balance is too low for subnet registration
      if (tokenBalance.toString() === '0') {
        console.error(`❌ Your wallet has 0 ${symbol} tokens.`);
        console.log('You need MOR tokens to register a subnet. Check MOR Discord for testnet token requests.');
      }
    } catch (error) {
      console.error('❌ Error checking token balance:', error);
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