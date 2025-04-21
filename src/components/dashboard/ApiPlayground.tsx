import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Code, Play, FileJson, Copy, Wallet, Coins } from 'lucide-react';
import { FRONTEND_API_ENDPOINT } from '@/lib/api/constants';
import { fetchApiKeys, updateApiKeyLastUsed, subscribeToApiKeyChanges } from '@/lib/api/apiKeyService';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/staking/BuildersClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Import MOR token ABI for balance checking
const MOR_TOKEN_ABI = [
  "function balanceOf(address owner) external view returns (uint256)"
];

// Simplified Builders contract ABI for checking stake
const BUILDERS_CONTRACT_ABI = [
  "function usersData(address user, bytes32 builderPoolId) external view returns (uint128 lastDeposit, uint128 claimLockStart, uint256 deposited, uint256 virtualDeposited)"
];

// Default pool for test
const DEFAULT_POOL_NAME = "Morpheus LLM & API";

export function ApiPlayground() {
  const { toast } = useToast();
  const [token, setToken] = useState('');
  const [endpoint, setEndpoint] = useState('/api/v1/user');
  const [method, setMethod] = useState('GET');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [requestBody, setRequestBody] = useState('{\n  "name": "John Doe"\n}');
  const [availableApiKeys, setAvailableApiKeys] = useState<string[]>([]);
  
  // Wallet and staking states
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [morBalance, setMorBalance] = useState<string>('0');
  const [stakedBalance, setStakedBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [networkType, setNetworkType] = useState<'testnet' | 'mainnet'>('testnet');

  // Function to fetch MOR balance and staked amount
  const fetchBalances = async (address: string) => {
    if (!address) return;
    
    console.log(`Fetching balances for address: ${address}`);
    setIsLoadingBalance(true);
    
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        // Create a provider using window.ethereum
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Get current network information
        const networkDetails = await provider.getNetwork();
        console.log(`Connected to network chainId: ${networkDetails.chainId}`);
        
        // Determine if we're on testnet or mainnet
        // Arbitrum Sepolia testnet chainId is 421614
        // Arbitrum One mainnet chainId is 42161
        const currentNetworkType = networkDetails.chainId === 421614 ? 'testnet' : 'mainnet';
        setNetworkType(currentNetworkType);
        console.log(`Detected network type: ${currentNetworkType}`);
        
        // Get contract addresses based on network
        const morTokenAddress = CONTRACT_ADDRESSES[currentNetworkType].token;
        const buildersContractAddress = CONTRACT_ADDRESSES[currentNetworkType].builders;
        console.log(`Using MOR token address: ${morTokenAddress}`);
        console.log(`Using Builders contract address: ${buildersContractAddress}`);
        
        // Create contract instances
        const morToken = new ethers.Contract(morTokenAddress, MOR_TOKEN_ABI, provider);
        const buildersContract = new ethers.Contract(buildersContractAddress, BUILDERS_CONTRACT_ABI, provider);
        
        // Get MOR balance
        try {
          console.log(`Requesting MOR balance for address: ${address}`);
          const morBalanceWei = await morToken.balanceOf(address);
          console.log(`MOR balance (wei): ${morBalanceWei.toString()}`);
          const morBalanceEth = ethers.utils.formatEther(morBalanceWei);
          console.log(`MOR balance (formatted): ${morBalanceEth}`);
          setMorBalance(parseFloat(morBalanceEth).toFixed(2));
        } catch (error) {
          console.error('Error fetching MOR balance:', error);
          setMorBalance('Error');
        }
        
        // Get pool ID
        const poolId = ethers.utils.id(DEFAULT_POOL_NAME);
        console.log(`Using pool ID: ${poolId} for pool name: ${DEFAULT_POOL_NAME}`);
        
        // Get staked balance
        try {
          console.log(`Requesting staked balance for address: ${address} and poolId: ${poolId}`);
          const userData = await buildersContract.usersData(address, poolId);
          console.log(`User stake data:`, userData);
          
          const stakedAmountWei = userData.deposited;
          console.log(`Staked amount (wei): ${stakedAmountWei.toString()}`);
          
          const stakedAmountEth = ethers.utils.formatEther(stakedAmountWei);
          console.log(`Staked amount (formatted): ${stakedAmountEth}`);
          
          setStakedBalance(parseFloat(stakedAmountEth).toFixed(2));
        } catch (error) {
          console.error('Error fetching stake data:', error);
          setStakedBalance('Error');
        }
        
        // Record the time of this fetch
        setLastFetchTime(Date.now());
      }
    } catch (error) {
      console.error('Error in fetchBalances:', error);
      setMorBalance('Error');
      setStakedBalance('Error');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Function to check wallet connection - we'll call this every time the component renders
  const checkWalletConnection = async () => {
    console.log('Checking wallet connection...');
    setIsLoadingBalance(true);
    
    if (typeof window === 'undefined' || !window.ethereum) {
      console.log('No ethereum provider found in window');
      setWalletAddress(null);
      setIsWalletConnected(false);
      setMorBalance('0');
      setStakedBalance('0');
      setIsLoadingBalance(false);
      return;
    }
    
    try {
      // Force window.ethereum to initialize properly
      await window.ethereum.request({ method: 'eth_chainId' });
      
      // Check current accounts
      console.log('Requesting accounts...');
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      console.log('Accounts returned:', accounts);
      
      if (accounts && accounts.length > 0) {
        const currentAccount = accounts[0];
        console.log(`Wallet connected with address: ${currentAccount}`);
        
        setWalletAddress(currentAccount);
        setIsWalletConnected(true);
        
        // Check if we need to fetch balances (first time or after 30 seconds)
        const timeSinceLastFetch = Date.now() - lastFetchTime;
        if (timeSinceLastFetch > 30000 || lastFetchTime === 0) {
          console.log('Fetching fresh balances...');
          await fetchBalances(currentAccount);
        } else {
          console.log('Using cached balances');
          setIsLoadingBalance(false);
        }
      } else {
        console.log('No connected accounts found');
        setWalletAddress(null);
        setIsWalletConnected(false);
        setMorBalance('0');
        setStakedBalance('0');
        setIsLoadingBalance(false);
      }
    } catch (error) {
      console.error('Error in checkWalletConnection:', error);
      setWalletAddress(null);
      setIsWalletConnected(false);
      setMorBalance('0');
      setStakedBalance('0');
      setIsLoadingBalance(false);
    }
  };

  // Check wallet on component mount and set up listeners
  useEffect(() => {
    console.log('ApiPlayground component mounted');
    
    // Load API keys
    const loadApiKeys = async () => {
      try {
        const keys = await fetchApiKeys();
        const activeKeys = keys.filter(key => key.status === 'active').map(key => key.token);
        setAvailableApiKeys(activeKeys);
        
        // Set the first key as the default if we don't have a token yet
        if (activeKeys.length > 0 && !token) {
          setToken(activeKeys[0]);
        }
      } catch (error) {
        console.error('Error loading API keys:', error);
      }
    };
    
    // Load keys initially
    loadApiKeys();
    
    // Subscribe to API key changes
    const unsubscribe = subscribeToApiKeyChanges(loadApiKeys);
    
    // Check wallet connection on component mount
    setTimeout(() => {
      checkWalletConnection();
    }, 500); // Short delay to ensure provider is ready
    
    // Setup event listeners for account and network changes
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log('Accounts changed:', accounts);
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsWalletConnected(true);
          fetchBalances(accounts[0]);
        } else {
          setWalletAddress(null);
          setIsWalletConnected(false);
          setMorBalance('0');
          setStakedBalance('0');
        }
      };
      
      const handleChainChanged = () => {
        console.log('Network changed, rechecking wallet and balances');
        // Reload the page on chain change as recommended by MetaMask
        window.location.reload();
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      // Cleanup event listeners on unmount
      return () => {
        unsubscribe();
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
    
    return unsubscribe;
  }, []); // Empty dependency array means this runs once on mount

  // Function to connect wallet
  const connectWallet = async () => {
    console.log('Connecting wallet...');
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        setIsLoadingBalance(true);
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        console.log('Accounts after connection:', accounts);
        
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsWalletConnected(true);
          await fetchBalances(accounts[0]);
        } else {
          console.log('No accounts returned after connection request');
          toast({
            title: "Connection Failed",
            description: "No accounts were returned from wallet",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error connecting wallet:', error);
        toast({
          title: "Wallet Connection Failed",
          description: `Could not connect to wallet: ${(error as Error).message}`,
          variant: "destructive",
        });
        setIsLoadingBalance(false);
      }
    } else {
      toast({
        title: "MetaMask Not Found",
        description: "Please install MetaMask to connect your wallet",
        variant: "destructive",
      });
    }
  };

  // New function to handle refreshing balances - now also rechecks wallet connection
  const refreshBalances = () => {
    console.log('Manually refreshing balances');
    setLastFetchTime(0); // Reset last fetch time to force a refresh
    checkWalletConnection();
  };

  // Rest of the component remains unchanged...
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: "API key required",
        description: "Please enter an API key to make a request",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setResponse(null);
    setResponseTime(null);
    
    const startTime = performance.now();
    
    try {
      console.log(`Making real API request to ${endpoint}`);
      
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        // Add longer timeout support for fetch
        signal: AbortSignal.timeout(60000), // 60 second timeout
      };
      
      if (method === 'POST' || method === 'PUT') {
        try {
          const parsedBody = JSON.parse(requestBody);
          options.body = JSON.stringify(parsedBody);
          
          // Check for streaming request
          const isStreamingRequest = parsedBody.stream === true;
          
          if (isStreamingRequest) {
            return handleStreamingRequest(endpoint, options, startTime);
          }
        } catch (error) {
          toast({
            title: "Invalid JSON",
            description: "Please check your request body format",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }
      
      // For non-streaming requests
      const response = await fetch(endpoint, options);
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      setResponse({
        status: response.status,
        data
      });
      
      // Update last used time for the token
      const keys = await fetchApiKeys();
      const matchingKey = keys.find(key => key.token === token);
      if (matchingKey) {
        updateApiKeyLastUsed(matchingKey.id);
      }
    } catch (error) {
      console.error('Error making request:', error);
      toast({
        title: "Request failed",
        description: `API request failed: ${(error as Error).message || "An unexpected error occurred"}`,
        variant: "destructive",
      });
      
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      
      setResponse({
        status: 'Error',
        error: (error as Error).message || "An unexpected error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Streaming request handling
  const handleStreamingRequest = async (endpoint: string, options: RequestInit, startTime: number) => {
    try {
      // Initialize partial response
      const partialResponse = {
        status: 'Streaming',
        data: { choices: [{ message: { content: '' } }] }
      };
      setResponse(partialResponse);
      
      // Start the request
      const response = await fetch(endpoint, options);
      
      if (!response.ok) {
        const errorData = await response.json();
        setResponse({
          status: response.status,
          data: errorData
        });
        return;
      }
      
      if (!response.body) {
        throw new Error('Response has no body');
      }
      
      // Create a reader to read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      
      // Start the read loop
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          const endTime = performance.now();
          setResponseTime(Math.round(endTime - startTime));
          break;
        }
        
        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Process server-sent events
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const jsonData = JSON.parse(line.substring(6));
              
              if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta?.content) {
                // For streaming format like OpenAI
                accumulatedContent += jsonData.choices[0].delta.content;
              } else if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].message?.content) {
                // For complete message format
                accumulatedContent = jsonData.choices[0].message.content;
              }
              
              // Update UI with accumulated content
              setResponse({
                status: 'Streaming',
                data: {
                  choices: [{
                    message: { content: accumulatedContent }
                  }]
                }
              });
            } catch (e) {
              console.log('Non-JSON data line:', line);
            }
          }
        }
      }
      
      // Set final response
      const finalResponse = {
        status: 200,
        data: {
          choices: [{
            message: { content: accumulatedContent }
          }]
        }
      };
      setResponse(finalResponse);
      
    } catch (error) {
      console.error('Error in streaming request:', error);
      toast({
        title: "Streaming request failed",
        description: (error as Error).message || "An unexpected error occurred",
        variant: "destructive",
      });
      
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      
      setResponse({
        status: 'Error',
        error: (error as Error).message || "An unexpected error occurred"
      });
      
    } finally {
      setIsLoading(false);
    }
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      toast({
        title: "Response copied",
        description: "Response JSON copied to clipboard",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallet and MOR Balance Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Staked MOR Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Your Staked MOR</CardTitle>
              <CardDescription>Amount staked in the Morpheus pool</CardDescription>
            </div>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isWalletConnected ? (
              <>
                <div className="text-2xl font-bold">{isLoadingBalance ? 'Loading...' : `${stakedBalance} MOR`}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  <p className="mb-1">Network: {networkType === 'testnet' ? 'Arbitrum Sepolia (Testnet)' : 'Arbitrum One (Mainnet)'}</p>
                  <Button variant="outline" size="sm" onClick={refreshBalances} disabled={isLoadingBalance}>
                    Refresh
                  </Button>
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Connect your wallet to see your staked MOR balance</p>
                <Button variant="outline" size="sm" onClick={connectWallet} disabled={isLoadingBalance}>
                  <Wallet className="mr-2 h-4 w-4" />
                  {isLoadingBalance ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* MOR Balance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Your MOR Balance</CardTitle>
              <CardDescription>Available MOR in your wallet</CardDescription>
            </div>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isWalletConnected ? (
              <>
                <div className="text-2xl font-bold">{isLoadingBalance ? 'Loading...' : `${morBalance} MOR`}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  <p className="mb-1">Address: {walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : 'Unknown'}</p>
                  <Button variant="outline" size="sm" onClick={refreshBalances} disabled={isLoadingBalance}>
                    Refresh
                  </Button>
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Connect your wallet to see your MOR balance</p>
                <Button variant="outline" size="sm" onClick={connectWallet} disabled={isLoadingBalance}>
                  <Wallet className="mr-2 h-4 w-4" />
                  {isLoadingBalance ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Original API Testing Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Test API Request</CardTitle>
          <CardDescription>
            Make API requests to test your endpoints with authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="endpoint">API Endpoint</Label>
              <Input
                id="endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/api/v1/user"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="method">Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger id="method">
                    <SelectValue placeholder="Select a request method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="token">API Key</Label>
                <Select value={token} onValueChange={setToken}>
                  <SelectTrigger id="token">
                    <SelectValue placeholder="Select an API key" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableApiKeys.length > 0 ? (
                      availableApiKeys.map((key, index) => (
                        <SelectItem key={index} value={key}>
                          {key.substring(0, 10)}...{key.substring(key.length - 5)}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        No active API keys
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {(method === 'POST' || method === 'PUT') && (
              <div className="space-y-2">
                <Label htmlFor="body">Request Body</Label>
                <Tabs defaultValue="json">
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="json">JSON</TabsTrigger>
                  </TabsList>
                  <TabsContent value="json" className="mt-2">
                    <div className="relative">
                      <textarea
                        id="body"
                        rows={5}
                        className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                        placeholder="Enter JSON request body"
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Request'}
              <Play className="ml-2 h-4 w-4" />
            </Button>
          </form>
          
          <Separator className="my-4" />
          
          <div>
            <h3 className="font-medium mb-2 flex items-center">
              Response
              {responseTime !== null && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {responseTime}ms
                </span>
              )}
              {response && (
                <Button variant="ghost" size="sm" className="ml-auto h-8 p-0" onClick={copyResponse}>
                  <Copy className="h-4 w-4" />
                  <span className="sr-only">Copy response</span>
                </Button>
              )}
            </h3>
            
            <div className="rounded-md border overflow-x-auto">
              <pre className="p-4 text-sm min-h-[100px] max-h-[500px] overflow-auto font-mono">
                {response ? (
                  typeof response === 'object' ? 
                    JSON.stringify(response, null, 2) : 
                    response
                ) : (
                  <span className="text-muted-foreground">Response will appear here</span>
                )}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
