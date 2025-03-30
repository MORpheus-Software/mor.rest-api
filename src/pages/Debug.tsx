import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isAuthenticated, getCurrentUser, logout, createTestUser, debugAuth } from '@/lib/auth';
import { FRONTEND_API_ENDPOINT } from '@/lib/api/constants';
import { DemoStakingClient } from '@/demoStakingClient';
import { getTokenBalance, getStakedBalance } from '@/services/ethService';

export default function DebugPage() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [authStatus, setAuthStatus] = useState<boolean>(false);
  const [userData, setUserData] = useState<any>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mockBalance, setMockBalance] = useState<number>(0);
  const [mockStakedBalance, setMockStakedBalance] = useState<number>(0);
  
  useEffect(() => {
    // Gather environment variables
    const vars: Record<string, string> = {};
    for (const key in import.meta.env) {
      if (typeof import.meta.env[key] === 'string') {
        vars[key] = import.meta.env[key];
      }
    }
    setEnvVars(vars);
    
    // Check authentication status
    setAuthStatus(isAuthenticated());

    // Test the DemoStakingClient
    const testDemoClient = async () => {
      try {
        // Check mock balance
        const balance = await getTokenBalance('mock-address');
        setMockBalance(balance);
        
        // Check mock staked balance
        const stakedBalance = await getStakedBalance('mock-address');
        setMockStakedBalance(stakedBalance);
      } catch (error) {
        console.error('Error testing demo client:', error);
      }
    };
    
    testDemoClient();
  }, []);
  
  // Check authentication status
  const checkAuth = () => {
    debugAuth();
    const status = isAuthenticated(true);
    setAuthStatus(status);
    setUserData(getCurrentUser());
  };
  
  // Create a test user
  const createTest = () => {
    const user = createTestUser(true);
    setAuthStatus(true);
    setUserData(user);
  };
  
  // Log out
  const handleLogout = () => {
    logout();
    setAuthStatus(false);
    setUserData(null);
  };
  
  // Test API connection
  const testApi = async () => {
    setIsLoading(true);
    
    try {
      // Test the health endpoint
      const response = await fetch(`${FRONTEND_API_ENDPOINT}/auth/me`, {
        headers: {
          'Authorization': `Bearer user-${userData?.id}-${Date.now()}`
        }
      });
      
      const data = await response.json();
      console.log('API response:', data);
      setApiResponse(data);
    } catch (error) {
      console.error('API error:', error);
      setApiResponse({ error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>Check and manage authentication state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Button onClick={checkAuth}>Check Auth</Button>
              <Button onClick={createTest} variant="outline">Create Test User</Button>
              <Button onClick={handleLogout} variant="destructive">Logout</Button>
            </div>
            
            {authStatus !== null && (
              <div className="mt-4 p-3 border rounded-md bg-muted">
                <p className="font-medium">
                  Status: <span className={authStatus ? "text-green-500" : "text-red-500"}>
                    {authStatus ? "Authenticated ✓" : "Not Authenticated ✗"}
                  </span>
                </p>
                
                {userData && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">User Data:</p>
                    <pre className="text-xs mt-1 p-2 bg-background rounded overflow-auto">
                      {JSON.stringify(userData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>API Connection Test</CardTitle>
            <CardDescription>Test connection to the backend</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testApi} 
              disabled={isLoading || !authStatus}
            >
              {isLoading ? "Testing..." : "Test API Connection"}
            </Button>
            
            {apiResponse && (
              <div className="mt-4 p-3 border rounded-md bg-muted">
                <p className="font-medium mb-2">API Response:</p>
                <pre className="text-xs p-2 bg-background rounded overflow-auto">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Info</CardTitle>
            <CardDescription>Details about the authentication system</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Authentication state is stored in localStorage: <code>isAuthenticated</code> and <code>user</code></li>
              <li>API tokens are generated in the format: <code>user-{'{userId}'}-{'{timestamp}'}</code></li>
              <li>Auth tokens are sent via the Authorization header: <code>Bearer user-xxx-123</code></li>
              <li>Logout clears the localStorage items</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6 flex justify-center">
        <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
          Go to Dashboard
        </Button>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>Details about the environment</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
              {JSON.stringify(envVars, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Staking Demo Client Test</CardTitle>
            <CardDescription>Test the DemoStakingClient</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="border p-3 rounded-lg">
                <p className="font-medium">Mock Token Balance</p>
                <p className="text-xl">{mockBalance} MOR</p>
              </div>
              <div className="border p-3 rounded-lg">
                <p className="font-medium">Mock Staked Balance</p>
                <p className="text-xl">{mockStakedBalance} MOR</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 