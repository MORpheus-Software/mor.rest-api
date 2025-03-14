import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';
import { toast } from 'sonner';
import { initiateGitHubAuth } from '@/utils/githubAuth';
import { SignInForm } from '@/components/auth/SignIn';

const SignIn = () => {
  const handleGitHubSignIn = async () => {
    try {
      initiateGitHubAuth();
      // The page will redirect to GitHub, so we don't need to do anything else here
    } catch (error) {
      toast.error(`Failed to sign in with GitHub. Please try again.`);
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <div className="rounded-lg bg-primary p-1.5 text-white">API</div>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <Button 
              variant="outline" 
              type="button"
              onClick={handleGitHubSignIn}
              className="w-full"
            >
              <Github className="mr-2 h-4 w-4" />
              Sign in with GitHub
            </Button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-muted"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          
          {/* Use the API-integrated SignInForm component */}
          <SignInForm />
        </div>
        
        <div className="text-center text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
