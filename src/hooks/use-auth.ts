import { useState, useEffect } from 'react';
import { getCurrentUser, getAuthToken, getCurrentUserId } from '@/lib/auth';

interface AuthData {
  userId: string | null;
  token: string | null;
  user: any | null;
  isAuthenticated: boolean;
}

export function useAuth(): AuthData {
  const [authData, setAuthData] = useState<AuthData>({
    userId: null,
    token: null,
    user: null,
    isAuthenticated: false
  });

  useEffect(() => {
    // Get current authentication state
    const user = getCurrentUser();
    const token = getAuthToken();
    const userId = getCurrentUserId();
    const isAuthenticated = !!userId && !!token;

    setAuthData({
      userId,
      token,
      user,
      isAuthenticated
    });

    // Set up event listener for auth state changes
    const handleAuthChange = () => {
      const updatedUser = getCurrentUser();
      const updatedToken = getAuthToken();
      const updatedUserId = getCurrentUserId();
      const updatedIsAuthenticated = !!updatedUserId && !!updatedToken;

      setAuthData({
        userId: updatedUserId,
        token: updatedToken,
        user: updatedUser,
        isAuthenticated: updatedIsAuthenticated
      });
    };

    window.addEventListener('auth-state-changed', handleAuthChange);
    window.addEventListener('storage', (event) => {
      if (event.key === 'isAuthenticated' || event.key === 'user') {
        handleAuthChange();
      }
    });

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  return authData;
} 