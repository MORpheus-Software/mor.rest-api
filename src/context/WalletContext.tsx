import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { switchNetwork } from '../services/ethService';
import Web3Modal from 'web3modal';

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

// Initialize Web3Modal
const providerOptions = {
  // WalletConnect removed due to compatibility issues
};

let web3Modal: Web3Modal;
// Initialize outside of component to avoid SSR issues
if (typeof window !== 'undefined') {
  web3Modal = new Web3Modal({
    network: "arbitrum",
    cacheProvider: true,
    providerOptions,
    theme: "light"
  });
}

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
  disconnectWallet: () => Promise<void>;
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
  disconnectWallet: async () => {},
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
  const [web3Provider, setWeb3Provider] = useState<any>(null);

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === 'undefined') return;
      
      // Check if provider is cached
      if (web3Modal.cachedProvider) {
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

  // Setup event listeners for the provider
  const setupProviderEvents = (provider: any) => {
    if (!provider.on) {
      return;
    }

    // Remove any existing listeners first to prevent duplicates
    provider.removeListener("accountsChanged", handleAccountsChanged);
    provider.removeListener("chainChanged", handleChainChanged);
    provider.removeListener("disconnect", disconnectWallet);

    // Add listeners
    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);
    provider.on("disconnect", disconnectWallet);

    console.log("Wallet event listeners set up successfully");
  };

  // Switch to a specific network
  const switchToNetwork = async (networkType: 'testnet' | 'mainnet'): Promise<boolean> => {
    if (!web3Provider) {
      console.error("No web3 provider found");
      return false;
    }
    
    try {
      const networkName = networkType === 'testnet' ? 'sepolia' : 'mainnet';
      const targetChainId = NETWORKS[networkType].chainId;
      
      // Check current chain
      const currentChainId = await web3Provider.request({ method: 'eth_chainId' });
      
      if (currentChainId !== targetChainId) {
        // Request chain switch
        try {
          await web3Provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChainId }],
          });
        } catch (switchError: any) {
          // Chain doesn't exist, add it
          if (switchError.code === 4902) {
            try {
              await web3Provider.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: targetChainId,
                    chainName: NETWORKS[networkType].name,
                    rpcUrls: [NETWORKS[networkType].rpcUrl],
                    blockExplorerUrls: [NETWORKS[networkType].explorerUrl],
                    nativeCurrency: {
                      name: 'ETH',
                      symbol: 'ETH',
                      decimals: 18
                    }
                  },
                ],
              });
            } catch (addError) {
              console.error('Error adding chain:', addError);
              return false;
            }
          } else {
            console.error('Error switching chain:', switchError);
            return false;
          }
        }
      }
      
      setCurrentNetworkType(networkType);
      
      // Refresh provider and signer
      const ethersProvider = new ethers.providers.Web3Provider(web3Provider);
      const ethersSigner = ethersProvider.getSigner();
      
      setProvider(ethersProvider);
      setSigner(ethersSigner);
      
      // Get the network
      const networkInfo = await ethersProvider.getNetwork();
      let chainName = networkInfo.name;
      
      // Handle special case for Arbitrum networks
      if (networkInfo.chainId === 421614) { // Arbitrum Sepolia
        chainName = 'Arbitrum Sepolia';
        setCurrentNetworkType('testnet');
      } else if (networkInfo.chainId === 42161) { // Arbitrum One
        chainName = 'Arbitrum One';
        setCurrentNetworkType('mainnet');
      }
      
      // Update state
      setNetwork(chainName);
      
      return true;
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
      
      if (typeof window === 'undefined') {
        throw new Error('Browser window not available');
      }

      // Check if MetaMask is installed
      if (!window.ethereum || !window.ethereum.isMetaMask) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Prompt user to select a wallet
      const instance = await web3Modal.connect();
      setWeb3Provider(instance);
      
      // Setup event listeners
      setupProviderEvents(instance);
      
      // Create ethers provider
      const ethersProvider = new ethers.providers.Web3Provider(instance);
      
      // Get the network
      const networkInfo = await ethersProvider.getNetwork();
      let chainName = networkInfo.name;
      
      // Handle special case for Arbitrum networks
      if (networkInfo.chainId === 421614) { // Arbitrum Sepolia
        chainName = 'Arbitrum Sepolia';
        setCurrentNetworkType('testnet');
      } else if (networkInfo.chainId === 42161) { // Arbitrum One
        chainName = 'Arbitrum One';
        setCurrentNetworkType('mainnet');
      }
      
      // Get the signer and address
      const ethersSigner = ethersProvider.getSigner();
      const signerAddress = await ethersSigner.getAddress();
      
      // Update state
      setProvider(ethersProvider);
      setSigner(ethersSigner);
      setAddress(signerAddress);
      setNetwork(chainName);
      setIsConnected(true);
      
      // Switch to the required network if needed
      const targetChainId = NETWORKS[currentNetworkType].chainId;
      const currentChainId = await instance.request({ method: 'eth_chainId' });
      
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
  const disconnectWallet = async () => {
    try {
      // Try to directly disconnect MetaMask using permissions API
      if (web3Provider && web3Provider.isMetaMask) {
        try {
          // This will revoke all permissions and force MetaMask to prompt for connection again
          await web3Provider.request({
            method: 'wallet_revokePermissions',
            params: [{
              eth_accounts: {}
            }]
          });
          console.log('MetaMask permissions revoked successfully');
        } catch (revokeError) {
          console.warn('Could not revoke MetaMask permissions:', revokeError);
          // Fallback to alternative method - force permission request again
          try {
            await web3Provider.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }]
            });
          } catch (permError) {
            console.warn('Failed to reset permissions:', permError);
          }
        }
      }
      
      // Remove event listeners if provider supports it
      if (web3Provider && web3Provider.removeListener) {
        web3Provider.removeListener("accountsChanged", handleAccountsChanged);
        web3Provider.removeListener("chainChanged", handleChainChanged);
        web3Provider.removeListener("disconnect", disconnectWallet);
      }
      
      // Clear web3modal cache
      if (web3Modal) {
        web3Modal.clearCachedProvider();
      }
      
      // Close WalletConnect session if active
      if (web3Provider && web3Provider.close) {
        await web3Provider.close();
      }
      
      // Reset all state variables
      setWeb3Provider(null);
      setProvider(null);
      setSigner(null);
      setAddress(null);
      setIsConnected(false);
      setNetwork(null);
      
      console.log('Wallet disconnected successfully');
      
      // For MetaMask specifically, we need to clear local storage that might
      // be keeping connection state
      localStorage.removeItem('walletconnect');
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      
      // Force page reload to completely reset connection
      window.location.reload();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      // Even if there's an error, try to force reload
      window.location.reload();
    }
  };

  // Handle account changes
  const handleAccountsChanged = async (accounts: string[]) => {
    try {
      if (accounts.length === 0) {
        // User disconnected their wallet
        await disconnectWallet();
        return;
      }

      const newAddress = accounts[0];
      
      if (web3Provider) {
        // Create a new provider and signer for the new account
        const ethersProvider = new ethers.providers.Web3Provider(web3Provider);
        const ethersSigner = ethersProvider.getSigner();
        
        // Get the network
        const networkInfo = await ethersProvider.getNetwork();
        let chainName = networkInfo.name;
        
        // Handle special case for Arbitrum networks
        if (networkInfo.chainId === 421614) { // Arbitrum Sepolia
          chainName = 'Arbitrum Sepolia';
          setCurrentNetworkType('testnet');
        } else if (networkInfo.chainId === 42161) { // Arbitrum One
          chainName = 'Arbitrum One';
          setCurrentNetworkType('mainnet');
        }
        
        // Update state with new account info
        setProvider(ethersProvider);
        setSigner(ethersSigner);
        setAddress(newAddress);
        setNetwork(chainName);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error handling account change:', error);
      setError('Failed to connect to new wallet account');
      await disconnectWallet();
    }
  };

  // Handle network changes
  const handleChainChanged = async (chainId: string) => {
    try {
      if (web3Provider) {
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
        const ethersProvider = new ethers.providers.Web3Provider(web3Provider);
        const ethersSigner = ethersProvider.getSigner();
        
        setProvider(ethersProvider);
        setSigner(ethersSigner);
      }
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