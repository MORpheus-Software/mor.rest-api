
import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Code } from 'lucide-react';

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
  
  // Mock API keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    { 
      id: '1', 
      value: 'sk-2c528daeee9d9806e284b9f15bd51809e01cca7f5f9bcfce', 
      label: 'sk-2c52...cfce (OpenAI-compatible)',
      isActive: true
    }
  ]);
  const [selectedApiKey, setSelectedApiKey] = useState(apiKeys[0]?.id);

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    updateRequestCode(value, prompt, isStreaming, apiKeys.find(k => k.id === selectedApiKey)?.value || '');
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    updateRequestCode(selectedModel, e.target.value, isStreaming, apiKeys.find(k => k.id === selectedApiKey)?.value || '');
  };

  const handleStreamingChange = (checked: boolean) => {
    setIsStreaming(checked);
    updateRequestCode(selectedModel, prompt, checked, apiKeys.find(k => k.id === selectedApiKey)?.value || '');
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
      
    } catch (error) {
      console.error('Error making request:', error);
      toast.error('Failed to get a response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewApiKey = () => {
    toast.info('This would open a dialog to add a new API key in a real application.');
  };

  const deactivateApiKey = (keyId: string) => {
    setApiKeys(apiKeys.map(key => 
      key.id === keyId ? { ...key, isActive: false } : key
    ));
    toast.success('API key deactivated successfully');
  };

  const removeApiKey = (keyId: string) => {
    setApiKeys(apiKeys.filter(key => key.id !== keyId));
    toast.success('API key removed successfully');
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">API Playground</h1>
        <p className="text-muted-foreground">Test your API tokens and interact with AI models</p>
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>API Rate Limiting</CardTitle>
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
                  <Label>Select API Key ({apiKeys.filter(k => k.isActive).length} active):</Label>
                  <Select value={selectedApiKey} onValueChange={handleApiKeyChange}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select API key" />
                    </SelectTrigger>
                    <SelectContent>
                      {apiKeys.filter(k => k.isActive).map(key => (
                        <SelectItem key={key.id} value={key.id}>
                          {key.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button onClick={handleSubmit} disabled={isLoading} className="ml-4">
                    Make request
                  </Button>
                </div>
                
                {apiKeys.map(key => (
                  <div key={key.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <div className="font-mono text-sm">{key.value}</div>
                      <div className="text-sm text-muted-foreground">OpenAI-compatible</div>
                    </div>
                    <div className="flex space-x-2">
                      {key.isActive ? (
                        <Button 
                          variant="outline" 
                          className="bg-blue-500 hover:bg-blue-600 text-white" 
                          onClick={() => deactivateApiKey(key.id)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button 
                          variant="outline"
                          onClick={() => setApiKeys(apiKeys.map(k => 
                            k.id === key.id ? { ...k, isActive: true } : k
                          ))}
                        >
                          Activate
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        onClick={() => removeApiKey(key.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleAddNewApiKey}
                >
                  Add new API Key
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ApiPlayground;
