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
import { FRONTEND_API_ENDPOINT } from '@/lib/api/constants';

export function ApiPlayground() {
  const { toast } = useToast();
  const [token, setToken] = useState('');
  const [endpoint, setEndpoint] = useState('/api/v1/user');
  const [method, setMethod] = useState('GET');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [requestBody, setRequestBody] = useState('{\n  "name": "John Doe"\n}');

  const handleSubmit = async (e: React.FormEvent) => {
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
  
  // New function to handle streaming responses
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
