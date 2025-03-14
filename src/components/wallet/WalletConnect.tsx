import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, AlertCircle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { checkIfWalletIsConnected, connectWallet, switchNetwork } from '@/services/ethService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type WalletConnectProps = {
  onConnect: (account: string) => void;
};

const WalletConnect = ({ onConnect }: WalletConnectProps) => {
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [network, setNetwork] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);

  // Define callback functions first
  const updateNetworkInfo = useCallback((chainId: string) => {
    // Map chainId to network name
    const networks: Record<string, string> = {
      '0x1': 'Mainnet',
      '0x3': 'Ropsten',
      '0x4': 'Rinkeby',
      '0x5': 'Goerli',
      '0xaa36a7': 'Sepolia',
      '0x89': 'Polygon',
      '0xa': 'Optimism',
      '0xa4b1': 'Arbitrum'
    };
    
    setChainId(chainId);
    setNetwork(networks[chainId] || `Unknown (${chainId})`);
  }, []);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount(null);
      toast.error("Disconnected from MetaMask");
    } else {
      const newAccount = accounts[0];
      setAccount(newAccount);
      onConnect(newAccount);
      toast.success("Connected to MetaMask");
    }
  }, [onConnect]);

  const checkIfWalletIsConnected = useCallback(async (): Promise<string | null> => {
    if (!window.ethereum) return null;
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length !== 0) {
        return accounts[0];
      }
      
      return null;
    } catch (error) {
      console.error("Error checking wallet connection:", error);
      return null;
    }
  }, []);

  // Now use the callbacks in useEffect
  useEffect(() => {
    const checkMetaMaskInstalled = async () => {
      if (typeof window.ethereum === 'undefined') {
        setIsMetaMaskInstalled(false);
        return;
      }
      setIsMetaMaskInstalled(true);
      
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        updateNetworkInfo(chainId);
      } catch (error) {
        console.error("Failed to get chain ID:", error);
      }
    };
    
    const checkConnection = async () => {
      const connectedAccount = await checkIfWalletIsConnected();
      if (connectedAccount) {
        handleAccountsChanged([connectedAccount]);
      }
    };
    
    checkMetaMaskInstalled();
    checkConnection();
    
    if (window.ethereum) {
      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      // Listen for chain changes
      window.ethereum.on('chainChanged', updateNetworkInfo);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', updateNetworkInfo);
      }
    };
  }, [handleAccountsChanged, updateNetworkInfo, checkIfWalletIsConnected]);

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask is not installed");
      return;
    }

    setIsConnecting(true);
    
    try {
      const account = await connectWallet();
      if (account) {
        handleAccountsChanged([account]);
      }
    } catch (error: any) {
      console.error("Failed to connect:", error);
      toast.error(error.message || "Failed to connect to MetaMask");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSwitchNetwork = async (network: 'mainnet' | 'sepolia') => {
    try {
      const success = await switchNetwork(network);
      if (success) {
        toast.success(`Switched to ${network}`);
      } else {
        toast.error(`Failed to switch to ${network}`);
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to switch to ${network}`);
    }
  };

  if (!isMetaMaskInstalled) {
    return (
      <div className="flex flex-col gap-2 items-start">
        <Button variant="outline" disabled className="flex gap-2">
          <AlertCircle className="h-4 w-4" />
          MetaMask Not Installed
        </Button>
        <a 
          href="https://metamask.io/download/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline"
        >
          Install MetaMask
        </a>
      </div>
    );
  }

  if (account) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex gap-2">
            <Wallet className="h-4 w-4" />
            {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
            {network && (
              <>
                <span className="hidden md:inline mx-1">|</span>
                <span className="hidden md:inline text-xs bg-primary/10 px-2 py-0.5 rounded-full">
                  {network}
                </span>
              </>
            )}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Wallet Connected</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => handleSwitchNetwork('mainnet')}
          >
            Switch to Mainnet
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => handleSwitchNetwork('sepolia')}
          >
            Switch to Sepolia Testnet
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => {
              navigator.clipboard.writeText(account);
              toast.success("Address copied to clipboard");
            }}
          >
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => window.open(`https://etherscan.io/address/${account}`, '_blank')}
          >
            View on Etherscan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button 
      onClick={handleConnectWallet} 
      disabled={isConnecting}
      className="flex gap-2"
    >
      <Wallet className="h-4 w-4" />
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
};

export default WalletConnect;
