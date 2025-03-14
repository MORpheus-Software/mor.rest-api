
declare global {
  interface Window {
    ethereum?: any;
  }
}

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

// Contract addresses (mainnet)
const MOR_TOKEN_ADDRESS = "0x1C9491865a1DE77C5b6e19d2E6a5F1D7a6F2b25F"; // Example address
const STAKING_CONTRACT_ADDRESS = "0x7396F26DdEE748D3cE166852Ef56E24cdA25CBD4"; // Example address

// Network configurations
const NETWORKS = {
  mainnet: {
    chainId: '0x1',
    chainName: 'Ethereum Mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://mainnet.infura.io/v3/'],
    blockExplorerUrls: ['https://etherscan.io']
  },
  sepolia: {
    chainId: '0xaa36a7',
    chainName: 'Sepolia Testnet',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18
    },
    rpcUrls: ['https://sepolia.infura.io/v3/'],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  }
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
      throw new Error("MetaMask is not installed");
    }
    
    // For demo purposes, return a random number
    // In a real implementation, this would call the token contract's balanceOf method
    return Math.floor(Math.random() * 1000) + 500;
    
    /* 
    // Real implementation would look like:
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const tokenContract = new ethers.Contract(MOR_TOKEN_ADDRESS, MOR_TOKEN_ABI, provider);
    const balance = await tokenContract.balanceOf(address);
    return ethers.utils.formatUnits(balance, 18); // Assuming 18 decimal places
    */
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
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    
    // For demo purposes, return a random number
    // In a real implementation, this would call the staking contract's stakedBalance method
    return Math.floor(Math.random() * 500) + 100;
    
    /* 
    // Real implementation would look like:
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, provider);
    const balance = await stakingContract.stakedBalance(address);
    return ethers.utils.formatUnits(balance, 18); // Assuming 18 decimal places
    */
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
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`Staking ${amount} tokens (mock transaction)`);
    
    /* 
    // Real implementation would look like:
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    // First approve the staking contract to spend tokens
    const tokenContract = new ethers.Contract(MOR_TOKEN_ADDRESS, MOR_TOKEN_ABI, signer);
    const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);
    
    const approveTx = await tokenContract.approve(STAKING_CONTRACT_ADDRESS, amountInWei);
    await approveTx.wait();
    
    // Then stake the tokens
    const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer);
    const stakeTx = await stakingContract.stake(amountInWei);
    await stakeTx.wait();
    */
    
    // Returning true indicates success
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
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }
    
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`Unstaking ${amount} tokens (mock transaction)`);
    
    /* 
    // Real implementation would look like:
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer);
    
    const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);
    const unstakeTx = await stakingContract.unstake(amountInWei);
    await unstakeTx.wait();
    */
    
    // Returning true indicates success
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
