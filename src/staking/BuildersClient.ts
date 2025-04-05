import { ethers } from 'ethers';

// Use ethers.getAddress to ensure proper checksum format
const getChecksumAddress = (address: string): string => {
    if (!address) return "";
    try {
        return ethers.getAddress(address.toLowerCase());
    } catch (error) {
        console.error("Invalid address format:", error);
        // Return the original address if conversion fails
        return address.toLowerCase();
    }
};

// Get address from environment based on runtime context (browser or Node.js)
const getDefaultAddress = (envVar: string, fallback: string): string => {
    // In Node.js
    if (typeof process !== 'undefined' && process.env && process.env[envVar]) {
        return getChecksumAddress(process.env[envVar] as string);
    }
    // Fallback
    return getChecksumAddress(fallback);
};

// Contract addresses for networks
export const CONTRACT_ADDRESSES = {
    mainnet: {
        token: getDefaultAddress(
            'VITE_MAINNET_MOR_TOKEN_ADDRESS',
            "0x1c9491865a1de77c5b6e19d2e6a5f1d7a6f2b25f"
        ),
        builders: getDefaultAddress(
            'VITE_MAINNET_BUILDERS_CONTRACT_ADDRESS',
            "0xC0eD68f163d44B6e9985F0041fDf6f67c6BCFF3f"
        ),
        feeConfig: getDefaultAddress(
            'VITE_MAINNET_FEE_CONFIG_ADDRESS',
            ""
        ),
        treasury: getDefaultAddress(
            'VITE_MAINNET_BUILDERS_TREASURY_ADDRESS',
            ""
        )
    },
    testnet: {
        token: getDefaultAddress(
            'VITE_TESTNET_MOR_TOKEN_ADDRESS',
            "0x34a285A1B1C166420Df5b6630132542923B5b27E"
        ),
        builders: getDefaultAddress(
            'VITE_TESTNET_BUILDERS_CONTRACT_ADDRESS',
            "0xF651907Bfc6A67eCAb3E448c6C8200cD13566baA"
        ),
        feeConfig: getDefaultAddress(
            'VITE_TESTNET_FEE_CONFIG_ADDRESS',
            "0xA961F1c0A03aA601a951cf84F93492aE620Bd82A"
        ),
        treasury: getDefaultAddress(
            'VITE_TESTNET_BUILDERS_TREASURY_ADDRESS',
            "0x4e766052bdEc519cDe88C732C08835Ca3bA33Daf"
        )
    }
};

// Default builders contract address (testnet)
const DEFAULT_BUILDERS_CONTRACT_ADDRESS = CONTRACT_ADDRESSES.testnet.builders;

// Default MOR token address (testnet)
const DEFAULT_MOR_TOKEN_ADDRESS = CONTRACT_ADDRESSES.testnet.token;

// Default FeeConfig address (testnet)
const DEFAULT_FEE_CONFIG_ADDRESS = CONTRACT_ADDRESSES.testnet.feeConfig;

// Default BuildersTreasury address (testnet)
const DEFAULT_BUILDERS_TREASURY_ADDRESS = CONTRACT_ADDRESSES.testnet.treasury;

// ABIs for the Builders Contract and MOR token
const BUILDERS_CONTRACT_ABI = [
    // Pool creation and management
    "function createBuilderPool((string name, address admin, uint128 poolStart, uint128 withdrawLockPeriodAfterDeposit, uint128 claimLockEnd, uint256 minimalDeposit) builderPool_) external",
    "function editBuilderPool((string name, address admin, uint128 poolStart, uint128 withdrawLockPeriodAfterDeposit, uint128 claimLockEnd, uint256 minimalDeposit) builderPool_) external",
    "function builderPools(bytes32 builderPoolId) external view returns (string name, address admin, uint128 poolStart, uint128 withdrawLockPeriodAfterDeposit, uint128 claimLockEnd, uint256 minimalDeposit)",
    "function buildersPoolData(bytes32 builderPoolId) external view returns (uint128 lastDeposit, uint256 deposited, uint256 virtualDeposited, uint256 rate, uint256 pendingRewards)",
    
    // Deposit and withdrawal
    "function deposit(bytes32 builderPoolId_, uint256 amount_) external",
    "function withdraw(bytes32 builderPoolId_, uint256 amount_) external",
    
    // Rewards and claiming
    "function getCurrentBuilderReward(bytes32 builderPoolId_) external view returns (uint256)",
    "function claim(bytes32 builderPoolId_, address receiver_) external",
    
    // User data
    "function usersData(address user, bytes32 builderPoolId) external view returns (uint128 lastDeposit, uint128 claimLockStart, uint256 deposited, uint256 virtualDeposited)",
    
    // Other utility functions
    "function getPoolId(string memory builderPoolName_) public pure returns (bytes32)",
    "function getCurrentUserMultiplier(bytes32 builderPoolId_, address user_) external view returns (uint256)",
    "function depositToken() external view returns (address)",
    
    // Additional functions from StakingClient
    "function totalPoolData() external view returns (uint256 totalVirtualDeposited, uint256 rate, uint256 distributedRewards)"
];

// Simplified ERC20 ABI for the MOR token
const MOR_TOKEN_ABI = [
    "function balanceOf(address owner) external view returns (uint256)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)"
];

// Fee Config Contract ABI
const FEE_CONFIG_ABI = [
    "function getUserFee(address user, bytes32 operation) external view returns (uint256 fee, address treasury)",
    "function getFeeAndTreasuryForOperation(address sender, bytes32 operation) external view returns (uint256, address)"
];

// Builders Treasury Contract ABI
const BUILDERS_TREASURY_ABI = [
    "function sendRewards(address receiver, uint256 amount) external",
    "function getAllRewards() external view returns (uint256)",
    "function depositRewards(uint256 amount) external"
];

/**
 * Client for interacting with the Morpheus Builders Contract
 */
export class BuildersClient {
    provider: ethers.Provider;
    signer: ethers.Signer;
    buildersContract: ethers.Contract;
    morToken: ethers.Contract;
    feeConfig: ethers.Contract | null = null;
    buildersTreasury: ethers.Contract | null = null;
    contractAddress: string;
    tokenAddress: string;
    feeConfigAddress: string;
    treasuryAddress: string;
    networkType: 'mainnet' | 'testnet';

    /**
     * Create a new BuildersClient
     * @param provider Ethereum provider
     * @param signer Ethereum signer for transactions
     * @param buildersContractAddress Address of the Builders Contract (optional)
     * @param morTokenAddress Address of the MOR token (optional)
     * @param feeConfigAddress Address of the FeeConfig contract (optional)
     * @param treasuryAddress Address of the BuildersTreasury contract (optional)
     */
    constructor(
        provider: ethers.Provider, 
        signer: ethers.Signer,
        buildersContractAddress: string = DEFAULT_BUILDERS_CONTRACT_ADDRESS,
        morTokenAddress: string = DEFAULT_MOR_TOKEN_ADDRESS,
        feeConfigAddress: string = DEFAULT_FEE_CONFIG_ADDRESS,
        treasuryAddress: string = DEFAULT_BUILDERS_TREASURY_ADDRESS
    ) {
        this.provider = provider;
        this.signer = signer;
        this.contractAddress = buildersContractAddress.toLowerCase();
        this.tokenAddress = morTokenAddress.toLowerCase();
        this.feeConfigAddress = feeConfigAddress.toLowerCase();
        this.treasuryAddress = treasuryAddress.toLowerCase();
        
        // Determine network type based on addresses
        if (
            this.contractAddress === CONTRACT_ADDRESSES.mainnet.builders.toLowerCase() ||
            this.tokenAddress === CONTRACT_ADDRESSES.mainnet.token.toLowerCase()
        ) {
            this.networkType = 'mainnet';
        } else {
            this.networkType = 'testnet';
        }
        
        // Initialize contract instances
        this.buildersContract = new ethers.Contract(this.contractAddress, BUILDERS_CONTRACT_ABI, signer);
        this.morToken = new ethers.Contract(this.tokenAddress, MOR_TOKEN_ABI, signer);
        
        // Initialize optional contracts if addresses are provided
        if (this.feeConfigAddress) {
            this.feeConfig = new ethers.Contract(this.feeConfigAddress, FEE_CONFIG_ABI, signer);
        }
        
        if (this.treasuryAddress) {
            this.buildersTreasury = new ethers.Contract(this.treasuryAddress, BUILDERS_TREASURY_ABI, signer);
        }
    }

    /**
     * Get network type (mainnet or testnet)
     * @returns Network type string
     */
    getNetworkType(): 'mainnet' | 'testnet' {
        return this.networkType;
    }

    /**
     * Generate a pool ID for a given name
     * @param name Pool name
     * @returns Pool ID (bytes32 hex string)
     */
    getPoolId(name: string): string {
        try {
            return ethers.id(name);
        } catch (error) {
            console.error("Error generating pool ID:", error);
            throw error;
        }
    }

    /**
     * Create a new builder pool
     * @param name Name of the pool (must be unique)
     * @param adminAddress Address that will receive rewards and manage the pool
     * @param startTime UNIX timestamp when the pool should start
     * @param withdrawLockPeriod Period in seconds when users can't withdraw after depositing
     * @param claimLockEnd UNIX timestamp when the admin can claim rewards
     * @param minDeposit Minimum amount of MOR required to join (in normal units, not wei)
     * @returns Transaction receipt
     */
    async createBuilderPool(
        name: string,
        adminAddress: string,
        startTime: number,
        withdrawLockPeriod: number,
        claimLockEnd: number,
        minDeposit: string
    ) {
        try {
            // Convert minDeposit to wei
            const minDepositWei = ethers.parseEther(minDeposit);
            
            // Create the BuilderPool struct
            const builderPool = {
                name,
                admin: adminAddress,
                poolStart: startTime,
                withdrawLockPeriodAfterDeposit: withdrawLockPeriod,
                claimLockEnd,
                minimalDeposit: minDepositWei
            };
            
            // Submit the transaction
            const tx = await this.buildersContract.createBuilderPool(builderPool);
            
            return {
                transaction: tx,
                poolId: this.getPoolId(name)
            };
        } catch (error) {
            console.error("Error creating builder pool:", error);
            throw error;
        }
    }

    /**
     * Get information about a builder pool
     * @param poolId Pool ID (bytes32 hex string)
     * @returns Pool information object
     */
    async getPoolInfo(poolId: string) {
        try {
            const poolInfo = await this.buildersContract.builderPools(poolId);
            const poolData = await this.buildersContract.buildersPoolData(poolId);
            
            // Format the returned data in a more readable way
            return {
                name: poolInfo.name,
                admin: poolInfo.admin,
                poolStart: {
                    timestamp: Number(poolInfo.poolStart),
                    date: new Date(Number(poolInfo.poolStart) * 1000)
                },
                withdrawLockPeriodAfterDeposit: Number(poolInfo.withdrawLockPeriodAfterDeposit),
                claimLockEnd: {
                    timestamp: Number(poolInfo.claimLockEnd),
                    date: new Date(Number(poolInfo.claimLockEnd) * 1000)
                },
                minimalDeposit: {
                    wei: poolInfo.minimalDeposit,
                    formatted: ethers.formatEther(poolInfo.minimalDeposit)
                },
                poolData: {
                    lastDeposit: Number(poolData.lastDeposit),
                    deposited: {
                        wei: poolData.deposited,
                        formatted: ethers.formatEther(poolData.deposited)
                    },
                    virtualDeposited: {
                        wei: poolData.virtualDeposited,
                        formatted: ethers.formatEther(poolData.virtualDeposited)
                    },
                    rate: poolData.rate,
                    pendingRewards: poolData.pendingRewards
                }
            };
        } catch (error) {
            console.error("Error getting pool info:", error);
            throw error;
        }
    }

    /**
     * Approve the Builders Contract to spend MOR tokens
     * @param amount Amount of MOR to approve (in normal units, not wei)
     * @returns Transaction receipt
     */
    async approveMorTokens(amount: string) {
        try {
            const amountWei = ethers.parseEther(amount);
            const tx = await this.morToken.approve(this.contractAddress, amountWei);
            return tx;
        } catch (error) {
            console.error("Error approving MOR tokens:", error);
            throw error;
        }
    }

    /**
     * Get the current MOR token allowance for the Builders Contract
     * @returns Allowance amount in wei
     */
    async getMorAllowance(): Promise<bigint> {
        try {
            const address = await this.signer.getAddress();
            const allowance = await this.morToken.allowance(address, this.contractAddress);
            return allowance;
        } catch (error) {
            console.error("Error getting MOR allowance:", error);
            return BigInt(0);
        }
    }

    /**
     * Get the MOR token balance of the signer
     * @returns Balance amount in wei
     */
    async getMorBalance(): Promise<bigint> {
        try {
            const address = await this.signer.getAddress();
            const balance = await this.morToken.balanceOf(address);
            return balance;
        } catch (error) {
            console.error("Error getting MOR balance:", error);
            return BigInt(0);
        }
    }

    /**
     * Deposit MOR tokens into a builder pool
     * @param poolId Pool ID (bytes32 hex string)
     * @param amount Amount of MOR to deposit (in normal units, not wei)
     * @returns Transaction receipt
     */
    async deposit(poolId: string, amount: string) {
        try {
            // Convert amount to wei
            const amountWei = ethers.parseEther(amount);
            
            // Submit deposit transaction
            const tx = await this.buildersContract.deposit(poolId, amountWei);
            
            return tx;
        } catch (error) {
            console.error("Error depositing to builder pool:", error);
            throw error;
        }
    }

    /**
     * Withdraw MOR tokens from a builder pool
     * @param poolId Pool ID (bytes32 hex string)
     * @param amount Amount of MOR to withdraw (in normal units, not wei)
     * @returns Transaction receipt
     */
    async withdraw(poolId: string, amount: string) {
        try {
            // Convert amount to wei
            const amountWei = ethers.parseEther(amount);
            
            // Submit withdraw transaction
            const tx = await this.buildersContract.withdraw(poolId, amountWei);
            
            return tx;
        } catch (error) {
            console.error("Error withdrawing from builder pool:", error);
            throw error;
        }
    }

    /**
     * Get user data for a specific pool
     * @param address User address
     * @param poolId Pool ID
     * @returns User data object
     */
    async getUserData(address: string, poolId: string) {
        try {
            const userData = await this.buildersContract.usersData(address, poolId);
            
            return {
                lastDeposit: {
                    timestamp: Number(userData.lastDeposit),
                    date: new Date(Number(userData.lastDeposit) * 1000)
                },
                claimLockStart: {
                    timestamp: Number(userData.claimLockStart),
                    date: new Date(Number(userData.claimLockStart) * 1000)
                },
                deposited: {
                    wei: userData.deposited,
                    formatted: ethers.formatEther(userData.deposited)
                },
                virtualDeposited: {
                    wei: userData.virtualDeposited,
                    formatted: ethers.formatEther(userData.virtualDeposited)
                }
            };
        } catch (error) {
            console.error("Error getting user data:", error);
            throw error;
        }
    }

    /**
     * Get the current builder reward for a pool
     * @param poolId Pool ID (bytes32 hex string)
     * @returns Current reward as a formatted string
     */
    async getCurrentBuilderReward(poolId: string): Promise<string> {
        try {
            const rewardWei = await this.buildersContract.getCurrentBuilderReward(poolId);
            return ethers.formatEther(rewardWei);
        } catch (error) {
            console.error("Error getting current builder reward:", error);
            throw error;
        }
    }

    /**
     * Claim builder rewards from a pool
     * @param poolId Pool ID (bytes32 hex string)
     * @param receiver Address to receive the rewards
     * @returns Transaction receipt
     */
    async claim(poolId: string, receiver: string) {
        try {
            const tx = await this.buildersContract.claim(poolId, receiver);
            return tx;
        } catch (error) {
            console.error("Error claiming builder rewards:", error);
            throw error;
        }
    }

    /**
     * Edit an existing builder pool (only callable by pool admin)
     * @param name Name of the pool (must match existing pool)
     * @param adminAddress Address that will receive rewards and manage the pool
     * @param startTime UNIX timestamp when the pool should start
     * @param withdrawLockPeriod Period in seconds when users can't withdraw after depositing
     * @param claimLockEnd UNIX timestamp when the admin can claim rewards
     * @param minDeposit Minimum amount of MOR required to join (in normal units, not wei)
     * @returns Transaction receipt
     */
    async editBuilderPool(
        name: string,
        adminAddress: string,
        startTime: number,
        withdrawLockPeriod: number,
        claimLockEnd: number,
        minDeposit: string
    ) {
        try {
            // Convert minDeposit to wei
            const minDepositWei = ethers.parseEther(minDeposit);
            
            // Create the BuilderPool struct
            const builderPool = {
                name,
                admin: adminAddress,
                poolStart: startTime,
                withdrawLockPeriodAfterDeposit: withdrawLockPeriod,
                claimLockEnd,
                minimalDeposit: minDepositWei
            };
            
            // Submit the transaction
            const tx = await this.buildersContract.editBuilderPool(builderPool);
            
            return {
                transaction: tx,
                poolId: this.getPoolId(name)
            };
        } catch (error) {
            console.error("Error editing builder pool:", error);
            throw error;
        }
    }

    /**
     * Get the current multiplier for a user in a specific pool
     * @param poolId Pool ID (bytes32 hex string)
     * @param userAddress User address
     * @returns Multiplier value (precision 10^25)
     */
    async getCurrentUserMultiplier(poolId: string, userAddress: string): Promise<string> {
        try {
            const multiplier = await this.buildersContract.getCurrentUserMultiplier(poolId, userAddress);
            return multiplier.toString();
        } catch (error) {
            console.error("Error getting user multiplier:", error);
            throw error;
        }
    }

    /**
     * Get the deposit token address used by the Builders contract
     * @returns Token address
     */
    async getDepositToken(): Promise<string> {
        try {
            const tokenAddress = await this.buildersContract.depositToken();
            return tokenAddress;
        } catch (error) {
            console.error("Error getting deposit token address:", error);
            throw error;
        }
    }

    /**
     * Get the total staking information across all pools
     * @returns Object containing total virtual deposited, rate, and distributed rewards
     */
    async getTotalPoolData() {
        try {
            const totalData = await this.buildersContract.totalPoolData();
            return {
                totalVirtualDeposited: {
                    wei: totalData.totalVirtualDeposited,
                    formatted: ethers.formatEther(totalData.totalVirtualDeposited)
                },
                rate: totalData.rate,
                distributedRewards: {
                    wei: totalData.distributedRewards,
                    formatted: ethers.formatEther(totalData.distributedRewards)
                }
            };
        } catch (error) {
            console.error("Error getting total pool data:", error);
            throw error;
        }
    }

    /**
     * Get the fee for a specific operation
     * @param operation The operation type (usually a string converted to bytes32)
     * @returns Fee information including amount and treasury address
     */
    async getOperationFee(operation: string) {
        try {
            if (!this.feeConfig) {
                throw new Error("FeeConfig contract not initialized");
            }
            
            const address = await this.signer.getAddress();
            const result = await this.feeConfig.getUserFee(address, ethers.id(operation));
            
            return {
                fee: result.fee,
                feeFormatted: ethers.formatEther(result.fee),
                treasury: result.treasury
            };
        } catch (error) {
            console.error("Error getting operation fee:", error);
            throw error;
        }
    }

    /**
     * Get the total rewards available in the treasury
     * @returns Total rewards as a formatted string
     */
    async getTotalTreasuryRewards(): Promise<string> {
        try {
            if (!this.buildersTreasury) {
                throw new Error("BuildersTreasury contract not initialized");
            }
            
            const totalRewards = await this.buildersTreasury.getAllRewards();
            return ethers.formatEther(totalRewards);
        } catch (error) {
            console.error("Error getting total treasury rewards:", error);
            return "0";
        }
    }

    /**
     * Deposit rewards into the treasury
     * @param amount Amount to deposit (in normal units, not wei)
     * @returns Transaction receipt
     */
    async depositTreasuryRewards(amount: string) {
        try {
            if (!this.buildersTreasury) {
                throw new Error("BuildersTreasury contract not initialized");
            }
            
            const amountWei = ethers.parseEther(amount);
            
            // First approve the treasury to spend tokens
            const approveTx = await this.morToken.approve(this.treasuryAddress, amountWei);
            await approveTx.wait();
            
            // Then deposit the rewards
            const depositTx = await this.buildersTreasury.depositRewards(amountWei);
            return depositTx;
        } catch (error) {
            console.error("Error depositing treasury rewards:", error);
            throw error;
        }
    }

    // Additional convenience methods ported from StakingClient

    /**
     * Get the total amount staked by an address across all pools
     * @param address User address
     * @returns Total staked amount as a formatted string
     */
    async getTotalStakedByAddress(address: string): Promise<string> {
        try {
            const safeAddress = address.toLowerCase();
            let totalStaked = BigInt(0);
            
            // This is a simplified approach - in a real implementation, 
            // you would need to track all pools the user has staked in
            // For now, just return their MOR balance as a placeholder
            const balance = await this.morToken.balanceOf(safeAddress);
            totalStaked = balance;
            
            return ethers.formatEther(totalStaked);
        } catch (error) {
            console.error("Error getting total staked amount:", error);
            return "0";
        }
    }

    /**
     * Get the total amount staked across all pools
     * @returns Total staked amount as a formatted string
     */
    async getTotalStaked(): Promise<string> {
        try {
            // Get the total pool data and use the virtual deposited amount
            const totalData = await this.getTotalPoolData();
            return totalData.totalVirtualDeposited.formatted;
        } catch (error) {
            console.error("Error getting total staked:", error);
            return "0";
        }
    }
} 