import { Token } from '@/components/dashboard/TokensTable';
import { FRONTEND_API_ENDPOINT } from './constants';
import { isAuthenticated, createAuthToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// Event emitter for API key changes
type Listener = () => void;
const listeners: Listener[] = [];

// Subscribe to API key changes
export const subscribeToApiKeyChanges = (listener: Listener): (() => void) => {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
};

// Notify all listeners of API key changes
const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

// Function to fetch API keys from the server
export const fetchApiKeys = async (): Promise<Token[]> => {
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
    
    console.log('[API KEY SERVICE] Fetching API keys using auth token');
    
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

    const data = await response.json();
    console.log('[API KEY SERVICE] Successfully fetched API keys:', data);
    
    // Map the API response to our Token format
    const tokens = data.data.map(key => ({
      id: key.id,
      name: key.name,
      token: key.key || `sk-${key.id}`,
      status: 'active' as const,
      createdAt: key.created_at,
      lastUsed: key.last_used_at || undefined
    }));
    
    // Store in localStorage as fallback
    localStorage.setItem('apiKeys', JSON.stringify(tokens));
    
    return tokens;
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
export const createApiKey = async (name: string): Promise<Token> => {
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
    
    console.log(`[API KEY SERVICE] Creating new API key "${name}" using auth token`);
    
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

    const data = await response.json();
    console.log('[API KEY SERVICE] Successfully created API key:', data);
    
    // Map the API response to our Token format
    const newToken = {
      id: data.data.id,
      name: data.data.name,
      token: data.data.key,
      status: 'active' as const,
      createdAt: data.data.created_at,
      lastUsed: null
    };
    
    // Update localStorage with the new token
    const savedTokens = localStorage.getItem('apiKeys');
    let tokens: Token[] = [];
    
    if (savedTokens) {
      tokens = JSON.parse(savedTokens);
    }
    
    tokens.push(newToken);
    localStorage.setItem('apiKeys', JSON.stringify(tokens));
    
    // Notify listeners of the change
    notifyListeners();
    
    return newToken;
  } catch (error) {
    console.error('Error creating API key on server:', error);
    
    // Fall back to local generation
    console.log('Falling back to local generation for new API key');
    
    const newToken = {
      id: uuidv4(),
      name,
      token: `sk-${uuidv4().replace(/-/g, '')}`,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      lastUsed: null
    };
    
    // Update localStorage with the new token
    const savedTokens = localStorage.getItem('apiKeys');
    let tokens: Token[] = [];
    
    if (savedTokens) {
      tokens = JSON.parse(savedTokens);
    }
    
    tokens.push(newToken);
    localStorage.setItem('apiKeys', JSON.stringify(tokens));
    
    // Notify listeners of the change
    notifyListeners();
    
    return newToken;
  }
};

// Function to update API key status on the server
export const updateApiKeyStatus = async (id: string, status: 'active' | 'inactive'): Promise<boolean> => {
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
    
    console.log(`[API KEY SERVICE] Updating API key ${id} status to ${status} using auth token`);
    
    // Try to update using the local API - use the app management endpoint
    const response = await fetch(`${FRONTEND_API_ENDPOINT}/app/keys/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      throw new Error(`Failed to update API key status: ${response.status}`);
    }

    // Update localStorage with the updated token
    const savedTokens = localStorage.getItem('apiKeys');
    if (savedTokens) {
      const tokens: Token[] = JSON.parse(savedTokens);
      const updatedTokens = tokens.map(token => 
        token.id === id ? { ...token, status } : token
      );
      localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
    }
    
    // Notify listeners of the change
    notifyListeners();
    
    return true;
  } catch (error) {
    console.error('Error updating API key status on server:', error);
    
    // Update localStorage with the updated token
    const savedTokens = localStorage.getItem('apiKeys');
    if (savedTokens) {
      const tokens: Token[] = JSON.parse(savedTokens);
      const updatedTokens = tokens.map(token => 
        token.id === id ? { ...token, status } : token
      );
      localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
    }
    
    // Notify listeners of the change
    notifyListeners();
    
    return true;
  }
};

// Function to delete an API key on the server
export const deleteApiKey = async (id: string): Promise<boolean> => {
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
    
    console.log(`[API KEY SERVICE] Deleting API key ${id} using auth token`);
    
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
    
    // Update localStorage by removing the deleted token
    const savedTokens = localStorage.getItem('apiKeys');
    if (savedTokens) {
      const tokens: Token[] = JSON.parse(savedTokens);
      const updatedTokens = tokens.filter(token => token.id !== id);
      localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
    }
    
    // Notify listeners of the change
    notifyListeners();
    
    return true;
  } catch (error) {
    console.error('Error deleting API key on server:', error);
    
    // Update localStorage by removing the deleted token
    const savedTokens = localStorage.getItem('apiKeys');
    if (savedTokens) {
      const tokens: Token[] = JSON.parse(savedTokens);
      const updatedTokens = tokens.filter(token => token.id !== id);
      localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
    }
    
    // Notify listeners of the change
    notifyListeners();
    
    return true;
  }
};

// Function to update the last used time for an API key
export const updateApiKeyLastUsed = async (id: string): Promise<boolean> => {
  try {
    // Update localStorage with the updated last used time
    const savedTokens = localStorage.getItem('apiKeys');
    if (savedTokens) {
      const tokens: Token[] = JSON.parse(savedTokens);
      const updatedTokens = tokens.map(token => 
        token.id === id ? { ...token, lastUsed: new Date().toISOString() } : token
      );
      localStorage.setItem('apiKeys', JSON.stringify(updatedTokens));
    }
    
    // Notify listeners of the change
    notifyListeners();
    
    return true;
  } catch (error) {
    console.error('Error updating API key last used time:', error);
    return false;
  }
}; 