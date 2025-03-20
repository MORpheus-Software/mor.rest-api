import { useState, useEffect, useRef, useCallback } from 'react';
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
import { 
  fetchApiKeys, 
  updateApiKeyLastUsed,
  subscribeToApiKeyChanges
} from '@/lib/api/apiKeyService';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface ApiKey {
  id: string;
  value: string;
  label: string;
  isActive: boolean;
}

const models = [
  { id: process.env.REACT_APP_DEFAULT_MODEL_ID || 'llama-3.1', name: process.env.REACT_APP_DEFAULT_MODEL_NAME || 'LMR-Hermes-3-Llama-3.1-8B' },
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
  const [requestStatus, setRequestStatus] = useState<string>('');

  // Helper function to format API keys with full token value
  const formatApiKeys = (tokens: Token[]): ApiKey[] => {
    return tokens
      .filter(token => token.status === 'active')
      .map(token => ({
        id: token.id,
        value: token.token,
        label: `${token.token} (${token.name})`,
        isActive: true
      }));
  };

  // Define updateRequestCode with useCallback before it's used
  const updateRequestCode = useCallback((model: string, promptText: string, streaming: boolean, apiKey: string) => {
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
  }, []);

  const loadApiKeys = async () => {
    try {
      const tokens = await fetchApiKeys();
      const formattedApiKeys = formatApiKeys(tokens);
      
      setApiKeys(formattedApiKeys);
      
      if (formattedApiKeys.length > 0 && !selectedApiKey) {
        setSelectedApiKey(formattedApiKeys[0].id);
        updateRequestCode(
          selectedModel, 
          prompt, 
          isStreaming, 
          formattedApiKeys[0].value
        );
      }
      
      // Check if there's an apiKey parameter in the URL
      const params = new URLSearchParams(location.search);
      const apiKeyParam = params.get('apiKey');
      
      if (apiKeyParam) {
        const matchingToken = tokens.find(token => token.token === apiKeyParam && token.status === 'active');
        
        if (matchingToken) {
          const matchingKey = {
            id: matchingToken.id,
            value: matchingToken.token,
            label: `${matchingToken.token} (${matchingToken.name})`,
            isActive: true
          };
          
          setSelectedApiKey(matchingKey.id);
          updateRequestCode(selectedModel, prompt, isStreaming, matchingKey.value);
        }
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
      toast({
        title: "Failed to load API keys",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    // Load API keys initially
    loadApiKeys();
    
    // Subscribe to API key changes
    const unsubscribe = subscribeToApiKeyChanges(loadApiKeys);
    
    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [location.search, isStreaming, prompt, selectedModel, updateRequestCode]);

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
    setRequestStatus('Sending Request...');
    
    // Set a timeout to change the status label after 3 seconds
    const statusTimeout = setTimeout(() => {
      setRequestStatus('Opening Session...');
    }, 3000);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      console.log(`Making real API request to ${FRONTEND_API_ENDPOINT}/chat/completions`);
      
      const modelName = models.find(m => m.id === selectedModel)?.name || selectedModel;
      
      if (isStreaming) {
        // Handle streaming response
        const response = await fetch(`${FRONTEND_API_ENDPOINT}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            stream: true
          }),
          signal: abortControllerRef.current.signal
        });
        
        if (!response.ok) {
          clearTimeout(statusTimeout);
          const errorData = await response.text();
          throw new Error(`API request failed: ${response.status} ${errorData}`);
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let streamText = '';
        let firstChunkReceived = false;
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            if (!firstChunkReceived) {
              clearTimeout(statusTimeout);
              setRequestStatus('Streaming Response...');
              firstChunkReceived = true;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            
            // Handle SSE format for streaming responses
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') continue;
                
                try {
                  const json = JSON.parse(data);
                  const content = json.choices[0]?.delta?.content || '';
                  if (content) {
                    streamText += content;
                    setStreamingOutput(streamText);
                  }
                } catch (e) {
                  console.error('Error parsing SSE chunk:', e);
                }
              }
            }
          }
          
          setResponse(streamText);
        }
      } else {
        // Handle non-streaming response
        const response = await fetch(`${FRONTEND_API_ENDPOINT}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            stream: false
          }),
          signal: abortControllerRef.current.signal
        });
        
        if (!response.ok) {
          clearTimeout(statusTimeout);
          const errorData = await response.text();
          throw new Error(`API request failed: ${response.status} ${errorData}`);
        }
        
        clearTimeout(statusTimeout);
        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';
        setResponse(content);
      }
      
      // Update last used time for the token
      if (selectedApiKey) {
        updateApiKeyLastUsed(selectedApiKey);
      }
    } catch (error) {
      clearTimeout(statusTimeout);
      console.error('Error making request:', error);
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Request Failed",
          description: (error as Error).message || 'Failed to get a response. Please try again.',
          variant: "destructive"
        });
      }
    } finally {
      clearTimeout(statusTimeout);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setRequestStatus('');
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
              For testing purposes, each request opens a new session.  This takes about 30 seconds and will not be the case when you use the API in your apps.
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
                
                <div className="flex items-center space-x-2 mt-2">
                  <Label htmlFor="network">Network:</Label>
                  <ToggleGroup type="single" value="testnet" disabled>
                    <ToggleGroupItem value="mainnet" disabled>Mainnet</ToggleGroupItem>
                    <ToggleGroupItem value="testnet" disabled>Testnet</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                {apiKeys.length > 0 ? (
                  <Select 
                    value={selectedApiKey} 
                    onValueChange={handleApiKeyChange}
                  >
                    <SelectTrigger id="api-key" className="truncate max-w-full">
                      <SelectValue placeholder="Select an API key" />
                    </SelectTrigger>
                    <SelectContent>
                      {apiKeys.map(key => (
                        <SelectItem key={key.id} value={key.id} className="break-all">
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
              {isLoading ? requestStatus || 'Loading response...' : 'Result from the API'}
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
