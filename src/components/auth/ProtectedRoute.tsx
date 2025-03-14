import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { isAuthenticated } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Add a small delay to ensure localStorage is updated
    const timer = setTimeout(() => {
      // Check authentication using our utility function
      const authorized = isAuthenticated();
      
      console.log(`ProtectedRoute auth check for ${location.pathname}: ${authorized}`);
      
      setIsAuthorized(authorized);
      setAuthChecked(true);
      
      if (!authorized) {
        toast.error('You must be logged in to access this page');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Show loading state while checking authentication
  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthorized) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
};

export default ProtectedRoute;
