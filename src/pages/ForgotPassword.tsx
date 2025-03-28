import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    try {
      setIsLoading(true);
      // Mock password reset process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitted(true);
      toast.success('Password reset link sent to your email');
    } catch (error) {
      toast.error('Failed to send reset link. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout hideNavigation>
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <div className="rounded-lg bg-primary p-1.5 text-white">API</div>
            </div>
            <h2 className="mt-6 text-3xl font-bold tracking-tight">Reset your password</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll send you a link to reset your password
            </p>
          </div>
          
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      Reset link sent successfully
                    </p>
                    <p className="mt-2 text-sm text-green-700">
                      Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.
                    </p>
                  </div>
                </div>
              </div>
              
              <Button
                variant="outline"
                type="button"
                className="w-full"
                onClick={() => setSubmitted(false)}
              >
                Try another email
              </Button>
            </div>
          )}
          
          <div className="text-center text-sm">
            Remember your password?{' '}
            <Link to="/signin" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ForgotPassword;
