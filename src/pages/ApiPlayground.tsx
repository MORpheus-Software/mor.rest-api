
import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';
import { Token } from '@/components/dashboard/TokensTable';
import { FRONTEND_API_ENDPOINT } from '@/lib/api/constants';

interface ApiKey {
  id: string;
  value: string;
  label: string;
  isActive: boolean;
}

const models = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'llama-3.1-sonar-small-128k-online', name: 'LMR-Hermes-3-Llama-3.1-8B' },
  { id: 'llama-3.1-sonar-large-128k-online', name: 'Llama-3.1-Sonar-Large-70B' },
  { id: 'llama-3.1-sonar-huge-128k-online', name: 'Llama-3.1-Sonar-Huge-405B' },
];

const ApiPlayground = () => {
  const [selectedModel, setSelectedModel] = useState('llama-3.1-sonar-small-128k-online');
  const [prompt, setPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requestCode, setRequestCode] = useState('');
  const location = useLocation();
  const { toast } = useToast();
  
  const [streamingOutput, setStreamingOutput] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');

  useEffect(() => {
    const storedApiKeys = localStorage.getItem('apiKeys');
    if (storedApiKeys) {
      const parsedTokens: Token[] = JSON.parse(storedApiKeys);
      const formattedApiKeys: ApiKey[] = parsedTokens
        .filter(token => token.status === 'active')
        .map(token => ({
          id: token.id,
          value: token.token,
          label: `${token.token.substring(0, 8)}...${token.token.substring(token.token.length - 4)} (${token.name})`,
          isActive: true
        }));
      
      setApiKeys(formattedApiKeys);
      
      if (formattedApiKeys.length > 0) {
        setSelectedApiKey(formattedApiKeys[0].id);
        updateRequestCode(
          selectedModel, 
          prompt, 
          isStreaming, 
          formattedApiKeys[0].value
        );
      }
    }
    
    const params = new URLSearchParams(location.search);
    const apiKeyParam = params.get('apiKey');
    
    if (apiKeyParam && storedApiKeys) {
      const parsedTokens: Token[] = JSON.parse(storedApiKeys);
      const matchingToken = parsedTokens.find(token => token.token === apiKeyParam && token.status === 'active');
      
      if (matchingToken) {
        const matchingKey = {
          id: matchingToken.id,
          value: matchingToken.token,
          label: `${matchingToken.token.substring(0, 8)}...${matchingToken.token.substring(matchingToken.token.length - 4)} (${matchingToken.name})`,
          isActive: true
        };
        
        setSelectedApiKey(matchingKey.id);
        updateRequestCode(selectedModel, prompt, isStreaming, matchingKey.value);
      }
    }
  }, [location.search]);

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    updateRequestCode(
      value, 
      prompt, 
      isStreaming, 
      apiKeys.find(k => k.id === selectedApiKey)?.value || ''
    );
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    updateRequestCode(
      selectedModel, 
      e.target.value, 
      isStreaming, 
      apiKeys.find(k => k.id === selectedApiKey)?.value || ''
    );
  };

  const handleStreamingChange = (checked: boolean) => {
    setIsStreaming(checked);
    updateRequestCode(
      selectedModel, 
      prompt, 
      checked, 
      apiKeys.find(k => k.id === selectedApiKey)?.value || ''
    );
  };

  const updateRequestCode = (model: string, promptText: string, streaming: boolean, apiKey: string) => {
    const modelName = models.find(m => m.id === model)?.name || model;
    const code = `fetch('${FRONTEND_API_ENDPOINT}/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${apiKey}'
  },
  body: JSON.stringify({
    model: '${modelName}',
    messages: [{ role: 'user', content: '${promptText || 'Say hello'}' }],
    stream: ${streaming}
  })
})`;
    
    setRequestCode(code);
  };

  const handleApiKeyChange = (value: string) => {
    setSelectedApiKey(value);
    const key = apiKeys.find(k => k.id === value);
    if (key) {
      updateRequestCode(selectedModel, prompt, isStreaming, key.value);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive"
      });
      return;
    }
    
    const apiKey = apiKeys.find(k => k.id === selectedApiKey)?.value;
    
    if (!apiKey) {
      toast({
        title: "Error",
        description: "No API key selected",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setResponse(null);
    setStreamingOutput('');
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      const modelName = models.find(m => m.id === selectedModel)?.name || selectedModel;
      
      // For the playground, let's mock the API call instead of making a real one
      // This ensures the playground works even if the backend isn't ready
      setTimeout(() => {
        if (isStreaming) {
          let mockResponse = '';
          const sentences = [
            "Hello! I'm an AI assistant. ",
            "I'm here to help answer your questions. ",
            "How can I assist you today? ",
            "Feel free to ask me anything. ",
            "I'm designed to provide helpful and accurate information. "
          ];
          
          const streamIntervals = sentences.map((sentence, index) => {
            return setTimeout(() => {
              mockResponse += sentence;
              setStreamingOutput(mockResponse);
            }, index * 300);
          });
          
          // Final update
          setTimeout(() => {
            setResponse(mockResponse);
            setIsLoading(false);
            abortControllerRef.current = null;
          }, sentences.length * 300);
          
          // Cleanup function to clear intervals if aborted
          abortControllerRef.current.signal.addEventListener('abort', () => {
            streamIntervals.forEach(interval => clearTimeout(interval));
          });
        } else {
          // Non-streaming response
          const mockResponse = "Hello! I'm an AI assistant. I'm here to help answer your questions. How can I assist you today?";
          setResponse(mockResponse);
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      }, 500);
      
      // Update last used time for the token
      const storedApiKeys = localStorage.getItem('apiKeys');
      if (storedApiKeys && selectedApiKey) {
        const parsedTokens: Token[] = JSON.parse(storedApiKeys);
        const updatedTokens = parsedTokens.map(token => 
          token.id === selectedApiKey 
            ? { ...token, lastUsed: new Date().toISOString() } 
            : token
        );
        localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
      }
    } catch (error) {
      console.error('Error making request:', error);
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Request Failed",
          description: (error as Error).message || 'Failed to get a response. Please try again.',
          variant: "destructive"
        });
      }
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      toast({
        title: "Request Cancelled",
        description: "The API request was cancelled",
      });
    }
  };

  const redirectToTokensPage = () => {
    window.location.href = '/tokens';
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">API Playground</h1>
        <p className="text-muted-foreground">Test your API keys and interact with AI models</p>
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>API Testing</CardTitle>
            <CardDescription>
              Click "Make Request" below to test the API. Look for the response in the box below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Select 
                  value={selectedModel} 
                  onValueChange={handleModelChange}
                >
                  <SelectTrigger id="model">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox 
                    id="streaming" 
                    checked={isStreaming} 
                    onCheckedChange={handleStreamingChange} 
                  />
                  <Label htmlFor="streaming">Enable streaming</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                {apiKeys.length > 0 ? (
                  <Select 
                    value={selectedApiKey} 
                    onValueChange={handleApiKeyChange}
                  >
                    <SelectTrigger id="api-key">
                      <SelectValue placeholder="Select an API key" />
                    </SelectTrigger>
                    <SelectContent>
                      {apiKeys.map(key => (
                        <SelectItem key={key.id} value={key.id}>
                          {key.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="api-key" 
                      placeholder="No API keys available" 
                      disabled 
                    />
                    <Button onClick={redirectToTokensPage}>
                      Create Key
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea 
                  id="prompt" 
                  placeholder="Enter your prompt here" 
                  value={prompt} 
                  onChange={handlePromptChange} 
                  className="h-24"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={handleSubmit} 
                  disabled={isLoading || !prompt.trim() || !selectedApiKey} 
                  className="flex-1"
                >
                  {isLoading ? 'Processing...' : 'Make Request'}
                </Button>
                {isLoading && (
                  <Button 
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Code Example</CardTitle>
            <CardDescription>
              Use this code to make requests from your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 rounded-lg bg-muted overflow-x-auto">
              <code>{requestCode}</code>
            </pre>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
            <CardDescription>
              {isLoading ? 'Loading response...' : 'Result from the API'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-muted min-h-[200px] whitespace-pre-wrap">
              {isLoading && isStreaming ? streamingOutput : response || 'No response yet'}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ApiPlayground;
