import { Link } from 'react-router-dom';
import { SignUpForm } from '@/components/auth/SignUp';
import { MainLayout } from '@/components/layouts/MainLayout';

const SignUp = () => {
  return (
    <MainLayout hideNavigation>
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
    </MainLayout>
  );
};

export default SignUp;
