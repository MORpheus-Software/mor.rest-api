#!/usr/bin/env node
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

const DEMO_MODE = process.env.DEMO_MODE === "true";

// Helper function to get checksum address
function getChecksumAddress(address: string): string {
    try {
        return ethers.getAddress(address);
    } catch (error) {
        return address;
    }
}

const MOR_TOKEN_ADDRESS = getChecksumAddress(process.env.MOR_TOKEN_ADDRESS || "0x34a285A1B1C166420Df5b6630132542923B5b27E");
const BUILDERS_CONTRACT_ADDRESS = getChecksumAddress(process.env.BUILDERS_CONTRACT_ADDRESS || "0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a");

// Default config path
const DEFAULT_CONFIG_PATH = 'config/registration-config.json';

// ABIs for the Builders Contract and MOR token
const BUILDERS_CONTRACT_ABI = [
    // Pool creation and management
    "function createBuilderPool(string name, address admin, uint256 poolStart, uint256 withdrawLockPeriodAfterDeposit, uint256 claimLockEnd, uint256 minimalDeposit) external",
    "function editBuilderPool(string name, uint256 poolStart, uint256 withdrawLockPeriodAfterDeposit, uint256 claimLockEnd, uint256 minimalDeposit) external",
    "function getPoolId(string builderPoolName_) external pure returns (bytes32)",
    "function builderPools(bytes32 builderPoolId_) external view returns (bytes32 id, string name, address admin, uint256 poolStart, uint256 withdrawLockPeriodAfterDeposit, uint256 claimLockEnd, uint256 minimalDeposit, uint256 totalDeposit, bool active)",
    
    // Deposit and withdrawal
    "function deposit(bytes32 builderPoolId_, uint256 amount_) external",
    "function withdraw(bytes32 builderPoolId_, uint256 amount_) external",
    
    // User data
    "function usersData(address user, bytes32 builderPoolId) external view returns (uint256 deposited, uint256 lastDepositTime)"
];

// Simplified ERC20 ABI for the MOR token
const MOR_TOKEN_ABI = [
    "function balanceOf(address owner) external view returns (uint256)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)"
];

// BuildersClient class implementation 
class BuildersClient {
    provider: ethers.Provider;
    signer: ethers.Signer;
    buildersContract: ethers.Contract;
    morToken: ethers.Contract;
    
    constructor(provider: ethers.Provider, signer: ethers.Signer, buildersContractAddress: string, morTokenAddress: string) {
        this.provider = provider;
        this.signer = signer;
        this.buildersContract = new ethers.Contract(buildersContractAddress, BUILDERS_CONTRACT_ABI, signer);
        this.morToken = new ethers.Contract(morTokenAddress, MOR_TOKEN_ABI, signer);
    }
    
    async getPoolId(name: string): Promise<string> {
        return await this.buildersContract.getPoolId(name);
    }
    
    async getMorBalance(address: string): Promise<string> {
        const balance = await this.morToken.balanceOf(address);
        return ethers.formatEther(balance);
    }
    
    async getMorAllowance(address: string): Promise<string> {
        const allowance = await this.morToken.allowance(address, this.buildersContract.target);
        return ethers.formatEther(allowance);
    }
    
    async approveMorTokens(amount: string) {
        const amountWei = ethers.utils.parseEther(amount);
        return await this.morToken.approve(this.buildersContract.target, amountWei);
    }
    
    async createBuilderPool(name: string, admin: string, poolStart: number, withdrawLockPeriod: number, claimLockEnd: number, minimalDeposit: string) {
        const minimalDepositWei = ethers.utils.parseEther(minimalDeposit);
        const tx = await this.buildersContract.createBuilderPool(
            name, admin, poolStart, withdrawLockPeriod, claimLockEnd, minimalDepositWei
        );
        const poolId = await this.getPoolId(name);
        return { transaction: tx, poolId };
    }
    
    async deposit(poolId: string, amount: string) {
        const amountWei = ethers.utils.parseEther(amount);
        return await this.buildersContract.deposit(poolId, amountWei);
    }
}

// Mock client for demo mode
class MockBuildersClient {
    async getPoolId(name: string): Promise<string> {
        return ethers.keccak256(ethers.toUtf8Bytes(name));
    }
    
    async getMorBalance(): Promise<string> {
        return "100.0";
    }
    
    async getMorAllowance(): Promise<string> {
        return "0.0";
    }
    
    async approveMorTokens(amount: string) {
        console.log(`Mock approve ${amount} MOR tokens`);
        return { hash: "0xmocktxhash", wait: async () => ({ status: 1 }) };
    }
    
    async createBuilderPool(name: string, admin: string, startTime: number, withdrawLockPeriod: number, claimLockEnd: number, minimalDeposit: string) {
        console.log(`Mock creating pool: ${name}`);
        const poolId = await this.getPoolId(name);
        return {
            transaction: { hash: "0xmocktxhash" },
            poolId
        };
    }
    
    async deposit(poolId: string, amount: string) {
        console.log(`Mock deposit ${amount} MOR to pool ${poolId}`);
        return { hash: "0xmocktxhash", wait: async () => ({ status: 1 }) };
    }
}

/**
 * Load configuration from file
 */
function loadConfig(configPath = DEFAULT_CONFIG_PATH): any {
    try {
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);
            console.log("🔍 Registration configuration loaded successfully!");
            return config;
        }
    } catch (error) {
        console.error(`Error loading configuration from ${configPath}:`, error);
    }
    return null;
}

/**
 * Main function to register a subnet
 */
async function registerSubnet() {
    try {
        // Check if config file exists and load it
        let config = loadConfig();
        let skipPrompts = false;
        
        if (config) {
            skipPrompts = config.skipPrompts === true;
            console.log("🔄 Using configuration from file:", DEFAULT_CONFIG_PATH);
        } else {
            console.log("⚠️ No configuration file found. Using interactive mode.");
        }
        
        // Validate environment variables
        if (!process.env.PRIVATE_KEY && !DEMO_MODE) {
            console.error("❌ PRIVATE_KEY environment variable is required!");
            return;
        }
        
        // Setup provider and wallet
        let buildersClient: BuildersClient | MockBuildersClient;
        let walletAddress: string;
        
        if (DEMO_MODE) {
            console.log("🧪 Running in DEMO mode - no actual transactions will be sent");
            buildersClient = new MockBuildersClient();
            walletAddress = "0xdemoAddress";
        } else {
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
        }
        
        // Define subnet parameters (using default values from config if available)
        const subnetName = skipPrompts ? config.subnetName : (config?.subnetName || await promptUser("Enter subnet name: "));
        const subnetDescription = skipPrompts ? config.subnetDescription : (config?.subnetDescription || await promptUser("Enter subnet description: "));
        const adminAddress = skipPrompts ? config.adminAddress : (config?.adminAddress || await promptUser(`Enter admin address (default: ${walletAddress}): `) || walletAddress);
        const startTimeStr = skipPrompts ? config.startTime : (config?.startTime || await promptUser("Enter start time as UNIX timestamp: "));
        const startTime = parseInt(startTimeStr);
        const withdrawLockPeriod = 1800; // 30 minutes minimum for testnet
        const depositsLocked = skipPrompts ? config.depositsLocked === true : (await promptUser("Are deposits locked? (yes/no): ")).toLowerCase() === 'yes';
        const builderRewardsStaked = skipPrompts ? config.builderRewardsStaked === true : (await promptUser("Are builder rewards staked? (yes/no): ")).toLowerCase() === 'yes';
        
        // Setting the claimLockEnd based on whether rewards are staked
        const claimLockEnd = builderRewardsStaked ? startTime + 3600 * 24 * 7 : 0; // 1 week after start if staked
        
        // Handle minDeposit - ensure it's a string
        let minDeposit: string;
        if (skipPrompts && config.minDeposit) {
            // If it's a number, convert to string
            minDeposit = typeof config.minDeposit === 'number' 
                ? config.minDeposit.toString() 
                : config.minDeposit;
        } else {
            minDeposit = config?.minDeposit || await promptUser("Enter minimum deposit in MOR (default: 10): ") || "10";
        }
        
        // Calculate the pool ID (this is deterministic based on the name)
        const poolId = await buildersClient.getPoolId(subnetName);
        
        // Display the subnet registration details
        console.log("\n🌐 Subnet Registration Details:");
        console.log(`ID: ${poolId}`);
        console.log(`Name: ${subnetName}`);
        console.log(`Description: ${subnetDescription}`);
        console.log(`Admin Address: ${adminAddress}`);
        console.log(`Start Time: ${new Date(startTime * 1000).toLocaleString()} (${startTime})`);
        console.log(`Deposits Locked: ${depositsLocked}`);
        console.log(`Builder Rewards Staked: ${builderRewardsStaked}`);
        console.log(`Minimum Deposit: ${minDeposit} MOR`);
        
        // Skip confirmation if skipPrompts is true
        if (!skipPrompts) {
            const confirm = await promptUser("\n⚠️ Do you want to proceed with the subnet registration? (yes/no): ");
            if (confirm.toLowerCase() !== 'yes') {
                console.log("❌ Subnet registration cancelled!");
                return;
            }
        } else {
            console.log("\n🔄 Skipping confirmation prompt as skipPrompts is set to true");
        }
        
        // Connect to the Arbitrum Sepolia testnet
        if (!DEMO_MODE) {
            console.log(`\n🔗 Connecting to Arbitrum Sepolia testnet RPC at ${process.env.RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc"}`);
            console.log(`📝 Using wallet address: ${walletAddress}`);
            
            // Check MOR token balance
            const morBalance = await buildersClient.getMorBalance(walletAddress);
            console.log(`💰 MOR Token Balance: ${morBalance} MOR`);
            
            // Check if we need to approve MOR tokens
            const allowance = await buildersClient.getMorAllowance(walletAddress);
            console.log(`🔓 Current MOR allowance for builders contract: ${allowance} MOR`);
            
            if (parseFloat(allowance) < parseFloat(minDeposit)) {
                console.log(`\n🔄 Approving MOR token usage...`);
                const approveTx = await buildersClient.approveMorTokens("1000.0"); // Approve a large amount to avoid future approvals
                console.log(`✅ Approval transaction sent: ${approveTx.hash}`);
                await approveTx.wait();
                console.log(`✅ MOR tokens approved successfully!`);
            }
        }
        
        // Create the builder pool
        console.log(`\n🔄 Creating builder pool...`);
        try {
            const result = await buildersClient.createBuilderPool(
                subnetName,
                adminAddress,
                startTime,
                withdrawLockPeriod,
                claimLockEnd,
                minDeposit
            );
            
            console.log(`✅ Subnet registration submitted! Transaction hash: ${result.transaction.hash}`);
            console.log(`🆔 Subnet ID: ${result.poolId}`);
            
            // Optional: Make initial deposit
            if (!depositsLocked && !DEMO_MODE) {
                const depositAmount = parseFloat(minDeposit) * 1.1; // Deposit slightly more than minimum
                const depositAmountStr = depositAmount.toString();
                
                if (!skipPrompts) {
                    const makeDeposit = await promptUser(`\n💸 Would you like to make an initial deposit of ${depositAmountStr} MOR? (yes/no): `);
                    
                    if (makeDeposit.toLowerCase() === 'yes') {
                        console.log(`\n🔄 Making initial deposit of ${depositAmountStr} MOR...`);
                        const depositTx = await buildersClient.deposit(result.poolId, depositAmountStr);
                        console.log(`✅ Deposit transaction sent: ${depositTx.hash}`);
                        await depositTx.wait();
                        console.log(`✅ Deposit completed successfully!`);
                    }
                } else if (config.makeInitialDeposit === true) {
                    console.log(`\n🔄 Making initial deposit of ${depositAmountStr} MOR as specified in config...`);
                    const depositTx = await buildersClient.deposit(result.poolId, depositAmountStr);
                    console.log(`✅ Deposit transaction sent: ${depositTx.hash}`);
                    await depositTx.wait();
                    console.log(`✅ Deposit completed successfully!`);
                }
            }
            
            // Provide links to view on blockchain explorer and dashboard
            console.log(`\n🔍 View your subnet on Arbitrum Sepolia explorer: https://sepolia.arbiscan.io/tx/${result.transaction.hash}`);
            console.log(`🌐 View your subnet on dashboard: https://dashboard.mor.org/#/subnet/${result.poolId}`);
            
            return result;
        } catch (error: any) {
            console.error("❌ Error registering subnet:", error.message || error);
            if (error.info?.error?.message) {
                console.error("Contract error details:", error.info.error.message);
            }
            throw error;
        }
    } catch (error) {
        console.error("❌ Error in registerSubnet:", error);
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
registerSubnet().catch(console.error); 