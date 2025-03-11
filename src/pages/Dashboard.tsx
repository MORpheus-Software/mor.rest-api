
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ArrowRight, BarChart3, Activity, KeyRound, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { toast } = useToast();
  const [activeTokens, setActiveTokens] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [averageLatency, setAverageLatency] = useState(0);
  const [errorRate, setErrorRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  
  // Sample data for charts
  const requestData = [
    { name: 'Mon', requests: 120 },
    { name: 'Tue', requests: 145 },
    { name: 'Wed', requests: 132 },
    { name: 'Thu', requests: 167 },
    { name: 'Fri', requests: 189 },
    { name: 'Sat', requests: 102 },
    { name: 'Sun', requests: 94 },
  ];
  
  const endpointData = [
    { name: '/api/users', requests: 250 },
    { name: '/api/products', requests: 180 },
    { name: '/api/orders', requests: 120 },
    { name: '/api/auth', requests: 90 },
    { name: '/api/payments', requests: 60 },
  ];
  
  useEffect(() => {
    // Simulate loading data from API
    setTimeout(() => {
      setActiveTokens(3);
      setTotalRequests(949);
      setAverageLatency(126);
      setErrorRate(1.2);
      setIsLoading(false);
    }, 1000);
  }, []);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your API usage and token statistics</p>
        </div>
        <Button asChild>
          <Link to="/tokens">
            Manage Tokens
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="shadow-subtle animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Tokens</p>
                {isLoading ? (
                  <div className="h-9 w-20 bg-muted animate-pulse rounded mt-1"></div>
                ) : (
                  <h3 className="text-3xl font-bold mt-1">{activeTokens}</h3>
                )}
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-subtle animate-fade-in animation-delay-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                {isLoading ? (
                  <div className="h-9 w-20 bg-muted animate-pulse rounded mt-1"></div>
                ) : (
                  <h3 className="text-3xl font-bold mt-1">{totalRequests}</h3>
                )}
              </div>
              <div className="rounded-full bg-green-500/10 p-3">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-subtle animate-fade-in animation-delay-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Latency</p>
                {isLoading ? (
                  <div className="h-9 w-20 bg-muted animate-pulse rounded mt-1"></div>
                ) : (
                  <h3 className="text-3xl font-bold mt-1">{averageLatency} ms</h3>
                )}
              </div>
              <div className="rounded-full bg-blue-500/10 p-3">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-subtle animate-fade-in animation-delay-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                {isLoading ? (
                  <div className="h-9 w-20 bg-muted animate-pulse rounded mt-1"></div>
                ) : (
                  <h3 className="text-3xl font-bold mt-1">{errorRate}%</h3>
                )}
              </div>
              <div className="rounded-full bg-amber-500/10 p-3">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-subtle col-span-1 lg:col-span-2 animate-fade-in">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>API Requests</CardTitle>
                <CardDescription>Request volume over time</CardDescription>
              </div>
              <Tabs defaultValue="7d" onValueChange={setPeriod}>
                <TabsList>
                  <TabsTrigger value="24h">24h</TabsTrigger>
                  <TabsTrigger value="7d">7d</TabsTrigger>
                  <TabsTrigger value="30d">30d</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] bg-muted/50 animate-pulse rounded"></div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={requestData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--muted))' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                      }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="requests" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fill="url(#colorRequests)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-subtle animate-fade-in animation-delay-100">
          <CardHeader>
            <CardTitle>Top Endpoints</CardTitle>
            <CardDescription>Most frequently accessed API endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[250px] bg-muted/50 animate-pulse rounded"></div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={endpointData}
                    layout="vertical"
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis 
                      type="number" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--muted))' }}
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                      }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Bar 
                      dataKey="requests" 
                      fill="rgba(var(--primary), 0.7)" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
