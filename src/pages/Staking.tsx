
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Wallet, Coins, ArrowUp } from 'lucide-react';

const Staking = () => {
  const [balance, setBalance] = useState(1000); // Mock MOR token balance
  const [stakedAmount, setStakedAmount] = useState(250); // Mock staked amount
  const [amountToStake, setAmountToStake] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [tier, setTier] = useState('Basic');
  
  // Calculate tier based on staked amount
  useEffect(() => {
    if (stakedAmount >= 1000) {
      setTier('Platinum');
    } else if (stakedAmount >= 500) {
      setTier('Gold');
    } else if (stakedAmount >= 100) {
      setTier('Silver');
    } else {
      setTier('Basic');
    }
  }, [stakedAmount]);

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
    
    setIsStaking(true);
    
    try {
      // Mock staking process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update balances
      setBalance(prev => prev - amount);
      setStakedAmount(prev => prev + amount);
      setAmountToStake('');
      
      toast.success(`Successfully staked ${amount} MOR tokens`);
    } catch (error) {
      toast.error('Failed to stake tokens. Please try again.');
      console.error(error);
    } finally {
      setIsStaking(false);
    }
  };

  const getNextTier = () => {
    if (stakedAmount < 100) return { name: 'Silver', required: 100 };
    if (stakedAmount < 500) return { name: 'Gold', required: 500 };
    if (stakedAmount < 1000) return { name: 'Platinum', required: 1000 };
    return { name: 'Maximum Tier Reached', required: stakedAmount };
  };

  const nextTier = getNextTier();
  const progressToNextTier = Math.min(100, (stakedAmount / nextTier.required) * 100);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">MOR Token Staking</h1>
        <p className="text-muted-foreground">Stake your MOR tokens to unlock premium features</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Balance</CardTitle>
            <CardDescription>Current MOR token holdings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{balance} MOR</p>
                <p className="text-sm text-muted-foreground">Available balance</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{stakedAmount} MOR</p>
                <p className="text-sm text-muted-foreground">Total staked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Stake Tokens</CardTitle>
            <CardDescription>Stake your MOR tokens to access premium features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stakeAmount">Amount to Stake</Label>
              <div className="flex space-x-2">
                <Input
                  id="stakeAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={amountToStake}
                  onChange={(e) => setAmountToStake(e.target.value)}
                />
                <Button onClick={handleStake} disabled={isStaking}>
                  {isStaking ? 'Staking...' : 'Stake'}
                  <ArrowUp className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Staking Tier</CardTitle>
            <CardDescription>Your current benefits and next tier progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Current Tier: {tier}</h3>
                <p className="text-sm text-muted-foreground">
                  {tier === 'Basic' && 'Limited access to API features'}
                  {tier === 'Silver' && 'Increased rate limits and standard support'}
                  {tier === 'Gold' && 'Higher rate limits and priority support'}
                  {tier === 'Platinum' && 'Maximum rate limits and dedicated support'}
                </p>
              </div>
              <div className="bg-primary/10 text-primary font-semibold rounded-full px-4 py-1">
                {tier}
              </div>
            </div>
            
            {tier !== 'Platinum' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress to {nextTier.name}</span>
                  <span>{stakedAmount} / {nextTier.required} MOR</span>
                </div>
                <Progress value={progressToNextTier} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Stake {nextTier.required - stakedAmount} more MOR tokens to reach the {nextTier.name} tier.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Silver Tier Benefits</h4>
                <ul className="text-sm space-y-1">
                  <li>• 100,000 requests per month</li>
                  <li>• Access to standard models</li>
                  <li>• Standard support response time</li>
                </ul>
                <div className="mt-2 text-xs text-muted-foreground">Requires 100 MOR</div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Gold Tier Benefits</h4>
                <ul className="text-sm space-y-1">
                  <li>• 500,000 requests per month</li>
                  <li>• Access to all models</li>
                  <li>• Priority support</li>
                </ul>
                <div className="mt-2 text-xs text-muted-foreground">Requires 500 MOR</div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Platinum Tier Benefits</h4>
                <ul className="text-sm space-y-1">
                  <li>• Unlimited requests</li>
                  <li>• Early access to new models</li>
                  <li>• Dedicated support</li>
                  <li>• Custom model training</li>
                </ul>
                <div className="mt-2 text-xs text-muted-foreground">Requires 1000 MOR</div>
              </div>
              
              <div className="border border-dashed rounded-lg p-4 flex flex-col justify-center items-center text-center">
                <h4 className="font-semibold mb-2">Need more tokens?</h4>
                <p className="text-sm text-muted-foreground">Contact our sales team to purchase additional MOR tokens</p>
                <Button variant="outline" className="mt-4">Contact Sales</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Staking;
