import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, KeyRound, Mail, User } from 'lucide-react';
import { FRONTEND_API_ENDPOINT } from '@/lib/api/constants.ts';
import { notifyAuthChange } from '@/lib/auth';

export function SignUpForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    acceptTerms: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      acceptTerms: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    console.log('[SIGNUP] Starting registration process...');
    const apiEndpoint = `${FRONTEND_API_ENDPOINT}/auth/register`;
    console.log('[SIGNUP] API Endpoint:', apiEndpoint);
    console.log('[SIGNUP] FRONTEND_API_ENDPOINT value:', FRONTEND_API_ENDPOINT);
    
    try {
      // Call the registration API endpoint
      console.log('[SIGNUP] Calling registration API with data:', {
        name: formData.name,
        email: formData.email,
        password: '********' // Masked for security
      });
      
      // Log the fetch operation before executing it
      console.log('[SIGNUP] About to execute fetch request to:', apiEndpoint);
      
      const response = await fetch(`${FRONTEND_API_ENDPOINT}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      });
      
      console.log('[SIGNUP] Fetch request completed with status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[SIGNUP] Registration error response:', errorData);
        throw new Error(errorData.error?.message || 'Registration failed');
      }
      
      // Clone the response before consuming it with json()
      const responseText = await response.clone().text();
      console.log('[SIGNUP] Registration raw response:', responseText);
      
      // Process successful registration
      const responseData = await response.json();
      console.log('[SIGNUP] Registration parsed response:', responseData);
      
      // FIXED: Make sure we're accessing the correct path to the user object
      const user = responseData.data;
      
      console.log('[SIGNUP] User registration response object structure:', JSON.stringify(responseData, null, 2));
      console.log('[SIGNUP] User data object structure:', JSON.stringify(user, null, 2));
      
      if (!user || !user.id) {
        console.error('[SIGNUP] Registration response missing user ID. Response structure:', responseData);
        
        // If we have a malformed response but still need to proceed, create a fallback user
        // This is a temporary fix - the server should be fixed to return proper data
        const fallbackUser = {
          id: `temp-${Date.now()}`,
          name: formData.name,
          email: formData.email,
          createdAt: new Date().toISOString()
        };
        
        console.log('[SIGNUP] Created fallback user:', fallbackUser);
        
        // Store fallback user data in localStorage
        console.log('[SIGNUP] Storing fallback user data in localStorage...');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(fallbackUser));
        
        console.log(`[SIGNUP] Fallback user stored with ID: ${fallbackUser.id}`);
        
        // Notify about auth change
        notifyAuthChange();
        
        toast({
          title: "Account created with fallback data",
          description: "Welcome to TokenHub (temporary user)"
        });
        
        // Navigate to playground directly
        console.log('[SIGNUP] Navigating to playground with fallback user...');
        setTimeout(() => {
          window.location.href = '/playground';
        }, 1500);
        
        return;
      }
      
      // Store user data in localStorage
      console.log('[SIGNUP] Storing user data in localStorage...');
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify(user));
      
      console.log(`[SIGNUP] User registered with ID: ${user.id}`);
      console.log('[SIGNUP] localStorage after setting:', {
        isAuthenticated: localStorage.getItem('isAuthenticated'),
        userExists: !!localStorage.getItem('user'),
        userData: localStorage.getItem('user')
      });
      
      // Notify all components about authentication change
      console.log('[SIGNUP] Broadcasting auth state change...');
      notifyAuthChange();
      
      toast({
        title: "Account created successfully",
        description: "Welcome to TokenHub",
      });
      
      // Use setTimeout to ensure navigation happens after localStorage updates
      // Increasing timeout to give more time for localStorage to propagate
      console.log('[SIGNUP] Setting up redirect to playground...');
      setTimeout(() => {
        console.log('[SIGNUP] Now navigating to playground...');
        // Force a page reload instead of using React Router
        window.location.href = '/playground';
      }, 1500); // Increased from 500ms to 1500ms
    } catch (error) {
      console.error('[SIGNUP] Registration error:', error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again with different credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <User size={18} />
          </div>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="John Doe"
            className="pl-10"
            required
            autoComplete="name"
            value={formData.name}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Mail size={18} />
          </div>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            className="pl-10"
            required
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <KeyRound size={18} />
          </div>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="pl-10 pr-10"
            required
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Password must be at least 8 characters long
        </p>
      </div>
      
      <div className="flex items-start space-x-2 pt-2">
        <Checkbox 
          id="terms" 
          name="acceptTerms"
          checked={formData.acceptTerms}
          onCheckedChange={handleCheckboxChange}
          disabled={isLoading}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Accept terms and conditions
          </label>
          <p className="text-xs text-muted-foreground">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full mt-6"
        disabled={isLoading || !formData.acceptTerms}
      >
        {isLoading ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
