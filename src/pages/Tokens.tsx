import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { TokensTable, Token } from '@/components/dashboard/TokensTable';
import { CreateTokenDialog } from '@/components/dashboard/CreateTokenDialog';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { 
  fetchApiKeys, 
  createApiKey, 
  updateApiKeyStatus, 
  deleteApiKey, 
  updateApiKeyLastUsed,
  subscribeToApiKeyChanges
} from '@/lib/api/apiKeyService';

const TokensPage = () => {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const loadTokens = async () => {
    try {
      setIsLoading(true);
      const fetchedTokens = await fetchApiKeys();
      setTokens(fetchedTokens);
    } catch (error) {
      console.error('Error loading tokens:', error);
      toast({
        title: "Failed to load API keys",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Load tokens initially
    loadTokens();
    
    // Subscribe to API key changes
    const unsubscribe = subscribeToApiKeyChanges(loadTokens);
    
    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [toast]);
  
  const handleCreateToken = async (tokenData: { name: string }) => {
    try {
      // Create token using the service
      await createApiKey(tokenData.name);
      
      // Toast notification
      toast({
        title: "API key created",
        description: "Your new API key has been created successfully",
      });
      
      // Close the dialog
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating token:', error);
      toast({
        title: "Failed to create API key",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };
  
  const handleActivateToken = async (id: string) => {
    try {
      // Activate token using the service
      await updateApiKeyStatus(id, 'active');
      
      toast({
        title: "API key activated",
        description: "The API key is now active and can be used for requests",
      });
    } catch (error) {
      console.error('Error activating token:', error);
      toast({
        title: "Failed to activate API key",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };
  
  const handleDeactivateToken = async (id: string) => {
    try {
      // Deactivate token using the service
      await updateApiKeyStatus(id, 'inactive');
      
      toast({
        title: "API key deactivated",
        description: "The API key has been deactivated and can no longer be used",
      });
    } catch (error) {
      console.error('Error deactivating token:', error);
      toast({
        title: "Failed to deactivate API key",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteToken = async (id: string) => {
    try {
      // Delete token using the service
      await deleteApiKey(id);
      
      toast({
        title: "API key deleted",
        description: "The API key has been permanently deleted",
      });
    } catch (error) {
      console.error('Error deleting token:', error);
      toast({
        title: "Failed to delete API key",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };
  
  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    
    toast({
      title: "API key copied",
      description: "The API key has been copied to your clipboard",
    });
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
    updateApiKeyLastUsed(id);
    
    // Redirect to playground with this token
    window.location.href = `/playground?apiKey=${token?.token}`;
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
