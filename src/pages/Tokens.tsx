import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { TokensTable, Token } from '@/components/dashboard/TokensTable';
import { CreateTokenDialog } from '@/components/dashboard/CreateTokenDialog';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';
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
      // First check if user is authenticated
      if (!isAuthenticated(true)) {
        console.error('[TOKENS] User not authenticated when attempting to create API key');
        toast({
          title: "Authentication error",
          description: "Please sign in again to create API keys",
          variant: "destructive"
        });
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/signin';
        }, 2000);
        return;
      }
      
      // Create token using the service
      console.log(`[TOKENS] Creating new API key "${tokenData.name}"`);
      const newToken = await createApiKey(tokenData.name);
      
      // Validate new token
      if (!newToken.token || !newToken.token.startsWith('sk-') || newToken.token.length < 35) {
        console.error('[TOKENS] Created API key has invalid format:', newToken);
        
        // Still show success but warn about potential issues
        toast({
          title: "API key created with warnings",
          description: "Your API key was created but may have validation issues. Check the console for details.",
          variant: "warning"
        });
      } else {
        // Success toast and emit the token to the dialog
        toast({
          title: "API key created",
          description: "Your new API key has been created successfully",
        });
        
        // Emit custom event with token data for the dialog to capture
        const tokenEvent = new CustomEvent('tokenCreated', { 
          detail: { token: newToken },
          bubbles: true
        });
        window.dispatchEvent(tokenEvent);
        console.log('[TOKENS] Emitted tokenCreated event with new token');
      }
      
      // Force reload tokens to make sure we have the latest data
      await loadTokens();
      
      // Don't close the dialog here - let the user close it after seeing the key
      // The dialog will stay open to display the new key
    } catch (error) {
      console.error('[TOKENS] Error creating token:', error);
      
      // Provide more specific error messages based on the error
      let errorMessage = "Please try again later";
      
      if (error instanceof Error) {
        if (error.message.includes('User not authenticated')) {
          errorMessage = "Authentication error - please sign in again";
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/signin';
          }, 2000);
        } else if (error.message.includes('Failed to create auth token')) {
          errorMessage = "Authentication token error - please sign in again";
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Network error - please check your connection";
        } else {
          // Include part of the error message for debugging
          const safeMessage = error.message.substring(0, 100);
          errorMessage = `Server error: ${safeMessage}`;
        }
      }
      
      toast({
        title: "Failed to create API key",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Close dialog on error
      setIsCreateDialogOpen(false);
    }
  };
  
  const handleActivateToken = async (id: string) => {
    try {
      const token = tokens.find(t => t.id === id);
      
      if (token?.isIncomplete) {
        toast({
          title: "Cannot activate invalid key",
          description: "This key has missing data. Please delete and create a new key.",
          variant: "destructive",
        });
        return;
      }
      
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
    
    if (!token) {
      return;
    }
    
    if (token.isIncomplete) {
      toast({
        title: "Cannot test invalid key",
        description: "This key has missing data. Please delete and create a new key.",
        variant: "destructive",
      });
      return;
    }
    
    if (token.status === 'inactive') {
      toast({
        title: "Cannot test inactive key",
        description: "Please activate the key before testing",
        variant: "destructive",
      });
      return;
    }
    
    if (token.hasValidFormat === false) {
      toast({
        title: "Invalid key format",
        description: "This key has an invalid format. Please delete and create a new key.",
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
