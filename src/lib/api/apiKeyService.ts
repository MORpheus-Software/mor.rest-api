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
    
    // Get existing tokens from localStorage that have full token values
    const savedTokensString = localStorage.getItem('apiKeys');
    const savedTokens: Record<string, Token> = {};
    
    if (savedTokensString) {
      try {
        const parsed = JSON.parse(savedTokensString);
        parsed.forEach((token: Token) => {
          if (token.id && token.token) {
            savedTokens[token.id] = token;
          }
        });
        console.log(`[API KEY SERVICE] Found ${Object.keys(savedTokens).length} saved tokens in localStorage`);
      } catch (e) {
        console.error('[API KEY SERVICE] Error parsing saved tokens:', e);
      }
    }
    
    // Map the API response to our Token format, using saved tokens when possible
    const tokens = data.data.map(key => {
      // First check if we have this key saved in localStorage with a full token
      const savedToken = savedTokens[key.id];
      const hasLocalToken = !!(savedToken && savedToken.token && savedToken.token.startsWith('sk-'));
      
      if (hasLocalToken) {
        console.log(`[API KEY SERVICE] Using saved token value for key ${key.id}`);
      } else if (!key.key) {
        console.error(`[API KEY SERVICE] API key data missing 'key' property for ID ${key.id}. Key will not be usable for API requests.`);
      }
      
      // Combine data from API and local storage
      return {
        id: key.id,
        name: key.name || savedToken?.name || 'Unnamed Key',
        token: hasLocalToken ? savedToken.token : (key.key || `INVALID-KEY-${key.id}`),
        hasValidFormat: hasLocalToken ? true : (!!key.key && key.key.startsWith('sk-') && key.key.length >= 35),
        isIncomplete: !hasLocalToken && !key.key,
        status: key.status || savedToken?.status || 'active',
        createdAt: key.created || key.created_at || savedToken?.createdAt || new Date().toISOString(),
        lastUsed: key.lastUsed || key.last_used_at || savedToken?.lastUsed || undefined
      };
    });
    
    // Store in localStorage as fallback and to keep the full token values
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
        hasValidFormat: true,
        status: 'active',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        name: 'Development API',
        token: `sk-${uuidv4().replace(/-/g, '')}`,
        hasValidFormat: true,
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
    // Check authentication using the auth helper with debug mode
    if (!isAuthenticated(true)) {
      console.error('[API KEY SERVICE] User not authenticated, cannot create API key');
      throw new Error('User not authenticated');
    }
    
    // Create auth token using the helper function with debug enabled
    const authToken = createAuthToken(true);
    if (!authToken) {
      console.error('[API KEY SERVICE] Failed to create auth token');
      throw new Error('Failed to create auth token');
    }
    
    console.log(`[API KEY SERVICE] Creating new API key "${name}" using auth token: ${authToken.substring(0, 15)}...`);
    
    // Try to create using the local API - use the app management endpoint
    const response = await fetch(`${FRONTEND_API_ENDPOINT}/app/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name })
    });

    // Enhanced error handling with response details
    if (!response.ok) {
      console.error(`[API KEY SERVICE] Server returned error ${response.status}: ${response.statusText}`);
      let errorText = '';
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
        console.error('[API KEY SERVICE] Error details:', errorData);
      } catch (e) {
        errorText = await response.text();
        console.error('[API KEY SERVICE] Error response:', errorText);
      }
      throw new Error(`Failed to create API key: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[API KEY SERVICE] Successfully created API key:', data);
    
    // Add detailed debugging to check the server response
    if (!data.data || !data.data.key) {
      console.error('[API KEY SERVICE] Server response is missing key property:', data);
    } else {
      console.log('[API KEY SERVICE] Key property length:', data.data.key.length);
      console.log('[API KEY SERVICE] Key property format check:', 
                  data.data.key.startsWith('sk-') ? 'valid prefix' : 'invalid prefix');
    }
    
    // Map the API response to our Token format
    const newToken = {
      id: data.data?.id || uuidv4(),
      name: data.data?.name || name,
      token: data.data?.key || '',
      hasValidFormat: !!data.data?.key && data.data.key.startsWith('sk-') && data.data.key.length >= 35,
      isIncomplete: !data.data?.key,
      status: 'active' as const,
      createdAt: data.data?.created_at || new Date().toISOString(),
      lastUsed: null
    };
    
    // Create a fallback if the key is missing but we have an ID - this only happens in local mode
    // WARNING: This is just for development and won't work in production
    if (!data.data?.key && data.data?.id) {
      console.log('[API KEY SERVICE] Generating fallback key for local testing mode');
      const fallbackKey = `sk-${data.data.id}${Array(32).fill('0').join('')}`;
      newToken.token = fallbackKey;
      newToken.hasValidFormat = true;
      newToken.isIncomplete = false;
    }
    
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
      hasValidFormat: true,
      isIncomplete: false,
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