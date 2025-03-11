
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Code, Play, FileJson, Copy } from 'lucide-react';

export function ApiPlayground() {
  const { toast } = useToast();
  const [token, setToken] = useState('');
  const [endpoint, setEndpoint] = useState('/api/v1/user');
  const [method, setMethod] = useState('GET');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [requestBody, setRequestBody] = useState('{\n  "name": "John Doe"\n}');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: "API token required",
        description: "Please enter an API token to make a request",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setResponse(null);
    setResponseTime(null);
    
    const startTime = performance.now();
    
    // Simulate API call
    setTimeout(() => {
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      
      let mockResponse;
      
      if (endpoint === '/api/v1/user') {
        switch (method) {
          case 'GET':
            mockResponse = {
              status: 200,
              data: {
                id: '123',
                name: 'Demo User',
                email: 'demo@tokenhub.com',
                createdAt: new Date().toISOString(),
              }
            };
            break;
          case 'POST':
            mockResponse = {
              status: 201,
              data: {
                message: 'User created successfully',
                user: {
                  id: '456',
                  ...JSON.parse(requestBody),
                  createdAt: new Date().toISOString(),
                }
              }
            };
            break;
          case 'PUT':
            mockResponse = {
              status: 200,
              data: {
                message: 'User updated successfully',
                user: {
                  id: '123',
                  ...JSON.parse(requestBody),
                  updatedAt: new Date().toISOString(),
                }
              }
            };
            break;
          case 'DELETE':
            mockResponse = {
              status: 204,
              data: null
            };
            break;
          default:
            mockResponse = {
              status: 400,
              error: 'Invalid method'
            };
        }
      } else if (endpoint === '/api/v1/tokens') {
        mockResponse = {
          status: 200,
          data: {
            tokens: [
              {
                id: '1',
                name: 'Production API',
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString(),
              },
              {
                id: '2',
                name: 'Development API',
                createdAt: new Date().toISOString(),
                lastUsed: null,
              }
            ]
          }
        };
      } else {
        mockResponse = {
          status: 404,
          error: 'Endpoint not found'
        };
      }
      
      setResponse(mockResponse);
      setIsLoading(false);
    }, 800);
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
      <Card className="shadow-subtle animate-fade-in">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            <CardTitle>API Playground</CardTitle>
          </div>
          <CardDescription>Test your API tokens with different endpoints and methods</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">API Token</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your API token"
                className="font-mono text-sm"
                disabled={isLoading}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="method">Method</Label>
                <Select 
                  value={method} 
                  onValueChange={setMethod}
                  disabled={isLoading}
                >
                  <SelectTrigger id="method">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="endpoint">Endpoint</Label>
                <Select 
                  value={endpoint} 
                  onValueChange={setEndpoint}
                  disabled={isLoading}
                >
                  <SelectTrigger id="endpoint">
                    <SelectValue placeholder="Select endpoint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="/api/v1/user">/api/v1/user</SelectItem>
                    <SelectItem value="/api/v1/tokens">/api/v1/tokens</SelectItem>
                    <SelectItem value="/api/v1/custom">/api/v1/custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {(method === 'POST' || method === 'PUT') && (
              <div className="space-y-2">
                <Label htmlFor="body">Request Body</Label>
                <div className="relative">
                  <textarea
                    id="body"
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="w-full min-h-[120px] font-mono text-sm p-3 rounded-md border border-input bg-background"
                    disabled={isLoading}
                  />
                  <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    JSON
                  </div>
                </div>
              </div>
            )}
            
            <div className="pt-2">
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                <Play className="mr-2 h-4 w-4" />
                {isLoading ? "Sending Request..." : "Send Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {response && (
        <Card className="shadow-subtle animate-fade-in">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="h-5 w-5 text-primary" />
                <CardTitle>Response</CardTitle>
              </div>
              
              <div className="flex items-center gap-2">
                {responseTime && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {responseTime}ms
                  </span>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8"
                  onClick={copyResponse}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
            </div>
            <Separator className="mt-3" />
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-auto max-h-[400px] text-sm">
              <code>{JSON.stringify(response, null, 2)}</code>
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
