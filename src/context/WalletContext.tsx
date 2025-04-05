import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { switchNetwork } from '../services/ethService';

// Network configurations
export const NETWORKS = {
  mainnet: {
    chainId: '0xa4b1',
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io'
  },
  testnet: {
    chainId: '0x66eee',
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io'
  }
};

// Interface for the wallet context
interface WalletContextType {
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  network: string | null;
  networkType: 'testnet' | 'mainnet';
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToNetwork: (networkType: 'testnet' | 'mainnet') => Promise<boolean>;
}

// Create the context with default values
const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  address: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  network: null,
  networkType: 'testnet',
  connectWallet: async () => {},
  disconnectWallet: () => {},
  switchToNetwork: async () => false,
});

// Hook to use the wallet context
export const useWallet = () => useContext(WalletContext);

// Props for the WalletProvider
interface WalletProviderProps {
  children: ReactNode;
  networkType?: 'testnet' | 'mainnet';
}

// Local storage key for remembering connection
const LOCAL_STORAGE_KEY = 'morsaas_wallet_connected';

export const WalletProvider: React.FC<WalletProviderProps> = ({ children, networkType = 'testnet' }) => {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [currentNetworkType, setCurrentNetworkType] = useState<'testnet' | 'mainnet'>(networkType);

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      // Check if we should auto-connect
      const shouldAutoConnect = localStorage.getItem(LOCAL_STORAGE_KEY) === 'true';
      
      if (shouldAutoConnect) {
        connectWallet();
      }
    };
    
    checkConnection();
  }, []);
  
  // Update network when networkType prop changes
  useEffect(() => {
    if (isConnected && networkType !== currentNetworkType) {
      switchToNetwork(networkType);
    }
    setCurrentNetworkType(networkType);
  }, [networkType, isConnected]);

  // Switch to a specific network
  const switchToNetwork = async (networkType: 'testnet' | 'mainnet'): Promise<boolean> => {
    if (!window.ethereum) {
      console.error("No Ethereum provider found");
      return false;
    }
    
    try {
      const networkName = networkType === 'testnet' ? 'sepolia' : 'mainnet';
      const success = await switchNetwork(networkName);
      
      if (success) {
        setCurrentNetworkType(networkType);
        
        // Refresh provider and signer
        const ethersProvider = new ethers.BrowserProvider(window.ethereum);
        const ethersSigner = await ethersProvider.getSigner();
        
        setProvider(ethersProvider);
        setSigner(ethersSigner);
        
        // Update network display name
        const networkInfo = await ethersProvider.getNetwork();
        const chainName = networkInfo.name === 'arbitrum-sepolia' ? 'Arbitrum Sepolia' : 'Arbitrum One';
        setNetwork(chainName);
      }
      
      return success;
    } catch (error) {
      console.error("Error switching network:", error);
      return false;
    }
  };

  // Connect to wallet
  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to connect.');
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Create a provider
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      
      // Get the network
      const networkInfo = await ethersProvider.getNetwork();
      let chainName = networkInfo.name;
      
      // Handle special case for Arbitrum networks
      if (networkInfo.name === 'arbitrum-sepolia') {
        chainName = 'Arbitrum Sepolia';
        setCurrentNetworkType('testnet');
      } else if (networkInfo.chainId === BigInt(parseInt('0xa4b1', 16))) {
        chainName = 'Arbitrum One';
        setCurrentNetworkType('mainnet');
      }
      
      // Get the signer
      const ethersSigner = await ethersProvider.getSigner();
      const signerAddress = await ethersSigner.getAddress();
      
      // Update state
      setProvider(ethersProvider);
      setSigner(ethersSigner);
      setAddress(signerAddress);
      setNetwork(chainName);
      setIsConnected(true);
      
      // Remember connection in local storage
      localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
      
      // Setup account change listener
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      // Switch to the required network if needed
      const targetChainId = NETWORKS[currentNetworkType].chainId;
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (currentChainId !== targetChainId) {
        await switchToNetwork(currentNetworkType);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from wallet
  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setIsConnected(false);
    setNetwork(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    
    // Remove listeners
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
  };

  // Handle account changes
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      disconnectWallet();
    } else {
      // User switched accounts
      setAddress(accounts[0]);
    }
  };

  // Handle network changes
  const handleChainChanged = async () => {
    if (!window.ethereum) return;
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      // Update network type based on chain ID
      if (chainId === NETWORKS.testnet.chainId) {
        setCurrentNetworkType('testnet');
        setNetwork('Arbitrum Sepolia');
      } else if (chainId === NETWORKS.mainnet.chainId) {
        setCurrentNetworkType('mainnet');
        setNetwork('Arbitrum One');
      } else {
        setNetwork('Unsupported Network');
      }
      
      // Refresh provider and signer
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const ethersSigner = await ethersProvider.getSigner();
      
      setProvider(ethersProvider);
      setSigner(ethersSigner);
    } catch (error) {
      console.error("Error handling chain change:", error);
    }
  };

  const contextValue: WalletContextType = {
    provider,
    signer,
    address,
    isConnected,
    isConnecting,
    error,
    network,
    networkType: currentNetworkType,
    connectWallet,
    disconnectWallet,
    switchToNetwork,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// Define a type for the injected ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (request: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, listener: (...args: any[]) => void) => void;
      removeListener: (event: string, listener: (...args: any[]) => void) => void;
    };
  }
} 