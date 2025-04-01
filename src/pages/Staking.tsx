import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Wallet, Coins, ArrowUp, ArrowDown, ExternalLink, AlertTriangle, Gift } from 'lucide-react';
import WalletConnect from '@/components/wallet/WalletConnect';
import { 
  stakeTokens, 
  unstakeTokens, 
  getTokenBalance, 
  getStakedBalance,
  switchNetwork,
  claimRewards
} from '@/services/ethService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Real contract addresses
const CONTRACT_ADDRESS = import.meta.env.VITE_STAKING_CONTRACT_ADDRESS || "0x7396F26DdEE748D3cE166852Ef56E24cdA25CBD4";
const TOKEN_ADDRESS = import.meta.env.VITE_MOR_TOKEN_ADDRESS || "0x1C9491865a1DE77C5b6e19d2E6a5F1D7a6F2b25F";

const Staking = () => {
  const [balance, setBalance] = useState<number>(0);
  const [stakedAmount, setStakedAmount] = useState<number>(0);
  const [amountToStake, setAmountToStake] = useState('');
  const [amountToUnstake, setAmountToUnstake] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [tier, setTier] = useState('Locked');
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
  const [showUnstakeDialog, setShowUnstakeDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stake");
  
  // Calculate tier based on staked amount
  useEffect(() => {
    if (stakedAmount >= 100) {
      setTier('Unlocked');
    } else {
      setTier('Locked');
    }
  }, [stakedAmount]);

  // Update balance from blockchain when wallet is connected
  useEffect(() => {
    const updateBalances = async () => {
      if (connectedAccount) {
        setIsLoading(true);
        try {
          // Try to switch to mainnet
          await switchNetwork('mainnet');
          
          // Get token balance
          const tokenBalance = await getTokenBalance(connectedAccount);
          setBalance(tokenBalance);
          
          // Get staked balance
          const staked = await getStakedBalance(connectedAccount);
          setStakedAmount(staked);
        } catch (error) {
          console.error("Error fetching balances:", error);
          toast.error("Failed to fetch blockchain data");
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    if (connectedAccount) {
      updateBalances();
    } else {
      setIsLoading(false);
    }
  }, [connectedAccount]);

  const handleWalletConnect = (account: string) => {
    setConnectedAccount(account);
  };

  const handleStake = async () => {
    const amount = parseInt(amountToStake);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (amount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    if (!connectedAccount) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    setIsStaking(true);
    
    try {
      const success = await stakeTokens(amount);
      
      if (success) {
        // Update balances
        setBalance(prev => prev - amount);
        setStakedAmount(prev => prev + amount);
        setAmountToStake('');
        
        toast.success(`Successfully staked ${amount} MOR tokens`);
      } else {
        toast.error('Transaction failed');
      }
    } catch (error) {
      toast.error('Failed to stake tokens. Please try again.');
      console.error(error);
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    const amount = parseInt(amountToUnstake);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (amount > stakedAmount) {
      toast.error('Amount exceeds staked balance');
      return;
    }

    if (!connectedAccount) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    setIsUnstaking(true);
    
    try {
      const success = await unstakeTokens(amount);
      
      if (success) {
        // Update balances
        setBalance(prev => prev + amount);
        setStakedAmount(prev => prev - amount);
        setAmountToUnstake('');
        setShowUnstakeDialog(false);
        
        toast.success(`Successfully unstaked ${amount} MOR tokens`);
      } else {
        toast.error('Transaction failed');
      }
    } catch (error) {
      toast.error('Failed to unstake tokens. Please try again.');
      console.error(error);
    } finally {
      setIsUnstaking(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!connectedAccount) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    setIsClaiming(true);
    
    try {
      const success = await claimRewards();
      
      if (success) {
        toast.success('Successfully claimed rewards');
      } else {
        toast.error('Transaction failed');
      }
    } catch (error) {
      toast.error('Failed to claim rewards. Please try again.');
      console.error(error);
    } finally {
      setIsClaiming(false);
    }
  };

  const getNextTier = () => {
    if (stakedAmount < 100) return { name: 'Unlocked', required: 100 };
    return { name: 'Maximum Tier Reached', required: stakedAmount };
  };

  const nextTier = getNextTier();
  const progressToNextTier = Math.min(100, (stakedAmount / nextTier.required) * 100);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MOR Token Staking</h1>
          <p className="text-muted-foreground">Stake your MOR tokens to unlock premium features</p>
        </div>
        <WalletConnect onConnect={handleWalletConnect} />
      </div>
      
      {!connectedAccount && !isLoading && (
        <Card className="mb-6 border-dashed">
          <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="rounded-full bg-amber-500/10 p-3">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Connect your wallet</h3>
              <p className="text-sm text-muted-foreground">
                Connect your Arbitrum wallet to view your MOR token balance and stake tokens.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Balance</CardTitle>
            <CardDescription>Current MOR token holdings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 bg-muted animate-pulse rounded-md"></div>
                <div className="h-4 w-24 bg-muted animate-pulse rounded-md"></div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Coins className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{balance} MOR</p>
                  <p className="text-sm text-muted-foreground">Available balance</p>
                </div>
              </div>
            )}
            
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 bg-muted animate-pulse rounded-md"></div>
                <div className="h-4 w-24 bg-muted animate-pulse rounded-md"></div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stakedAmount} MOR</p>
                  <p className="text-sm text-muted-foreground">Total staked</p>
                </div>
              </div>
            )}
            
            {connectedAccount && (
              <div className="space-y-2 mt-4 pt-4 border-t">
                <div className="text-sm font-medium">Contract Details</div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Staking Contract:</span>
                    <a 
                      href={`https://etherscan.io/address/${CONTRACT_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-500 hover:underline"
                    >
                      {`${CONTRACT_ADDRESS.substring(0, 6)}...${CONTRACT_ADDRESS.substring(CONTRACT_ADDRESS.length - 4)}`}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Token Contract:</span>
                    <a 
                      href={`https://etherscan.io/address/${TOKEN_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-500 hover:underline"
                    >
                      {`${TOKEN_ADDRESS.substring(0, 6)}...${TOKEN_ADDRESS.substring(TOKEN_ADDRESS.length - 4)}`}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Staking Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="stake">Stake</TabsTrigger>
                <TabsTrigger value="unstake">Unstake</TabsTrigger>
                <TabsTrigger value="rewards">Rewards</TabsTrigger>
              </TabsList>
              
              <TabsContent value="stake" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="stakeAmount">Amount to Stake</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="stakeAmount"
                        type="number"
                        placeholder="Enter amount"
                        value={amountToStake}
                        onChange={(e) => setAmountToStake(e.target.value)}
                        disabled={!connectedAccount || isStaking || isLoading}
                      />
                      <Button 
                        onClick={handleStake} 
                        disabled={isStaking || !connectedAccount || isLoading}
                        className="min-w-24"
                      >
                        {isStaking ? 'Staking...' : 'Stake'}
                        <ArrowUp className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                    {connectedAccount && (
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Available: {balance} MOR</span>
                        <button 
                          className="text-primary hover:underline" 
                          onClick={() => setAmountToStake(balance.toString())}
                          disabled={isLoading || balance <= 0}
                        >
                          Max
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <div className="text-sm">Staking Benefits:</div>
                    <ul className="text-sm space-y-1">
                      <li className="flex items-start gap-2">
                        <span className="text-green-500">•</span>
                        <span>Access to premium API features</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500">•</span>
                        <span>Higher API rate limits based on your tier</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500">•</span>
                        <span>Priority support and dedicated account manager (Platinum tier)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="unstake" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="unstakeAmount">Amount to Unstake</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="unstakeAmount"
                        type="number"
                        placeholder="Enter amount"
                        value={amountToUnstake}
                        onChange={(e) => setAmountToUnstake(e.target.value)}
                        disabled={!connectedAccount || isUnstaking || isLoading}
                      />
                      <Button 
                        onClick={handleUnstake}
                        disabled={isUnstaking || !connectedAccount || isLoading}
                        variant="outline"
                        className="min-w-24"
                      >
                        {isUnstaking ? 'Processing...' : 'Unstake'}
                        <ArrowDown className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                    {connectedAccount && (
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Staked: {stakedAmount} MOR</span>
                        <button 
                          className="text-primary hover:underline" 
                          onClick={() => setAmountToUnstake(stakedAmount.toString())}
                          disabled={isLoading || stakedAmount <= 0}
                        >
                          Max
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950/50 p-3 text-sm text-amber-800 dark:text-amber-200 mt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Important:</strong> Unstaking tokens will reduce your tier level and associated benefits if your staked amount falls below a tier threshold.
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="rewards" className="mt-4">
                <div className="space-y-6">
                  <div className="rounded-md border bg-card p-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Gift className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-1 text-lg font-semibold">Staking Rewards</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Claim your rewards for staking MOR tokens
                    </p>
                    <Button 
                      onClick={handleClaimRewards} 
                      disabled={!connectedAccount || isClaiming || stakedAmount <= 0 || isLoading}
                      className="w-full"
                    >
                      {isClaiming ? 'Claiming...' : 'Claim Rewards'}
                    </Button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>Reward details:</p>
                    <ul className="list-disc list-inside pl-4 space-y-1 mt-2">
                      <li>Rewards accumulate based on your staked amount</li>
                      <li>Higher tiers receive additional reward bonuses</li>
                      <li>Rewards can be claimed once every 24 hours</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Staking Tier</CardTitle>
            <CardDescription>Your current benefits and next tier progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-8 bg-muted animate-pulse rounded-md"></div>
                <div className="h-4 bg-muted animate-pulse rounded-md"></div>
                <div className="h-2 bg-muted animate-pulse rounded-md"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Current Tier: {tier}</h3>
                    <p className="text-sm text-muted-foreground">
                      {tier === 'Locked' && 'Limited access to MOR features'}
                      {tier === 'Unlocked' && 'Full access to all MOR features and services'}
                    </p>
                  </div>
                  <div className={`${tier === 'Unlocked' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} font-semibold rounded-full px-4 py-1`}>
                    {tier}
                  </div>
                </div>
                
                {tier !== 'Unlocked' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress to {nextTier.name}</span>
                      <span>{stakedAmount} / {nextTier.required} MOR</span>
                    </div>
                    <Progress value={progressToNextTier} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      Stake {nextTier.required - stakedAmount} more MOR tokens to unlock all features.
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Locked Tier</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Basic API access</li>
                      <li>• Limited requests per month</li>
                      <li>• Standard support</li>
                    </ul>
                    <div className="mt-2 text-xs text-muted-foreground">Default tier (0-99 MOR)</div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Unlocked Tier</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Unlimited API access</li>
                      <li>• Priority support</li>
                      <li>• Access to all features</li>
                      <li>• Early access to new releases</li>
                    </ul>
                    <div className="mt-2 text-xs text-muted-foreground">Requires 100+ MOR</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Staking;
