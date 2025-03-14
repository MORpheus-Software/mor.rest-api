
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
 * (Previously deprecated, now used for auth token creation)
 */
export function getAuthToken(debug: boolean = false): string | null {
  if (debug) console.log('[AUTH] Getting auth token');
  
  if (!isBrowser) {
    if (debug) console.log('[AUTH] Not in browser environment');
    return null;
  }
  
  const user = getCurrentUser();
  
  if (user) {
    return `user-${user.id}-${Date.now()}`;
  }
  
  return null;
}

/**
 * Create an authentication token for API requests
 * This is an alias for getAuthToken to maintain compatibility
 */
export function createAuthToken(debug: boolean = false): string | null {
  return getAuthToken(debug);
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
    
    // Store user info and auth status
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('isAuthenticated', 'true');
    
    if (debug) console.log('[AUTH] User logged in successfully');
    
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
  
  if (debug) console.log('[AUTH] User logged out successfully');
  
  // Emit auth change event
  emitAuthChangeEvent(false);
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
