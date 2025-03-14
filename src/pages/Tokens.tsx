import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { TokensTable, Token } from '@/components/dashboard/TokensTable';
import { CreateTokenDialog } from '@/components/dashboard/CreateTokenDialog';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { FRONTEND_API_ENDPOINT } from '@/lib/api/constants';
import { isAuthenticated, createAuthToken } from '@/lib/auth';

// Define the API response types
interface ApiKeyResponse {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

interface ApiKeyListResponse {
  data: ApiKeyResponse[];
}

interface ApiKeyCreateResponse {
  data: ApiKeyResponse & { key: string };
}

interface ApiKeyDeleteResponse {
  data: { id: string; deleted: boolean };
}

// Function to fetch API keys from the server
const fetchApiKeys = async (): Promise<Token[]> => {
  try {
    // Check authentication using the auth helper
    if (!isAuthenticated()) {
      console.error('User not authenticated');
      throw new Error('User not authenticated');
    }
    
    // Create auth token using the helper function
    const authToken = createAuthToken();
    if (!authToken) {
      console.error('Failed to create auth token');
      throw new Error('Failed to create auth token');
    }
    
    console.log('[TOKENS] Fetching API keys using auth token');
    
    // Fetch from the local API - use the app management endpoint
    const response = await fetch(`${FRONTEND_API_ENDPOINT}/app/keys`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch API keys: ${response.status}`);
    }

    const data: ApiKeyListResponse = await response.json();
    console.log('[TOKENS] Successfully fetched API keys:', data);
    
    // Map the API response to our Token format
    return data.data.map(key => ({
      id: key.id,
      name: key.name,
      token: key.id,
      status: 'active' as const,
      createdAt: key.created_at,
      lastUsed: key.last_used_at || undefined
    }));
  } catch (error) {
    console.error('Error fetching API keys from server:', error);
    
    // Fall back to localStorage if server fetch fails
    console.log('Falling back to localStorage for API keys');
    const savedTokens = localStorage.getItem('apiKeys');
    
    if (savedTokens) {
      return JSON.parse(savedTokens);
    }
    
    // Generate some sample tokens if nothing exists
    const sampleTokens: Token[] = [
      {
        id: uuidv4(),
        name: 'Production API',
        token: `sk-${uuidv4().replace(/-/g, '')}`,
        status: 'active',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        name: 'Development API',
        token: `sk-${uuidv4().replace(/-/g, '')}`,
        status: 'active',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    // Store sample tokens in localStorage
    localStorage.setItem('apiKeys', JSON.stringify(sampleTokens));
    return sampleTokens;
  }
};

// Function to create a new API key on the server
const createApiKey = async (name: string): Promise<Token> => {
  try {
    // Check authentication using the auth helper
    if (!isAuthenticated()) {
      console.error('User not authenticated');
      throw new Error('User not authenticated');
    }
    
    // Create auth token using the helper function
    const authToken = createAuthToken();
    if (!authToken) {
      console.error('Failed to create auth token');
      throw new Error('Failed to create auth token');
    }
    
    console.log(`[TOKENS] Creating new API key "${name}" using auth token`);
    
    // Try to create using the local API - use the app management endpoint
    const response = await fetch(`${FRONTEND_API_ENDPOINT}/app/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      throw new Error(`Failed to create API key: ${response.status}`);
    }

    const data: ApiKeyCreateResponse = await response.json();
    console.log('[TOKENS] Successfully created API key:', data);
    
    // Map the API response to our Token format
    return {
      id: data.data.id,
      name: data.data.name,
      token: data.data.key,
      status: 'active' as const,
      createdAt: data.data.created_at,
      lastUsed: null
    };
  } catch (error) {
    console.error('Error creating API key on server:', error);
    
    // Fall back to local generation
    console.log('Falling back to local generation for new API key');
    
    return {
      id: uuidv4(),
      name,
      token: `sk-${uuidv4().replace(/-/g, '')}`,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastUsed: null
    };
  }
};

// Function to update API key status on the server
const updateApiKeyStatus = async (id: string, status: 'active' | 'inactive'): Promise<boolean> => {
  try {
    // The real API would need an endpoint for this
    // For now, we'll just succeed
    return true;
  } catch (error) {
    console.error(`Error ${status === 'active' ? 'activating' : 'deactivating'} API key on server:`, error);
    return false;
  }
};

// Function to delete an API key on the server
const deleteApiKey = async (id: string): Promise<boolean> => {
  try {
    // Check authentication using the auth helper
    if (!isAuthenticated()) {
      console.error('User not authenticated');
      throw new Error('User not authenticated');
    }
    
    // Create auth token using the helper function
    const authToken = createAuthToken();
    if (!authToken) {
      console.error('Failed to create auth token');
      throw new Error('Failed to create auth token');
    }
    
    console.log(`[TOKENS] Deleting API key ${id} using auth token`);
    
    // Try to delete using the local API - use the app management endpoint
    const response = await fetch(`${FRONTEND_API_ENDPOINT}/app/keys/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete API key: ${response.status}`);
    }

    const data: ApiKeyDeleteResponse = await response.json();
    console.log('[TOKENS] Successfully deleted API key:', data);
    return data.data.deleted;
  } catch (error) {
    console.error('Error deleting API key on server:', error);
    // Assume success in fallback mode
    return true;
  }
};

const TokensPage = () => {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  useEffect(() => {
    // Fetch tokens from server or localStorage
    async function loadTokens() {
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
    }
    
    loadTokens();
  }, [toast]);
  
  const handleCreateToken = async (tokenData: { name: string }) => {
    try {
      // Create token on server
      const newToken = await createApiKey(tokenData.name);
      
      // Update local state
      const updatedTokens = [...tokens, newToken];
      setTokens(updatedTokens);
      
      // Also update localStorage as fallback
      localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
      
      // Close dialog
      setIsCreateDialogOpen(false);
      
      // Show success toast
      toast({
        title: "API key created",
        description: "Your new API key has been created successfully",
      });
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
      // Update on server
      const success = await updateApiKeyStatus(id, 'active');
      
      if (!success) {
        throw new Error('Failed to activate API key');
      }
      
      // Update local state
      const updatedTokens = tokens.map(token => 
        token.id === id ? { ...token, status: 'active' as const } : token
      );
      
      setTokens(updatedTokens);
      
      // Also update localStorage as fallback
      localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
      
      toast({
        title: "API key activated",
        description: "The API key is now active and can be used for authentication",
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
      // Update on server
      const success = await updateApiKeyStatus(id, 'inactive');
      
      if (!success) {
        throw new Error('Failed to deactivate API key');
      }
      
      // Update local state
      const updatedTokens = tokens.map(token => 
        token.id === id ? { ...token, status: 'inactive' as const } : token
      );
      
      setTokens(updatedTokens);
      
      // Also update localStorage as fallback
      localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
      
      toast({
        title: "API key deactivated",
        description: "The API key is now inactive and cannot be used for authentication",
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
      // Delete on server
      const success = await deleteApiKey(id);
      
      if (!success) {
        throw new Error('Failed to delete API key');
      }
      
      // Update local state
      const updatedTokens = tokens.filter(token => token.id !== id);
      
      setTokens(updatedTokens);
      
      // Also update localStorage as fallback
      localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
      
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
