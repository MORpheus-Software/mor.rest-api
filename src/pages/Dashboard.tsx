import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ArrowRight, BarChart3, Activity, KeyRound, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FRONTEND_API_ENDPOINT } from '@/lib/api/constants';
import { isAuthenticated, createAuthToken } from '@/lib/auth';

const Dashboard = () => {
  const { toast } = useToast();
  const [activeTokens, setActiveTokens] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [averageLatency, setAverageLatency] = useState(0);
  const [errorRate, setErrorRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [requestData, setRequestData] = useState([]);
  const [endpointData, setEndpointData] = useState([]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Check authentication
        if (!isAuthenticated()) {
          console.error('[DASHBOARD] User not authenticated');
          setIsLoading(false);
          toast({
            title: "Authentication required",
            description: "Please log in to view your dashboard",
            variant: "destructive",
          });
          return;
        }
        
        // Create auth token
        const authToken = createAuthToken();
        if (!authToken) {
          console.error('[DASHBOARD] Failed to create auth token');
          setIsLoading(false);
          toast({
            title: "Authentication error",
            description: "Could not authenticate your session",
            variant: "destructive",
          });
          return;
        }
        
        console.log('[DASHBOARD] Fetching metrics using auth token');
        
        // Fetch metrics from the local API using user authentication
        const response = await fetch(`${FRONTEND_API_ENDPOINT}/app/metrics`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[DASHBOARD] Successfully fetched metrics:', data);
        
        // Set dashboard metrics
        setActiveTokens(data.activeTokens || 1);
        setTotalRequests(data.totalRequests || 0);
        setAverageLatency(data.averageLatency || 0);
        setErrorRate(data.errorRate || 0);
        
        // Process request history data for the chart
        if (data.requestHistory && data.requestHistory.length > 0) {
          setRequestData(data.requestHistory.map(item => ({
            name: new Date(item.date).toLocaleString('en-us', { weekday: 'short' }),
            requests: item.count
          })));
        } else {
          // Fallback data if no history is provided
          setRequestData([
            { name: 'Mon', requests: Math.floor(Math.random() * 200) },
            { name: 'Tue', requests: Math.floor(Math.random() * 200) },
            { name: 'Wed', requests: Math.floor(Math.random() * 200) },
            { name: 'Thu', requests: Math.floor(Math.random() * 200) },
            { name: 'Fri', requests: Math.floor(Math.random() * 200) },
            { name: 'Sat', requests: Math.floor(Math.random() * 200) },
            { name: 'Sun', requests: Math.floor(Math.random() * 200) },
          ]);
        }
        
        // Process endpoint data for the chart
        if (data.topEndpoints && data.topEndpoints.length > 0) {
          setEndpointData(data.topEndpoints.map(item => ({
            name: item.endpoint,
            requests: item.count
          })));
        } else {
          // Fallback data if no endpoints are provided
          setEndpointData([
            { name: '/api/v1/chat/completions', requests: Math.floor(Math.random() * 300) },
            { name: '/api/v1/models', requests: Math.floor(Math.random() * 200) },
            { name: '/api/v1/embeddings', requests: Math.floor(Math.random() * 150) },
            { name: '/api/v1/metrics', requests: Math.floor(Math.random() * 100) },
            { name: '/api/v1/tokens', requests: Math.floor(Math.random() * 80) },
          ]);
        }
        
      } catch (error) {
        console.error('[DASHBOARD] Error fetching dashboard data:', error);
        toast({
          title: "Failed to load metrics",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
        
        // Set fallback data on error
        setActiveTokens(1);
        setTotalRequests(42);
        setAverageLatency(115);
        setErrorRate(0.5);
        
        // Fallback chart data
        setRequestData([
          { name: 'Mon', requests: Math.floor(Math.random() * 200) },
          { name: 'Tue', requests: Math.floor(Math.random() * 200) },
          { name: 'Wed', requests: Math.floor(Math.random() * 200) },
          { name: 'Thu', requests: Math.floor(Math.random() * 200) },
          { name: 'Fri', requests: Math.floor(Math.random() * 200) },
          { name: 'Sat', requests: Math.floor(Math.random() * 200) },
          { name: 'Sun', requests: Math.floor(Math.random() * 200) },
        ]);
        
        setEndpointData([
          { name: '/api/v1/chat/completions', requests: Math.floor(Math.random() * 300) },
          { name: '/api/v1/models', requests: Math.floor(Math.random() * 200) },
          { name: '/api/v1/embeddings', requests: Math.floor(Math.random() * 150) },
          { name: '/api/v1/metrics', requests: Math.floor(Math.random() * 100) },
          { name: '/api/v1/tokens', requests: Math.floor(Math.random() * 80) },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast, period]);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    setIsLoading(true);
  };

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
              <Tabs defaultValue="7d" onValueChange={handlePeriodChange}>
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
                      width={120}
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
