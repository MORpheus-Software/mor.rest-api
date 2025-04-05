import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { BuildersClient } from '../staking/BuildersClient';
import { getChecksumAddress } from '../utils/addressUtils';
import { useWallet } from '../context/WalletContext';

// Helper function to properly serialize BigInt values for logging
const jsonStringifyReplacer = (key: string, value: any) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

// Contract addresses based on network
const CONTRACT_ADDRESSES = {
  mainnet: {
    token: getChecksumAddress("0x1c9491865a1de77c5b6e19d2e6a5f1d7a6f2b25f"),
    builders: getChecksumAddress("0xC0eD68f163d44B6e9985F0041fDf6f67c6BCFF3f")
  },
  testnet: {
    token: getChecksumAddress("0x34a285A1B1C166420Df5b6630132542923B5b27E"), // Arbitrum Sepolia Test MOR Token
    builders: getChecksumAddress("0xF651907Bfc6A67eCAb3E448c6C8200cD13566baA") // Arbitrum Sepolia Builders Contract - Updated to match BuildersClient
  }
};

// Network-specific subnet configurations
const NETWORK_SUBNETS = {
  mainnet: [
    {
      id: "0x69357171d8794841df9985947a3c20c807b56d43",
      name: "MOR API Access Subnet - Mainnet",
      description: "Official MOR subnet for API access on Arbitrum One",
      admin: "0x8F3b7156763717a99de1eBcB552f879fB5973c73",
      poolStart: {
        timestamp: 1743657004,
        date: new Date(1743657004 * 1000)
      },
      areDepositsLocked: false,
      areBuilderRewardsStaked: true,
      minimalDeposit: {
        formatted: "10"
      },
      active: true
    }
  ],
  testnet: [
    {
      id: "0xf827e8c0bff69fdcd1f130641f57cc4ada1f1a54f3c9133b14c58d99151a5e4c",
      name: "TestPool_1743817095 (Test)",
      description: "Test pool for development and testing",
      admin: "0x8F3b7156763717a99de1eBcB552f879fB5973c73",
      poolStart: {
        timestamp: 1743817155,
        date: new Date(1743817155 * 1000)
      },
      areDepositsLocked: false,
      areBuilderRewardsStaked: false,
      minimalDeposit: {
        formatted: "0.01"
      },
      active: true
    }
  ]
};

// Define component props
interface StakingProps {
  networkType?: 'mainnet' | 'testnet';
}

// Subnet interface
interface Subnet {
  id: string;
  name: string;
  description: string;
  admin: string;
  poolStart?: {
    timestamp: number;
    date: Date;
  };
  areDepositsLocked?: boolean;
  areBuilderRewardsStaked?: boolean;
  minimalDeposit: {
    wei?: string;
    formatted: string;
  };
  active: boolean;
}

// Staking component for interacting with MOR builder pools
export default function Staking({ networkType = 'testnet' }: StakingProps) {
  // State to track user interactions
  const [selectedPool, setSelectedPool] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [pools, setPools] = useState<Subnet[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPools, setLoadingPools] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userBalance, setUserBalance] = useState('0');
  const [stakedBalance, setStakedBalance] = useState('0');
  const [minStakeRequired, setMinStakeRequired] = useState('0');
  const [apiAccessEnabled, setApiAccessEnabled] = useState(false);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);
  
  // Access wallet context
  const { provider, signer, address, isConnected, connectWallet } = useWallet();

  // Initialize BuildersClient when wallet is connected
  const [buildersClient, setBuildersClient] = useState<BuildersClient | null>(null);
  
  // Function to fetch a specific subnet by ID
  const fetchSubnetById = async (client: BuildersClient, id: string) => {
    try {
      const poolInfo = await client.getPoolInfo(id);
      return {
        id: id,
        name: poolInfo.name,
        description: "Subnet for API access",
        admin: poolInfo.admin,
        poolStart: poolInfo.poolStart,
        areDepositsLocked: false,
        areBuilderRewardsStaked: false,
        minimalDeposit: poolInfo.minimalDeposit,
        active: true
      };
    } catch (error: any) {
      // Specifically check for "pool doesn't exist" error
      if (error.message && error.message.includes("pool doesn't exist")) {
        console.warn(`Subnet ${id} does not exist on the blockchain`);
        return null;
      }
      console.error(`Error fetching subnet ${id}:`, error);
      return null;
    }
  };
  
  // Reset states when network changes
  useEffect(() => {
    // Clear errors and reset UI state when network changes
    setBlockchainError(null);
    setError('');
    setSuccess('');
    setStakedBalance('0');
    setUserBalance('0');
    setSelectedPool('');
    setMinStakeRequired('0');
    setApiAccessEnabled(false);
  }, [networkType]);
  
  // Load builder pools when component mounts or network changes
  useEffect(() => {
    const initializeWithNetwork = async () => {
      // Clear previous data
      setPools([]);
      setLoadingPools(true);
      setBlockchainError(null);
      
      // Initialize client when wallet is connected
      if (isConnected && signer && provider) {
        try {
          const addresses = CONTRACT_ADDRESSES[networkType];
          const client = new BuildersClient(
            provider, 
            signer,
            addresses.builders,
            addresses.token
          );
          
          setBuildersClient(client);
          
          // Get configured subnets for the current network
          const networkSubnets = NETWORK_SUBNETS[networkType] || [];
          
          if (networkSubnets.length === 0) {
            setBlockchainError(`No subnets configured for ${networkType === 'testnet' ? 'Arbitrum Sepolia' : 'Arbitrum One'}`);
            setLoadingPools(false);
            return;
          }
          
          // We only have one subnet configured per network now, so just use it
          setPools(networkSubnets);
          
          // Set the selected subnet to the first (and only) subnet
          console.log(`Using configured ${networkType} subnet: ${networkSubnets[0].name}`);
          setSelectedPool(networkSubnets[0].id);
          setMinStakeRequired(networkSubnets[0].minimalDeposit.formatted);
          
        } catch (err) {
          console.error("Error initializing with network:", err);
          setBlockchainError(`Error connecting to ${networkType === 'testnet' ? 'Arbitrum Sepolia' : 'Arbitrum One'}`);
        } finally {
          setLoadingPools(false);
        }
      } else {
        setLoadingPools(false);
      }
    };
    
    initializeWithNetwork();
  }, [isConnected, provider, signer, networkType]);
  
  // Load user MOR balance when wallet is connected
  useEffect(() => {
    if (isConnected && address && buildersClient) {
      const fetchBalances = async () => {
        try {
          // Get MOR balance
          const morBalance = await buildersClient.getMorBalance();
          setUserBalance(ethers.formatEther(morBalance));
          
          // Get staked balance if a pool is selected
          if (selectedPool) {
            try {
              const userData = await buildersClient.getUserData(address, selectedPool);
              console.log('User data:', JSON.stringify(userData, jsonStringifyReplacer, 2));
              setStakedBalance(userData.deposited.formatted);
              setApiAccessEnabled(parseFloat(userData.deposited.formatted) >= parseFloat(minStakeRequired));
            } catch (userDataError: any) {
              // Handle the case where the pool doesn't exist yet
              if (userDataError.message && userDataError.message.includes("pool doesn't exist")) {
                console.warn(`Selected pool ${selectedPool} doesn't exist yet, showing zero balances`);
                setStakedBalance('0');
                setApiAccessEnabled(false);
              } else {
                console.error("Error fetching user data:", userDataError);
                // Don't update the state if there's an error, keep previous values
              }
            }
          }
        } catch (error) {
          console.error("Error fetching balances:", error);
        }
      };
      
      fetchBalances();
    }
  }, [isConnected, address, buildersClient, selectedPool, minStakeRequired]);
  
  // Handle staking MOR tokens
  const handleStake = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    if (!buildersClient) {
      setError('Blockchain client not initialized');
      setLoading(false);
      return;
    }
    
    if (!selectedPool) {
      setError('Please select a subnet');
      setLoading(false);
      return;
    }
    
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      setError('Please enter an amount to stake');
      setLoading(false);
      return;
    }
    
    try {
      // Check if pool exists and is started
      try {
        const poolInfo = await buildersClient.getPoolInfo(selectedPool);
        const currentTime = Math.floor(Date.now() / 1000);
        const startTime = Number(poolInfo.poolStart.timestamp);
        
        if (currentTime < startTime) {
          const startDate = new Date(startTime * 1000);
          setError(`This pool is not active yet. Staking will be available after ${startDate.toLocaleString()}`);
          setLoading(false);
          return;
        }
      } catch (error: any) {
        if (error.message && error.message.includes("pool doesn't exist")) {
          setError('The selected subnet does not exist on the blockchain');
          setLoading(false);
          return;
        }
        // Other errors will be handled in the main try-catch
      }
      
      // Perform approval first
      console.log('Checking allowance...');
      const allowance = await buildersClient.getMorAllowance();
      const amountToStakeWei = ethers.parseEther(stakeAmount);
      
      if (allowance < amountToStakeWei) {
        setSuccess('Approving tokens for staking...');
        const approveTx = await buildersClient.approveMorTokens(stakeAmount);
        await approveTx.wait();
        setSuccess('Tokens approved. Proceeding with staking...');
      }
      
      // Perform the stake
      try {
        const tx = await buildersClient.deposit(selectedPool, stakeAmount);
        setSuccess('Transaction submitted. Waiting for confirmation...');
        await tx.wait();
        
        // Update staked balance
        if (address) {
          try {
            const userData = await buildersClient.getUserData(address, selectedPool);
            console.log('Updated user data:', JSON.stringify(userData, jsonStringifyReplacer, 2));
            setStakedBalance(userData.deposited.formatted);
            
            // Check if user has met the minimum requirement
            setApiAccessEnabled(parseFloat(userData.deposited.formatted) >= parseFloat(minStakeRequired));
          } catch (err) {
            console.error("Error updating staked balance:", err);
          }
          
          // Update MOR balance
          try {
            const morBalance = await buildersClient.getMorBalance();
            setUserBalance(ethers.formatEther(morBalance));
          } catch (err) {
            console.error("Error updating MOR balance:", err);
          }
        }
        
        setSuccess(`Successfully staked ${stakeAmount} MOR!`);
        setStakeAmount('');
      } catch (err: any) {
        console.error("Error staking MOR:", err);
        
        // Handle specific error cases
        if (err.message && err.message.includes("pool isn't started")) {
          try {
            const poolInfo = await buildersClient.getPoolInfo(selectedPool);
            const startTime = new Date(Number(poolInfo.poolStart.timestamp) * 1000);
            setError(`This pool is not active yet. Staking will be available after ${startTime.toLocaleString()}`);
          } catch (infoError) {
            setError(`The pool is not active yet and cannot accept deposits`);
          }
        } else {
          setError(err.message || 'Error staking MOR');
        }
      }
    } catch (err: any) {
      console.error("Staking error:", err);
      setError(err.message || 'Error staking MOR');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle unstake action
  const handleUnstake = async () => {
    if (!buildersClient || !selectedPool || !stakeAmount) {
      setError('Please enter an amount to unstake');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Check if pool exists before attempting to withdraw
      try {
        const poolInfo = await buildersClient.getPoolInfo(selectedPool);
        console.log('Pool information:', JSON.stringify(poolInfo, jsonStringifyReplacer, 2));
        
        // Check if user has any staked tokens in this pool
        const userData = await buildersClient.getUserData(address || '', selectedPool);
        console.log('User data:', JSON.stringify(userData, jsonStringifyReplacer, 2));
        
        if (userData.deposited.wei <= 0n) {
          setError('You do not have any tokens staked in this pool');
          setLoading(false);
          return;
        }
        
        // Check if the amount to withdraw is within bounds
        const withdrawAmount = ethers.parseEther(stakeAmount);
        if (withdrawAmount > userData.deposited.wei) {
          setError(`You cannot withdraw more than your staked amount (${userData.deposited.formatted} MOR)`);
          setLoading(false);
          return;
        }
        
        // Check for withdrawal lock period
        const currentTime = Math.floor(Date.now() / 1000);
        const lastDepositTime = Number(userData.lastDeposit.timestamp);
        const withdrawLockPeriod = Number(poolInfo.withdrawLockPeriodAfterDeposit);
        
        if (lastDepositTime > 0 && currentTime < lastDepositTime + withdrawLockPeriod) {
          const unlockDate = new Date((lastDepositTime + withdrawLockPeriod) * 1000);
          setError(`Your tokens are locked until ${unlockDate.toLocaleString()}`);
          setLoading(false);
          return;
        }
      } catch (error: any) {
        if (error.message && error.message.includes("pool doesn't exist")) {
          setError('The selected subnet does not exist on the blockchain');
          setLoading(false);
          return;
        }
        // Let other errors be caught by the main try-catch
        console.warn('Error checking pool status:', error);
      }
      
      // Perform the unstake
      try {
        const tx = await buildersClient.withdraw(selectedPool, stakeAmount);
        setSuccess('Transaction submitted. Waiting for confirmation...');
        await tx.wait();
        
        // Update staked balance
        if (address) {
          try {
            const userData = await buildersClient.getUserData(address, selectedPool);
            console.log('Updated user data after withdrawal:', JSON.stringify(userData, jsonStringifyReplacer, 2));
            setStakedBalance(userData.deposited.formatted);
            
            // Check if user has met the minimum requirement
            setApiAccessEnabled(parseFloat(userData.deposited.formatted) >= parseFloat(minStakeRequired));
          } catch (err) {
            console.error("Error updating staked balance:", err);
          }
          
          // Update MOR balance
          try {
            const morBalance = await buildersClient.getMorBalance();
            setUserBalance(ethers.formatEther(morBalance));
          } catch (err) {
            console.error("Error updating MOR balance:", err);
          }
        }
        
        setSuccess(`Successfully unstaked ${stakeAmount} MOR!`);
        setStakeAmount('');
      } catch (err: any) {
        console.error("Error unstaking MOR:", err);
        
        // Handle specific error cases for unstaking
        if (err.message && err.message.includes("lock period")) {
          try {
            const userData = await buildersClient.getUserData(address || '', selectedPool);
            const poolInfo = await buildersClient.getPoolInfo(selectedPool);
            
            const lastDepositTime = Number(userData.lastDeposit.timestamp);
            const withdrawLockPeriod = Number(poolInfo.withdrawLockPeriodAfterDeposit);
            const unlockDate = new Date((lastDepositTime + withdrawLockPeriod) * 1000);
            
            setError(`Your tokens are locked until ${unlockDate.toLocaleString()}`);
          } catch (infoError) {
            setError('Your tokens are currently locked and cannot be withdrawn');
          }
        } else {
          setError(err.message || 'Error unstaking MOR');
        }
      }
    } catch (err: any) {
      console.error("Unstaking error:", err);
      setError(err.message || 'Error unstaking MOR');
    } finally {
      setLoading(false);
    }
  };

  // Calculate progress percentage towards minimum requirement
  const calculateProgressPercentage = () => {
    if (!stakedBalance || !minStakeRequired) return 0;
    const staked = parseFloat(stakedBalance);
    const required = parseFloat(minStakeRequired);
    if (required === 0) return 100;
    return Math.min(Math.round((staked / required) * 100), 100);
  };
  
  const progressPercentage = calculateProgressPercentage();
  
  // Get the currently selected subnet
  const selectedSubnet = pools.find(pool => pool.id === selectedPool);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">MOR Staking</h1>
      
      {!isConnected ? (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="mb-4">Please connect your wallet to stake/unstake MOR tokens.</p>
          <button 
            onClick={connectWallet}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div>
          {loadingPools ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p>Loading subnet information...</p>
            </div>
          ) : blockchainError ? (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-yellow-700 mb-6">
              <h3 className="font-bold text-lg mb-2">Network Error</h3>
              <p>{blockchainError}</p>
            </div>
          ) : (
            <>
              {selectedSubnet && (
                <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
                  <h2 className="text-lg font-semibold">{selectedSubnet.name}</h2>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Network:</span>
                      <span className="ml-2 font-medium">{networkType === 'testnet' ? 'Arbitrum Sepolia' : 'Arbitrum One'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Minimum Stake:</span>
                      <span className="ml-2 font-medium">{selectedSubnet.minimalDeposit.formatted} MOR</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${selectedSubnet.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {selectedSubnet.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h2 className="text-lg font-semibold mb-2">Your MOR balance</h2>
                  <p className="text-xl">{userBalance} MOR</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h2 className="text-lg font-semibold mb-2">Your Staked MOR</h2>
                  <p className="text-xl">{stakedBalance} MOR</p>
                  <p className="text-sm text-gray-600 mt-1">Minimum Required: {minStakeRequired} MOR</p>
                  
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className={`h-4 rounded-full ${progressPercentage >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-600">{progressPercentage}% complete</span>
                      {apiAccessEnabled && (
                        <span className="text-xs text-green-600 font-semibold">API Access Enabled</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
                <h2 className="text-lg font-semibold mb-4">Stake/Unstake MOR</h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="border-gray-300 rounded-md shadow-sm p-2 w-full"
                      placeholder="Enter MOR amount"
                    />
                    <button
                      className="ml-2 bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm"
                      onClick={() => setStakeAmount(userBalance)}
                    >
                      Max
                    </button>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleStake}
                    disabled={loading}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 flex-1"
                  >
                    {loading ? 'Processing...' : 'Stake'}
                  </button>
                  <button
                    onClick={handleUnstake}
                    disabled={loading || parseFloat(stakedBalance) === 0}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-400 flex-1"
                  >
                    {loading ? 'Processing...' : 'Unstake'}
                  </button>
                </div>
                
                {error && (
                  <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md">
                    {success}
                  </div>
                )}
                
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md text-xs">
                  <p>
                    <strong>Note:</strong> This is a demo application using the {networkType === 'testnet' ? 'Arbitrum Sepolia testnet' : 'Arbitrum One mainnet'}.
                    {networkType === 'testnet' && ' No real assets are at risk.'}
                  </p>
                </div>
              </div>
              
              {apiAccessEnabled && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-2">API Access Enabled</h3>
                  <p className="text-sm text-green-700">
                    You've met the minimum staking requirement of {minStakeRequired} MOR! You can now access the API key management page to create and manage your API keys.
                  </p>
                  <button
                    className="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    onClick={() => window.location.href = '/api-keys'}
                  >
                    Manage API Keys
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
} 