import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { isAuthenticated, getCurrentUserId } from '@/lib/auth';
import { hasMinimumStake } from '@/lib/api/stakingService';

interface StakeProtectedRouteProps {
  children: React.ReactNode;
}

const StakeProtectedRoute = ({ children }: StakeProtectedRouteProps) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasStake, setHasStake] = useState(false);
  const [isCheckingStake, setIsCheckingStake] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkStaking = async () => {
      try {
        // First check if user is authenticated
        const authorized = isAuthenticated();
        console.log(`[STAKE_ROUTE] Auth check for ${location.pathname}: ${authorized}`);
        
        setIsAuthorized(authorized);
        setAuthChecked(true);
        
        if (!authorized) {
          toast.error('You must be logged in to access this page');
          setIsCheckingStake(false);
          return;
        }
        
        // If authenticated, check stake status
        try {
          const userId = getCurrentUserId();
          console.log(`[STAKE_ROUTE] Current user ID: ${userId}`);
          
          if (!userId) {
            console.error('[STAKE_ROUTE] No user ID found');
            setHasStake(false);
            setIsCheckingStake(false);
            return;
          }
          
          // Call our staking service to check minimum stake
          const userHasStake = await hasMinimumStake();
          console.log(`[STAKE_ROUTE] User ${userId} has minimum stake: ${userHasStake}`);
          
          setHasStake(userHasStake);
          
          if (!userHasStake) {
            console.warn('[STAKE_ROUTE] User does not have minimum stake, showing notification');
            toast.error('You need to stake MOR tokens to access this feature', {
              duration: 5000,
              action: {
                label: 'Stake',
                onClick: () => {
                  window.location.href = '/staking';
                }
              }
            });
          }
        } catch (error) {
          console.error('[STAKE_ROUTE] Error checking stake status:', error);
          // On error, default to not having stake
          setHasStake(false);
          toast.error('Failed to verify staking status');
        } finally {
          setIsCheckingStake(false);
        }
      } catch (error) {
        console.error('[STAKE_ROUTE] Unexpected error:', error);
        setIsCheckingStake(false);
      }
    };
    
    // Add a small delay to ensure localStorage is updated
    const timer = setTimeout(() => {
      checkStaking();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Show loading state while checking authentication or stake
  if (!authChecked || isCheckingStake) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthorized) {
    console.log('[STAKE_ROUTE] Not authorized, redirecting to signin');
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Redirect to staking page if not staked
  if (!hasStake) {
    console.log('[STAKE_ROUTE] No stake, redirecting to staking page');
    return <Navigate to="/staking" state={{ from: location }} replace />;
  }

  // Render children if authenticated and staked
  console.log('[STAKE_ROUTE] User is authenticated and staked, rendering protected content');
  return <>{children}</>;
};

export default StakeProtectedRoute; 