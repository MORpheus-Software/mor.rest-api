import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';
import { toast } from 'sonner';
import { initiateGitHubAuth } from '@/utils/githubAuth';
import { SignUpForm } from '@/components/auth/SignUp';

const SignUp = () => {
  const handleGitHubSignUp = async () => {
    try {
      initiateGitHubAuth();
      // The page will redirect to GitHub, so we don't need to do anything else here
    } catch (error) {
      toast.error(`Failed to sign up with GitHub. Please try again.`);
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
          <h2 className="mt-6 text-3xl font-bold tracking-tight">Create your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start managing your API tokens securely
          </p>
        </div>
        
        <div className="space-y-4">
          {/* Hidden for demo
          <div className="grid grid-cols-1 gap-3">
            <Button 
              variant="outline" 
              type="button"
              onClick={handleGitHubSignUp}
              className="w-full"
            >
              <Github className="mr-2 h-4 w-4" />
              Sign up with GitHub
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
          */}
          
          {/* Use the API-integrated SignUpForm component */}
          <SignUpForm />
        </div>
        
        <div className="text-center text-sm">
          Already have an account?{' '}
          <Link to="/signin" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
