#!/usr/bin/env node
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import * as fs from 'fs';
import { BuildersClient } from '../src/staking/BuildersClient';
import { getChecksumAddress } from '../src/utils/addressUtils';

// Load environment variables
dotenv.config();

// Constants
const MOR_TOKEN_ADDRESS = getChecksumAddress(process.env.MOR_TOKEN_ADDRESS || "0x34a285A1B1C166420Df5b6630132542923B5b27E");
const BUILDERS_CONTRACT_ADDRESS = getChecksumAddress(process.env.BUILDERS_CONTRACT_ADDRESS || "0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a");
const DEFAULT_CONFIG_PATH = 'config/deposit-config.json';

/**
 * Load configuration from file
 */
function loadConfig(configPath = DEFAULT_CONFIG_PATH): any {
    try {
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);
            console.log("🔍 Deposit configuration loaded successfully!");
            return config;
        }
    } catch (error) {
        console.error(`Error loading configuration from ${configPath}:`, error);
    }
    return null;
}

/**
 * Create a sample configuration file if it doesn't exist
 */
function createSampleConfig() {
    const configDir = 'config';
    
    // Create config directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Sample configuration
    const sampleConfig = {
        poolId: "0x4d6f72536161532054657374205375626e657400000000000000000000000000",
        subnetName: "MorSaaS Test Subnet",
        depositAmount: "10.0",
        skipPrompts: true
    };
    
    // Write sample config file
    fs.writeFileSync(DEFAULT_CONFIG_PATH, JSON.stringify(sampleConfig, null, 2), 'utf8');
    console.log(`✅ Sample deposit configuration created at ${DEFAULT_CONFIG_PATH}`);
    console.log('Please edit this file with your details and run the script again.');
}

/**
 * Main function to deposit MOR tokens to a subnet
 */
async function depositToSubnet() {
    try {
        // Check if config file exists and load it
        let config = loadConfig();
        let skipPrompts = false;
        
        // Create sample config if none exists
        if (!config) {
            console.log("⚠️ No configuration file found. Creating a sample configuration.");
            createSampleConfig();
            return;
        }
        
        skipPrompts = config.skipPrompts === true;
        console.log("🔄 Using configuration from file:", DEFAULT_CONFIG_PATH);
        
        // Validate environment variables
        if (!process.env.PRIVATE_KEY) {
            console.error("❌ PRIVATE_KEY environment variable is required!");
            return;
        }
        
        // Setup provider and wallet
        let buildersClient: BuildersClient;
        let walletAddress: string;
        
        // Connect to Arbitrum Sepolia testnet
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc");
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
        walletAddress = wallet.address;
        
        // Create the BuildersClient instance
        buildersClient = new BuildersClient(
            provider, 
            wallet,
            BUILDERS_CONTRACT_ADDRESS,
            MOR_TOKEN_ADDRESS
        );
        
        // Get deposit details from config or prompt
        const poolId = config.poolId || await promptUser("Enter subnet ID: ");
        const depositAmount = config.depositAmount || await promptUser("Enter deposit amount in MOR: ");
        
        // Check pool info
        try {
            console.log(`\n🔍 Getting subnet information...`);
            const poolInfo = await buildersClient.getPoolInfo(poolId);
            
            console.log(`\n📊 Subnet Details:`);
            console.log(`Name: ${poolInfo.name}`);
            console.log(`Admin: ${poolInfo.admin}`);
            console.log(`Minimum Deposit: ${poolInfo.minimalDeposit.formatted} MOR`);
            
            // Check if deposit amount meets minimum
            if (parseFloat(depositAmount) < parseFloat(poolInfo.minimalDeposit.formatted)) {
                console.error(`❌ Deposit amount (${depositAmount} MOR) is less than the minimum required (${poolInfo.minimalDeposit.formatted} MOR).`);
                return;
            }
        } catch (error) {
            console.error(`❌ Error getting subnet information:`, error);
            return;
        }
        
        // Display deposit details
        console.log(`\n💰 Deposit Details:`);
        console.log(`Amount: ${depositAmount} MOR`);
        console.log(`From: ${walletAddress}`);
        console.log(`To Subnet: ${config.subnetName || poolId}`);
        
        // Skip confirmation if skipPrompts is true
        if (!skipPrompts) {
            const confirm = await promptUser("\n⚠️ Do you want to proceed with the deposit? (yes/no): ");
            if (confirm.toLowerCase() !== 'yes') {
                console.log("❌ Deposit cancelled!");
                return;
            }
        } else {
            console.log("\n🔄 Skipping confirmation prompt as skipPrompts is set to true");
        }
        
        console.log(`\n🔗 Connecting to Arbitrum Sepolia testnet RPC at ${process.env.RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc"}`);
        console.log(`📝 Using wallet address: ${walletAddress}`);
        
        // Check MOR token balance
        const morBalance = await buildersClient.getMorBalance();
        console.log(`💰 MOR Token Balance: ${ethers.formatEther(morBalance)} MOR`);
        
        // Check if balance is sufficient
        if (morBalance < ethers.parseEther(depositAmount)) {
            console.error(`❌ Insufficient MOR balance. You have ${ethers.formatEther(morBalance)} MOR, but trying to deposit ${depositAmount} MOR`);
            return;
        }
        
        // Check if we need to approve MOR tokens
        const allowance = await buildersClient.getMorAllowance();
        console.log(`🔓 Current MOR allowance for builders contract: ${ethers.formatEther(allowance)} MOR`);
        
        if (allowance < ethers.parseEther(depositAmount)) {
            console.log(`\n🔄 Approving MOR token usage...`);
            const approveTx = await buildersClient.approveMorTokens("1000.0"); // Approve a large amount to avoid future approvals
            console.log(`✅ Approval transaction sent: ${approveTx.hash}`);
            await approveTx.wait();
            console.log(`✅ MOR tokens approved successfully!`);
        }
        
        // Perform the deposit
        console.log(`\n🔄 Depositing ${depositAmount} MOR to the subnet...`);
        try {
            const depositTx = await buildersClient.deposit(poolId, depositAmount);
            console.log(`✅ Deposit transaction sent: ${depositTx.hash}`);
            
            // Wait for transaction confirmation
            const receipt = await depositTx.wait();
            console.log(`✅ Deposit completed successfully!`);
            
            // Check updated user data
            const userData = await buildersClient.getUserData(walletAddress, poolId);
            console.log(`\n📊 Updated Staking Data:`);
            console.log(`Total Staked: ${userData.deposited.formatted} MOR`);
            console.log(`Last Deposit: ${userData.lastDeposit.date.toLocaleString()}`);
            
            console.log(`\n🔍 View transaction on Arbitrum Sepolia explorer: https://sepolia.arbiscan.io/tx/${depositTx.hash}`);
            
            return depositTx;
        } catch (error: any) {
            console.error("❌ Error depositing to subnet:", error.message || error);
            if (error.info?.error?.message) {
                console.error("Contract error details:", error.info.error.message);
            }
            throw error;
        }
    } catch (error) {
        console.error("❌ Error in depositToSubnet:", error);
    } finally {
        // Close readline interface if it was created
        if (rl) {
            rl.close();
        }
    }
}

// Create readline interface for user input
let rl: readline.Interface | null = null;

/**
 * Prompt the user for input
 */
function promptUser(question: string): Promise<string> {
    if (!rl) {
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    
    return new Promise((resolve) => {
        rl!.question(question, (answer) => {
            resolve(answer);
        });
    });
}

// Run the script
depositToSubnet().catch(console.error); 