import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';

// List of routes that don't require authentication
const publicRoutes = [
  '/',
  '/signin',
  '/signup',
  '/forgot-password',
  '/auth/github/callback',
  '/debug'  // Debug page should be public
];

interface AuthCheckProps {
  children: React.ReactNode;
}

const AuthCheck = ({ children }: AuthCheckProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [lastCheckedPath, setLastCheckedPath] = useState('');
  
  // Function to perform the authentication check
  const checkAuthentication = useCallback(() => {
    // Skip check for public routes
    if (publicRoutes.includes(location.pathname)) {
      console.log('[AUTH_CHECK] Skipping check for public path', location.pathname);
      return;
    }
    
    // Skip repeated checks for same path to avoid notification spam
    if (location.pathname === lastCheckedPath) {
      console.log('[AUTH_CHECK] Skipping repeat check for', location.pathname);
      return;
    }
    
    // Display current auth state for debugging
    const user = getCurrentUser();
    console.log('[AUTH_CHECK] Current user data:', user);
    console.log('[AUTH_CHECK] localStorage items:', {
      isAuthenticated: localStorage.getItem('isAuthenticated'),
      userDataExists: !!localStorage.getItem('user')
    });
    
    // Check authentication using our utility function
    const authenticated = isAuthenticated(true); // Enable verbose logging
    console.log('[AUTH_CHECK] Authentication check for', location.pathname, '=', authenticated);
    
    if (!authenticated) {
      console.log('[AUTH_CHECK] Not authenticated, redirecting to signin');
      toast.error('Authentication required. Please log in.');
      setLastCheckedPath(''); // Reset to allow check after redirect
      navigate('/signin', { state: { from: location.pathname }, replace: true });
    } else {
      console.log('[AUTH_CHECK] Authentication confirmed for', location.pathname);
      setLastCheckedPath(location.pathname);
    }
  }, [navigate, location.pathname, lastCheckedPath]);
  
  // Register handlers for auth state changes
  useEffect(() => {
    // Storage event handler (works across tabs)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'isAuthenticated' || event.key === 'user') {
        console.log('[AUTH_CHECK] Storage change detected:', event.key, 'New value:', event.newValue);
        checkAuthentication();
      }
    };
    
    // Custom event handler (works better within same tab)
    const handleAuthChange = (event: Event) => {
      console.log('[AUTH_CHECK] Custom auth event detected:', (event as CustomEvent).detail);
      checkAuthentication();
    };
    
    console.log('[AUTH_CHECK] Setting up event listeners');
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-state-changed', handleAuthChange);
    
    return () => {
      console.log('[AUTH_CHECK] Removing event listeners');
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-state-changed', handleAuthChange);
    };
  }, [checkAuthentication]);
  
  // Run the auth check when the location changes
  useEffect(() => {
    console.log('[AUTH_CHECK] Path changed to', location.pathname);
    
    // Skip immediate check when location changes to avoid race conditions
    // with authentication state updates
    const timer = setTimeout(() => {
      console.log('[AUTH_CHECK] Running delayed auth check for', location.pathname);
      checkAuthentication();
    }, 500); // Increased from 300ms to 500ms
    
    return () => clearTimeout(timer);
  }, [location.pathname, checkAuthentication]);

  return <>{children}</>;
};

export default AuthCheck; 