import { useState } from 'react';
import { WalletProvider } from '../context/WalletContext';
import StakingComponent from '../components/Staking';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';

/**
 * MOR staking page with testnet/mainnet toggle
 */
export default function Staking() {
  // State for network mode toggle
  const [isTestnet, setIsTestnet] = useState(true);

  // Toggle network mode
  const toggleNetwork = () => {
    setIsTestnet(!isTestnet);
  };

  return (
    <DashboardLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">MOR Subnet Staking</h1>
        
        <div className="flex flex-col md:flex-row md:items-center mb-6">
          <div className="flex items-center">
            <span className="mr-3">Network:</span>
            <label className="inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={isTestnet}
                onChange={toggleNetwork}
                className="sr-only peer" 
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-400"></div>
              <span className="ml-3">{isTestnet ? 'Testnet' : 'Mainnet'}</span>
            </label>
            
            {isTestnet && (
              <span className="ml-4 text-sm text-yellow-800 bg-yellow-50 px-3 py-1 rounded-full">
                Testnet (Arbitrum Sepolia)
              </span>
            )}
            {!isTestnet && (
              <span className="ml-4 text-sm text-green-800 bg-green-50 px-3 py-1 rounded-full">
                Mainnet (Arbitrum One)
              </span>
            )}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-3">About MOR Staking</h2>
          <p className="text-gray-700">
            Stake MOR tokens into the mor.rest subnet for AI Chat API access.
            {isTestnet ? 
              ' You are currently on Arbitrum Sepolia testnet, where you can practice with test tokens.' : 
              ' You are currently on Arbitrum One mainnet, using real MOR tokens.'}
          </p>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-green-100 bg-green-50 p-4 rounded-md">
              <h3 className="font-semibold text-green-800 mb-2">Token Staking</h3>
              <p className="text-sm">Stake MOR tokens into subnets to reach the minimum requirement. Meet the staking threshold to unlock API key access.</p>
            </div>
            
            <div className="border border-blue-100 bg-blue-50 p-4 rounded-md">
              <h3 className="font-semibold text-blue-800 mb-2">API Access</h3>
              <p className="text-sm">Once you've met the minimum staking requirement, you'll be able to generate and manage API keys for your applications.</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <WalletProvider networkType={isTestnet ? 'testnet' : 'mainnet'}>
            <StakingComponent 
              networkType={isTestnet ? 'testnet' : 'mainnet'} 
              showConnectionButton={true}
              showConnectionAtTop={true}
            />
          </WalletProvider>
        </div>
      </div>
    </DashboardLayout>
  );
}
