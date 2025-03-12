
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { handleGitHubCallback } from '@/utils/githubAuth';
import { toast } from 'sonner';

const GitHubCallback = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get the code from URL parameters
        const params = new URLSearchParams(location.search);
        const code = params.get('code');

        if (!code) {
          toast.error('GitHub authorization failed: No code received');
          navigate('/signin');
          return;
        }

        const result = await handleGitHubCallback(code);
        
        if (result.success) {
          toast.success('Successfully signed in with GitHub!');
          navigate(result.redirectPath);
        } else {
          toast.error(result.error || 'Authentication failed');
          navigate('/signin');
        }
      } catch (error) {
        console.error('Error processing GitHub callback:', error);
        toast.error('An unexpected error occurred during GitHub authentication');
        navigate('/signin');
      } finally {
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [location, navigate]);

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      {isProcessing && (
        <>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Completing GitHub Authentication</h2>
          <p className="text-muted-foreground">Please wait while we process your sign-in...</p>
        </>
      )}
    </div>
  );
};

export default GitHubCallback;
