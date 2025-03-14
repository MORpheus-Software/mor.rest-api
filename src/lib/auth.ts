/**
 * User interface representing the authenticated user data
 */
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
  avatar?: string | null;
}

// Helper to check if code is running in browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * Check if the user is authenticated with valid data
 * @param verbose Enable verbose logging
 * @returns Boolean indicating authentication status
 */
export function isAuthenticated(verbose: boolean = false): boolean {
  if (!isBrowser) return false;
  
  // Try to get authentication flag from localStorage
  const auth = localStorage.getItem('isAuthenticated');
  if (verbose) console.log(`[AUTH] isAuthenticated flag: ${auth}`);
  
  if (!auth) {
    console.log('[AUTH] Auth check failed: No isAuthenticated flag');
    return false;
  }
  
  // Try to get user data from localStorage
  const userData = localStorage.getItem('user');
  if (verbose) console.log(`[AUTH] User data exists: ${!!userData}`);
  
  if (!userData) {
    console.log('[AUTH] Auth check failed: No user data');
    localStorage.removeItem('isAuthenticated'); // Clean up inconsistent state
    return false;
  }
  
  try {
    // Try to parse user data as JSON
    const user = JSON.parse(userData);
    if (verbose) console.log(`[AUTH] Parsed user data:`, user);
    
    if (!user) {
      console.log('[AUTH] Auth check failed: User data is null or undefined');
      // Clean up inconsistent state
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      return false;
    }
    
    if (!user.id) {
      console.log('[AUTH] Auth check failed: User ID is missing', user);
      // Clean up inconsistent state
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      return false;
    }
    
    // Authentication is valid
    if (verbose) console.log('[AUTH] Auth check passed for user:', user.id);
    return true;
  } catch (error) {
    console.error('[AUTH] Auth check failed: Error parsing user data:', error);
    // Clear corrupted data
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  }
  
  return false;
}

/**
 * Get the current authenticated user
 * @returns User object or null if not authenticated
 */
export function getCurrentUser(): User | null {
  if (!isBrowser || !isAuthenticated()) {
    return null;
  }
  
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData) as User;
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }
  
  return null;
}

/**
 * Logout the current user
 */
export function logout(): void {
  if (!isBrowser) return;
  
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
  
  // Redirect to home page
  window.location.href = '/';
}

/**
 * Create a simple auth token for API requests
 * @returns Auth token string or null if not authenticated
 */
export function createAuthToken(): string | null {
  const user = getCurrentUser();
  
  if (!user) {
    return null;
  }
  
  // Format: user-{userId}-{timestamp}
  return `user-${user.id}-${Date.now()}`;
}

/**
 * Create a test user for debugging purposes
 * @param overrideExisting Whether to override an existing authenticated user
 * @returns The created test user
 */
export function createTestUser(overrideExisting: boolean = false): User {
  if (!isBrowser) {
    throw new Error('createTestUser can only be used in browser environment');
  }
  
  // Check if user is already authenticated
  if (!overrideExisting && isAuthenticated()) {
    console.log('[AUTH] Test user not created: User already authenticated');
    return getCurrentUser() as User;
  }
  
  // Create a test user
  const testUser: User = {
    id: `test-${Date.now()}`,
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date().toISOString()
  };
  
  // Store test user in localStorage
  localStorage.setItem('isAuthenticated', 'true');
  localStorage.setItem('user', JSON.stringify(testUser));
  
  console.log('[AUTH] Test user created:', testUser);
  
  // Force a storage event to notify other components
  if (isBrowser) {
    window.dispatchEvent(new Event('storage'));
  }
  
  return testUser;
}

/**
 * For debugging: Log authentication status and user data
 */
export function debugAuth(): void {
  if (!isBrowser) return;
  
  console.group('[AUTH] Debug Info');
  
  console.log('localStorage items:', {
    isAuthenticated: localStorage.getItem('isAuthenticated'),
    user: localStorage.getItem('user')
  });
  
  console.log('Authentication check result:', isAuthenticated(true));
  console.log('Current user:', getCurrentUser());
  
  console.groupEnd();
}

/**
 * Notify all components of authentication state changes
 */
export function notifyAuthChange(): void {
  if (!isBrowser) return;
  
  console.log('[AUTH] Broadcasting auth state change');
  
  // Method 1: Use the storage event (works across tabs)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
  }
  
  // Method 2: Use a custom event (works better within the same tab)
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    const authEvent = new CustomEvent('auth-state-changed', { 
      detail: { 
        isAuthenticated: localStorage.getItem('isAuthenticated'),
        userId: getCurrentUser()?.id
      } 
    });
    window.dispatchEvent(authEvent);
  }
  
  console.log('[AUTH] Auth state change broadcast complete');
}
