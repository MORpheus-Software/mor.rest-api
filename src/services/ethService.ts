import { ethers } from 'ethers';
import { BuildersClient } from '../staking/BuildersClient';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// Helper function to ensure proper checksum format for addresses
const getChecksumAddress = (address: string): string => {
  if (!address) return "";
  try {
    return ethers.utils.getAddress(address.toLowerCase());
  } catch (error) {
    console.error("Invalid address format:", error);
    // Return the original address if conversion fails
    return address.toLowerCase();
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

// Contract addresses based on network
const CONTRACT_ADDRESSES = {
  mainnet: {
    token: getChecksumAddress(
      import.meta.env.VITE_MOR_TOKEN_ADDRESS || "0x1c9491865a1de77c5b6e19d2e6a5f1d7a6f2b25f"
    ),
    builders: getChecksumAddress(
      import.meta.env.VITE_BUILDERS_CONTRACT_ADDRESS || "0xC0eD68f163d44B6e9985F0041fDf6f67c6BCFF3f"
    )
  },
  testnet: {
    token: getChecksumAddress("0x34a285A1B1C166420Df5b6630132542923B5b27E"), // Arbitrum Sepolia Test MOR Token
    builders: getChecksumAddress("0xF651907Bfc6A67eCAb3E448c6C8200cD13566baA") // Arbitrum Sepolia Builders Contract
  }
};

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
  testnet: {
    chainId: '0x66eee',
    chainName: 'Arbitrum Sepolia',
    nativeCurrency: {
      name: 'Arbitrum Sepolia Ether',
      symbol: 'SepoliaETH',
      decimals: 18
    },
    rpcUrls: [
      'https://sepolia-rollup.arbitrum.io/rpc',
      'https://arbitrum-sepolia.blockpi.network/v1/rpc/public',
      'https://arbitrum-sepolia.public.blastapi.io',
      'https://421614.rpc.thirdweb.com'
    ],
    blockExplorerUrls: ['https://sepolia.arbiscan.io']
  }
};

/**
 * Get contract addresses for the current network
 */
export const getContractAddresses = async () => {
  if (!window.ethereum) {
    return CONTRACT_ADDRESSES.mainnet; // Default to mainnet if no ethereum provider
  }
  
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId === NETWORKS.testnet.chainId) {
      return CONTRACT_ADDRESSES.testnet;
    }
    return CONTRACT_ADDRESSES.mainnet;
  } catch (error) {
    console.error("Error getting chain ID:", error);
    return CONTRACT_ADDRESSES.mainnet;
  }
};

// Get BuildersClient instance
const getBuildersClient = async (contractAddress?: string) => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  
  // If contract address is provided, use it; otherwise get the address for the current network
  let buildersContractAddress = contractAddress;
  if (!buildersContractAddress) {
    const addresses = await getContractAddresses();
    buildersContractAddress = addresses.builders;
  }
  
  return new BuildersClient(provider, signer, buildersContractAddress);
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
export const switchNetwork = async (networkName: 'mainnet' | 'testnet'): Promise<boolean> => {
  if (!window.ethereum) return false;
  
  const network = NETWORKS[networkName];
  console.log(`Attempting to switch to ${networkName} with chainId ${network.chainId}`);
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: network.chainId }],
    });
    console.log(`Successfully switched to ${networkName}`);
    return true;
  } catch (switchError: any) {
    console.log(`Error when switching to ${networkName}:`, switchError);
    
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        console.log(`Adding ${networkName} network to wallet`);
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
        console.log(`${networkName} network added successfully`);
        return true;
      } catch (addError) {
        console.error(`Error adding ${networkName} chain:`, addError);
        return false;
      }
    }
    // User rejected the request (common error)
    if (switchError.code === 4001) {
      console.log("User rejected the request to switch networks");
      return false;
    }
    return false;
  }
};

/**
 * Get token balance for an address
 */
export const getTokenBalance = async (address: string, tokenAddress?: string): Promise<number> => {
  if (useMockData) {
    console.log("Using mock data for token balance");
    return 100.0;
  }
  
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    
    // Get contract addresses for current network
    const addresses = await getContractAddresses();
    
    // Use provided token address or default for current network
    const tokenContractAddress = tokenAddress || addresses.token;
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const tokenContract = new ethers.Contract(tokenContractAddress, MOR_TOKEN_ABI, provider);
    
    const balance = await tokenContract.balanceOf(address);
    return parseFloat(ethers.formatEther(balance));
  } catch (error) {
    console.error("Error getting token balance:", error);
    return 0;
  }
};

/**
 * Stake tokens (deposit into a builder pool)
 */
export const stakeTokens = async (amount: number, poolId: string, buildersAddress?: string, tokenAddress?: string): Promise<boolean> => {
  if (useMockData) {
    console.log("Using mock data for staking");
    return true;
  }
  
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    
    // Get contract addresses for current network
    const addresses = await getContractAddresses();
    
    // Use provided addresses or defaults for current network
    const buildersContractAddress = buildersAddress || addresses.builders;
    const tokenContractAddress = tokenAddress || addresses.token;
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();
    
    // Create BuildersClient instance
    const buildersClient = await getBuildersClient(buildersContractAddress);
    
    // Convert amount to wei
    const amountWei = ethers.utils.parseEther(amount.toString());
    
    // Check allowance
    const allowance = await buildersClient.getMorAllowance();
    
    // If allowance is insufficient, approve tokens first
    if (allowance < amountWei) {
      console.log("Approving tokens for staking...");
      const approveTx = await buildersClient.approveMorTokens(amount.toString());
      await approveTx.wait();
      console.log("Tokens approved");
    }
    
    // Deposit tokens (stake)
    console.log(`Depositing ${amount} MOR to pool ${poolId}...`);
    const tx = await buildersClient.deposit(poolId, amount.toString());
    await tx.wait();
    console.log("Tokens staked successfully");
    
    return true;
  } catch (error) {
    console.error("Error staking tokens:", error);
    return false;
  }
};

/**
 * Unstake tokens (withdraw from a builder pool)
 */
export const unstakeTokens = async (amount: number, poolId: string, buildersAddress?: string): Promise<boolean> => {
  if (useMockData) {
    console.log("Using mock data for unstaking");
    return true;
  }
  
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    
    // Get contract addresses for current network
    const addresses = await getContractAddresses();
    
    // Use provided address or default for current network
    const buildersContractAddress = buildersAddress || addresses.builders;
    
    // Get BuildersClient
    const buildersClient = await getBuildersClient(buildersContractAddress);
    
    // Withdraw tokens (unstake)
    console.log(`Withdrawing ${amount} MOR from pool ${poolId}...`);
    const tx = await buildersClient.withdraw(poolId, amount.toString());
    await tx.wait();
    console.log("Tokens unstaked successfully");
    
    return true;
  } catch (error) {
    console.error("Error unstaking tokens:", error);
    return false;
  }
};

/**
 * Get staked balance for an address in a specific pool
 */
export const getStakedBalance = async (address: string, poolId: string, contractAddress?: string): Promise<number> => {
  if (useMockData) {
    console.log("Using mock data for staked balance");
    return 25.0;
  }
  
  try {
    // Get BuildersClient
    const buildersClient = await getBuildersClient(contractAddress);
    
    // Get user data for the pool
    const userData = await buildersClient.getUserData(address, poolId);
    return parseFloat(userData.deposited.formatted);
  } catch (error) {
    console.error("Error getting staked balance:", error);
    return 0;
  }
};
