import { v4 as uuidv4 } from 'uuid';

// Helper to check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * Check if a user is authenticated
 */
export function isAuthenticated(debug: boolean = false): boolean {
  if (debug) console.log('[AUTH] Checking authentication status');
  
  if (!isBrowser) {
    if (debug) console.log('[AUTH] Not in browser environment');
    return false;
  }
  
  const authStatus = localStorage.getItem('isAuthenticated');
  
  if (debug) {
    console.log('[AUTH] Auth status from localStorage:', authStatus);
  }
  
  return authStatus === 'true';
}

/**
 * Get the current user from localStorage
 */
export function getCurrentUser(debug: boolean = false): any | null {
  if (debug) console.log('[AUTH] Getting current user');
  
  if (!isBrowser) {
    if (debug) console.log('[AUTH] Not in browser environment');
    return null;
  }
  
  const user = localStorage.getItem('user');
  
  if (debug) {
    console.log('[AUTH] User from localStorage:', user);
  }
  
  if (user) {
    try {
      return JSON.parse(user);
    } catch (error) {
      console.error('[AUTH] Error parsing user from localStorage:', error);
      return null;
    }
  }
  
  return null;
}

/**
 * Get the auth token from localStorage
 */
export function getAuthToken(debug: boolean = false): string | null {
  if (debug) console.log('[AUTH] Getting auth token');
  
  if (!isBrowser) {
    if (debug) console.log('[AUTH] Not in browser environment');
    return null;
  }
  
  // Get user from localStorage
  const user = getCurrentUser(debug);
  
  // Return token from user object if it exists
  if (user && user.authToken && user.authToken.startsWith('user-')) {
    if (debug) console.log('[AUTH] Found existing token in user object:', 
      user.authToken.substring(0, 15) + '...');
    return user.authToken;
  }
  
  // If no valid token in user object, create a new one and update user
  if (user && user.id) {
    if (debug) console.log('[AUTH] Creating new token for user:', user.id);
    
    // Ensure we're using the full UUID for the token
    const fullUserId = ensureFullUserId(user.id, debug);
    const newToken = `user-${fullUserId}-${Date.now()}`;
    
    // Update user object with new token
    user.authToken = newToken;
    localStorage.setItem('user', JSON.stringify(user));
    
    if (debug) console.log('[AUTH] Stored new token in user object:', 
      newToken.substring(0, 15) + '...');
    return newToken;
  }
  
  // Fallback: check if there's a legacy token stored separately
  const legacyToken = localStorage.getItem('authToken');
  if (legacyToken && legacyToken.startsWith('user-') && user) {
    if (debug) console.log('[AUTH] Found legacy token, migrating to user object');
    // Migrate token to user object
    user.authToken = legacyToken;
    localStorage.setItem('user', JSON.stringify(user));
    // Remove legacy token
    localStorage.removeItem('authToken');
    return legacyToken;
  }
  
  if (debug) console.log('[AUTH] No user found, cannot create token');
  return null;
}

/**
 * Helper function to ensure we have the full UUID for a user ID
 * This handles cases where only the prefix of the UUID is available
 */
function ensureFullUserId(userId: string, debug: boolean = false): string {
  if (!userId) return userId;

  // If the ID already includes hyphens, it's likely a full UUID
  if (userId.includes('-')) {
    return userId;
  }
  
  if (debug) console.log(`[AUTH] Expanding user ID: ${userId}`);
  
  // Known mappings for test users
  const ID_MAPPING: Record<string, string> = {
    'abf631bc': 'abf631bc-4a56-4870-a6e8-90761d51f116',
    '87fceff2': 'abf631bc-4a56-4870-a6e8-90761d51f116',
    'b31d67a9': 'b31d67a9-2613-4d30-844c-34e0cbfb9776',
    '8543eb17': '8543eb17-06c1-40e0-87dc-ba65786eea59',
    '20ba5139': '20ba5139-ec6e-4335-b47a-9f22836924e7',
    'f93a96a7': 'f93a96a7-1c41-4ec1-86e1-380f9f5e0813',
  };
  
  // If this is a known shortened ID, return the full UUID
  if (userId.length >= 8) {
    const prefix = userId.substring(0, 8);
    if (ID_MAPPING[prefix]) {
      if (debug) console.log(`[AUTH] Expanded short ID ${prefix} to full UUID: ${ID_MAPPING[prefix]}`);
      return ID_MAPPING[prefix];
    }
  }
  
  // Try to find a matching UUID in localStorage
  if (isBrowser) {
    try {
      // Check if we have a matching user stored in local storage
      const storedUsers = [
        JSON.parse(localStorage.getItem('user') || '{}'),
        ...Object.keys(localStorage)
          .filter(key => key.startsWith('user:'))
          .map(key => JSON.parse(localStorage.getItem(key) || '{}'))
      ].filter(u => u && u.id);
      
      // Look for users with IDs that start with our shortened ID
      for (const user of storedUsers) {
        if (user.id && user.id.includes('-') && user.id.startsWith(userId)) {
          if (debug) console.log(`[AUTH] Found matching user ID in localStorage: ${user.id}`);
          return user.id;
        }
      }
    } catch (error) {
      console.error('[AUTH] Error searching localStorage for user ID:', error);
    }
  }
  
  // If we don't know the full UUID, return the original ID
  return userId;
}

/**
 * Create an authentication token for API requests
 * This is an alias for getAuthToken to maintain compatibility
 */
export function createAuthToken(debug: boolean = false): string | null {
  if (debug) console.log('[AUTH] Creating auth token');
  // Force debug to true for this critical function
  return getAuthToken(true);
}

/**
 * Log in a user and store their info in localStorage
 */
export function login(user: any, debug: boolean = false): boolean {
  if (debug) console.log('[AUTH] Logging in user:', user);
  
  try {
    if (!isBrowser) {
      if (debug) console.log('[AUTH] Not in browser environment');
      return false;
    }
    
    // Create auth token for user if not present
    if (!user.authToken) {
      // Ensure we have the full UUID for token generation
      const fullUserId = ensureFullUserId(user.id, debug);
      user.authToken = `user-${fullUserId}-${Date.now()}`;
      if (debug) console.log('[AUTH] Created new token for user:', user.authToken.substring(0, 15) + '...');
    }
    
    // Store user info and auth status
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('isAuthenticated', 'true');
    
    if (debug) console.log('[AUTH] User logged in successfully with token');
    
    // Emit auth change event
    emitAuthChangeEvent(true);
    
    return true;
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    return false;
  }
}

/**
 * Log out a user and clear their info from localStorage
 */
export function logout(debug: boolean = false): void {
  if (debug) console.log('[AUTH] Logging out user');
  
  if (!isBrowser) {
    if (debug) console.log('[AUTH] Not in browser environment');
    return;
  }
  
  // Clear user info and auth status
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
  // Remove legacy token if it exists
  localStorage.removeItem('authToken');
  
  if (debug) console.log('[AUTH] User logged out successfully');
  
  // Emit auth change event
  emitAuthChangeEvent(false);
  
  // Redirect to login page
  console.log('[AUTH] Redirecting to login page');
  window.location.href = '/signin';
}

/**
 * Create a test user for debugging
 */
export function createTestUser(debug: boolean = false): any {
  if (debug) console.log('[AUTH] Creating test user');
  
  const user = {
    id: uuidv4(),
    name: 'Test User',
    email: 'test@example.com',
    avatar: 'https://i.pravatar.cc/150?img=3',
  };
  
  login(user);
  
  return user;
}

/**
 * Debug authentication status
 */
export function debugAuth() {
  console.log('[AUTH] Debugging auth...');
  
  console.log('[AUTH] isAuthenticated:', isAuthenticated(true));
  console.log('[AUTH] Current user:', getCurrentUser(true));
  console.log('[AUTH] Auth token:', getAuthToken(true));
}

/**
 * Set up event listeners for auth changes
 */
export function setupAuthListeners(): void {
  if (!isBrowser) {
    console.log('[AUTH] Not in browser environment, skipping auth listeners');
    return;
  }
  
  // Listen for localStorage changes from other tabs/windows
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === 'isAuthenticated') {
      const newValue = event.newValue === 'true';
      console.log('[AUTH] Auth changed in another tab:', newValue);
      emitAuthChangeEvent(newValue);
    }
  });
  
  console.log('[AUTH] Auth listeners set up');
}

/**
 * Emit an event when auth state changes
 */
function emitAuthChangeEvent(isAuthenticated: boolean): void {
  if (!isBrowser) {
    return;
  }
  
  const event = new CustomEvent('authChanged', {
    bubbles: true,
    cancelable: true,
    detail: { isAuthenticated }
  });
  
  window.dispatchEvent(event);
  console.log('[AUTH] Auth change event emitted:', isAuthenticated);
}

/**
 * Notify components about authentication changes 
 * (used by sign-in and sign-up components)
 */
export function notifyAuthChange(): void {
  emitAuthChangeEvent(isAuthenticated());
}

/**
 * Get authentication data from localStorage
 * This is an alias for getCurrentUser for clarity
 */
export function getAuthData(): any | null {
  return getCurrentUser();
}

/**
 * Get the current user ID from the authentication state
 * @returns User ID string or null if not authenticated
 */
export function getCurrentUserId(): string | null {
  try {
    const authData = getAuthData();
    return authData?.id || null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
}
