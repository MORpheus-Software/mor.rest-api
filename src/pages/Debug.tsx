import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isAuthenticated, getCurrentUser, logout, createTestUser, debugAuth } from '@/lib/auth';
import { FRONTEND_API_ENDPOINT } from '@/lib/api/constants';

export default function DebugPage() {
  const [authStatus, setAuthStatus] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
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
    </div>
  );
} 