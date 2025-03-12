
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { TokensTable, Token } from '@/components/dashboard/TokensTable';
import { CreateTokenDialog } from '@/components/dashboard/CreateTokenDialog';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const TokensPage = () => {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  useEffect(() => {
    // Simulate fetching tokens from API
    setTimeout(() => {
      // Check if we have tokens in localStorage
      const savedTokens = localStorage.getItem('apiKeys');
      
      if (savedTokens) {
        setTokens(JSON.parse(savedTokens));
      } else {
        // Generate some sample tokens if none exist
        const sampleTokens: Token[] = [
          {
            id: uuidv4(),
            name: 'Production API',
            token: `sk_${uuidv4().replace(/-/g, '')}`,
            status: 'active',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: uuidv4(),
            name: 'Development API',
            token: `sk_${uuidv4().replace(/-/g, '')}`,
            status: 'active',
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            lastUsed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: uuidv4(),
            name: 'Testing Server',
            token: `sk_${uuidv4().replace(/-/g, '')}`,
            status: 'inactive',
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            lastUsed: null
          }
        ];
        
        setTokens(sampleTokens);
        localStorage.setItem('apiKeys', JSON.stringify(sampleTokens));
      }
      
      setIsLoading(false);
    }, 1000);
  }, []);
  
  const handleCreateToken = (token: Token) => {
    const updatedTokens = [...tokens, token];
    setTokens(updatedTokens);
    localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
    setIsCreateDialogOpen(false);
  };
  
  const handleActivateToken = (id: string) => {
    const updatedTokens = tokens.map(token => 
      token.id === id ? { ...token, status: 'active' as const } : token
    );
    
    setTokens(updatedTokens);
    localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
    
    toast({
      title: "API key activated",
      description: "The API key is now active and can be used for authentication",
    });
  };
  
  const handleDeactivateToken = (id: string) => {
    const updatedTokens = tokens.map(token => 
      token.id === id ? { ...token, status: 'inactive' as const } : token
    );
    
    setTokens(updatedTokens);
    localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
    
    toast({
      title: "API key deactivated",
      description: "The API key is now inactive and cannot be used for authentication",
    });
  };
  
  const handleDeleteToken = (id: string) => {
    const updatedTokens = tokens.filter(token => token.id !== id);
    
    setTokens(updatedTokens);
    localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
    
    toast({
      title: "API key deleted",
      description: "The API key has been permanently deleted",
    });
  };
  
  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
  };
  
  const handleTestToken = (id: string) => {
    const token = tokens.find(t => t.id === id);
    
    if (token?.status === 'inactive') {
      toast({
        title: "Cannot test inactive key",
        description: "Please activate the key before testing",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Testing API key",
      description: "Redirecting to API playground...",
    });
    
    // Update last used time
    const updatedTokens = tokens.map(t => 
      t.id === id ? { ...t, lastUsed: new Date().toISOString() } : t
    );
    
    setTokens(updatedTokens);
    localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
    
    // Redirect to playground with this token
    window.location.href = `/playground?apiKey=${tokens.find(t => t.id === id)?.token}`;
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">Manage the API keys used to authenticate with our API</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>
      
      {isLoading ? (
        <div className="rounded-lg border h-[400px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading API keys...</div>
        </div>
      ) : (
        <TokensTable
          tokens={tokens}
          onActivate={handleActivateToken}
          onDeactivate={handleDeactivateToken}
          onDelete={handleDeleteToken}
          onCopy={handleCopyToken}
          onTest={handleTestToken}
        />
      )}
      
      <CreateTokenDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateToken={handleCreateToken}
      />
    </DashboardLayout>
  );
};

export default TokensPage;
