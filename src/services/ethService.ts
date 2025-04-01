import { ethers } from 'ethers';
import { StakingClient } from '@/StakingClient';
import { DemoStakingClient } from '@/demoStakingClient';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Helper function to ensure proper checksum format for addresses
const getChecksumAddress = (address: string): string => {
  try {
    return ethers.getAddress(address);
  } catch (error) {
    console.error("Invalid address format:", error);
    // Return the original address if conversion fails
    return address;
  }
};

// Determine if we're in development mode
const isDevelopment = import.meta.env.MODE === 'development';
const useMockData = isDevelopment && import.meta.env.VITE_USE_MOCK_DATA === 'true';

// ABI for the MOR token contract - simplified version
const MOR_TOKEN_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  }
];

// ABI for the staking contract - simplified version
const STAKING_CONTRACT_ABI = [
  {
    "constant": false,
    "inputs": [{"name": "amount", "type": "uint256"}],
    "name": "stake",
    "outputs": [],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "amount", "type": "uint256"}],
    "name": "unstake",
    "outputs": [],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{"name": "account", "type": "address"}],
    "name": "stakedBalance",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  }
];

// Contract addresses with proper checksum
const MOR_TOKEN_ADDRESS = getChecksumAddress(
  import.meta.env.VITE_MOR_TOKEN_ADDRESS || "0x1C9491865a1DE77C5b6e19d2E6a5F1D7a6F2b25F"
);
const STAKING_CONTRACT_ADDRESS = getChecksumAddress(
  import.meta.env.VITE_STAKING_CONTRACT_ADDRESS || "0x7396F26DdEE748D3cE166852Ef56E24cdA25CBD4"
);

// Network configurations
const NETWORKS = {
  mainnet: {
    chainId: '0xa4b1',
    chainName: 'Arbitrum One',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io']
  },
  sepolia: {
    chainId: '0x66dee',
    chainName: 'Arbitrum Sepolia',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://sepolia.arbiscan.io']
  }
};

// Get StakingClient instance
const getStakingClient = () => {
  // Use demo client if in development mode and mock data is enabled
  if (useMockData) {
    return new DemoStakingClient();
  }

  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signerPromise = provider.getSigner();
  
  // Create a proxy object that resolves the signer promise on demand
  const asyncStakingClient = {
    async stake(amount: string) {
      const signer = await signerPromise;
      const client = new StakingClient(provider, signer, STAKING_CONTRACT_ADDRESS);
      return client.stake(amount);
    },
    async unstake(amount: string) {
      const signer = await signerPromise;
      const client = new StakingClient(provider, signer, STAKING_CONTRACT_ADDRESS);
      return client.unstake(amount);
    },
    async getStakedAmount(address: string) {
      const signer = await signerPromise;
      const client = new StakingClient(provider, signer, STAKING_CONTRACT_ADDRESS);
      return client.getStakedAmount(address);
    },
    async getStakedBalance(address: string) {
      const signer = await signerPromise;
      const client = new StakingClient(provider, signer, STAKING_CONTRACT_ADDRESS);
      return client.getStakedBalance(address);
    },
    async claimReward() {
      const signer = await signerPromise;
      const client = new StakingClient(provider, signer, STAKING_CONTRACT_ADDRESS);
      return client.claimReward();
    },
  };
  
  return asyncStakingClient;
};

/**
 * Check if MetaMask wallet is connected and return the account
 */
export const checkIfWalletIsConnected = async (): Promise<string | null> => {
  try {
    if (!window.ethereum) return null;
    
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    
    if (accounts.length > 0) {
      return accounts[0];
    }
    
    return null;
  } catch (error) {
    console.error("Error checking if wallet is connected:", error);
    return null;
  }
};

/**
 * Connect to MetaMask wallet
 */
export const connectWallet = async (): Promise<string | null> => {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    if (accounts.length > 0) {
      return accounts[0];
    }
    
    return null;
  } catch (error) {
    console.error("Error connecting to wallet:", error);
    throw error;
  }
};

/**
 * Switch to a specific network
 */
export const switchNetwork = async (networkName: 'mainnet' | 'sepolia'): Promise<boolean> => {
  if (!window.ethereum) return false;
  
  const network = NETWORKS[networkName];
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: network.chainId }],
    });
    return true;
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: network.chainId,
              chainName: network.chainName,
              nativeCurrency: network.nativeCurrency,
              rpcUrls: network.rpcUrls,
              blockExplorerUrls: network.blockExplorerUrls,
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Error adding chain:", addError);
        return false;
      }
    }
    console.error("Error switching chain:", switchError);
    return false;
  }
};

/**
 * Get MOR token balance for an address
 */
export const getTokenBalance = async (address: string): Promise<number> => {
  try {
    if (!window.ethereum) {
      if (useMockData) {
        // When mock data is enabled but no wallet is connected
        return 0;
      }
      throw new Error("MetaMask is not installed");
    }
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const tokenContract = new ethers.Contract(MOR_TOKEN_ADDRESS, MOR_TOKEN_ABI, provider);
    // Use checksum address
    const checksumAddress = getChecksumAddress(address);
    const balance = await tokenContract.balanceOf(checksumAddress);
    return parseFloat(ethers.formatEther(balance));
  } catch (error) {
    console.error("Error getting token balance:", error);
    return 0;
  }
};

/**
 * Get staked token balance for an address
 */
export const getStakedBalance = async (address: string): Promise<number> => {
  try {
    if (!window.ethereum && !useMockData) {
      throw new Error("MetaMask is not installed");
    }
    
    const stakingClient = getStakingClient();
    const balance = await stakingClient.getStakedBalance(address);
    return parseFloat(balance);
  } catch (error) {
    console.error("Error getting staked balance:", error);
    return 0;
  }
};

/**
 * Stake tokens
 */
export const stakeTokens = async (amount: number): Promise<boolean> => {
  try {
    if (useMockData) {
      const demoClient = new DemoStakingClient();
      await demoClient.stake(amount.toString());
      return true;
    }

    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // First approve the staking contract to spend tokens
    const tokenContract = new ethers.Contract(MOR_TOKEN_ADDRESS, MOR_TOKEN_ABI, signer);
    const amountInWei = ethers.parseEther(amount.toString());
    
    // Use checksum address for approval
    const checksumStakingAddress = getChecksumAddress(STAKING_CONTRACT_ADDRESS);
    const approveTx = await tokenContract.approve(checksumStakingAddress, amountInWei);
    await approveTx.wait();
    
    // Now stake the tokens using the StakingClient
    const stakingClient = getStakingClient();
    await stakingClient.stake(amount.toString());
    
    return true;
  } catch (error) {
    console.error("Error staking tokens:", error);
    return false;
  }
};

/**
 * Unstake tokens
 */
export const unstakeTokens = async (amount: number): Promise<boolean> => {
  try {
    if (useMockData) {
      const demoClient = new DemoStakingClient();
      await demoClient.unstake(amount.toString());
      return true;
    }

    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    
    // Use the StakingClient to unstake
    const stakingClient = getStakingClient();
    await stakingClient.unstake(amount.toString());
    
    return true;
  } catch (error) {
    console.error("Error unstaking tokens:", error);
    return false;
  }
};

/**
 * Get blockchain balance (alias for getTokenBalance for backward compatibility)
 */
export const getBlockchainBalance = async (address: string): Promise<number> => {
  return getTokenBalance(address);
};

/**
 * Claim staking rewards
 */
export const claimRewards = async (): Promise<boolean> => {
  try {
    if (useMockData) {
      const demoClient = new DemoStakingClient();
      await demoClient.claimReward();
      return true;
    }

    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    
    const stakingClient = getStakingClient();
    await stakingClient.claimReward();
    
    return true;
  } catch (error) {
    console.error("Error claiming rewards:", error);
    return false;
  }
};
