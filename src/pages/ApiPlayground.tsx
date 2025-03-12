
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { Token } from '@/components/dashboard/TokensTable';

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
  
  // API keys from localStorage
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');

  useEffect(() => {
    // Load API keys from localStorage
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
      
      // If there are keys, select the first one
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
    
    // Check for apiKey query parameter
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
    const code = `fetch('/api/v1/chat/completions', {
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
      toast.error('Please enter a prompt');
      return;
    }
    
    setIsLoading(true);
    setResponse(null);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a mock response
      const mockResponses = [
        "Hello! I'm an AI assistant. How can I help you today?",
        "Hi there! I'm happy to assist with any questions or tasks you may have.",
        "Greetings! I'm here to help. What would you like to know?",
        "Hello! Thank you for your message. I'm ready to assist you with your queries.",
      ];
      
      const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      setResponse(randomResponse);
      
      // Update last used time for the API key in localStorage
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
      toast.error('Failed to get a response. Please try again.');
    } finally {
      setIsLoading(false);
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
              Click "Make Request" below to test the API. Look for the response in box below labeled "Response"
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
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter your prompt here..."
                  value={prompt}
                  onChange={handlePromptChange}
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <pre>{requestCode}</pre>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="response">Response</Label>
                <div className="min-h-[200px] bg-slate-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : response ? (
                    <pre>{response}</pre>
                  ) : (
                    <div className="text-muted-foreground">Response will appear here</div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Select API Key ({apiKeys.length} available):</Label>
                  {apiKeys.length > 0 ? (
                    <Select value={selectedApiKey} onValueChange={handleApiKeyChange}>
                      <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Select API key" />
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
                    <div className="text-muted-foreground">No API keys available</div>
                  )}
                  
                  <Button onClick={handleSubmit} disabled={isLoading || apiKeys.length === 0} className="ml-4">
                    Make request
                  </Button>
                </div>
                
                {apiKeys.length === 0 ? (
                  <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-lg text-center">
                    <p className="mb-4">You don't have any active API keys.</p>
                    <Button onClick={redirectToTokensPage}>
                      Create API Key
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Using API Key</p>
                        <p className="font-mono text-xs mt-1">
                          {apiKeys.find(k => k.id === selectedApiKey)?.value.substring(0, 12)}...
                        </p>
                      </div>
                      <Button variant="outline" onClick={redirectToTokensPage}>
                        Manage API Keys
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ApiPlayground;
