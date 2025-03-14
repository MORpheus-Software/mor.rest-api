
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    ethereum?: any;
  }
}

type WalletConnectProps = {
  onConnect: (account: string) => void;
};

const WalletConnect = ({ onConnect }: WalletConnectProps) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(true);

  useEffect(() => {
    const checkMetaMaskInstalled = async () => {
      setIsMetaMaskInstalled(!!window.ethereum);
    };
    
    checkMetaMaskInstalled();
  }, []);

  useEffect(() => {
    // Check if already connected
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            handleAccountsChanged(accounts);
          }
        })
        .catch((err: Error) => {
          console.error("Failed to get accounts:", err);
        });

      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount(null);
      toast.error("Disconnected from MetaMask");
    } else {
      const newAccount = accounts[0];
      setAccount(newAccount);
      onConnect(newAccount);
      toast.success("Connected to MetaMask");
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask is not installed");
      return;
    }

    setIsConnecting(true);
    
    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      handleAccountsChanged(accounts);
    } catch (error) {
      console.error("Failed to connect:", error);
      toast.error("Failed to connect to MetaMask");
    } finally {
      setIsConnecting(false);
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
      <Button variant="outline" className="flex gap-2">
        <Wallet className="h-4 w-4" />
        {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
      </Button>
    );
  }

  return (
    <Button 
      onClick={connectWallet} 
      disabled={isConnecting}
      className="flex gap-2"
    >
      <Wallet className="h-4 w-4" />
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
};

export default WalletConnect;
