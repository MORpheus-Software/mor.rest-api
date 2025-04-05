import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { FRONTEND_API_ENDPOINT } from '@/lib/api/constants.ts';
import { notifyAuthChange } from '@/lib/auth';

export function SignInForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    auth?: string;
  }>({});
  const [touched, setTouched] = useState({
    email: false,
    password: false
  });

  const validateEmail = (email: string) => {
    if (!email) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required';
    if (password.length < 1) return 'Password is required';
    return '';
  };

  const validateForm = () => {
    const newErrors = {
      email: validateEmail(formData.email),
      password: validatePassword(formData.password)
    };
    
    setErrors(prev => ({...prev, ...newErrors}));
    return !newErrors.email && !newErrors.password;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear auth error when user starts typing
    if (errors.auth) {
      setErrors(prev => ({ ...prev, auth: undefined }));
    }

    // Validate on change if the field has been touched
    if (touched[name as keyof typeof touched]) {
      setErrors(prev => ({
        ...prev,
        [name]: name === 'email' ? validateEmail(value) : validatePassword(value)
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate the field on blur
    setErrors(prev => ({
      ...prev,
      [name]: name === 'email' 
        ? validateEmail(formData.email) 
        : validatePassword(formData.password)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous auth error
    setErrors(prev => ({ ...prev, auth: undefined }));
    
    // Mark all fields as touched
    setTouched({ email: true, password: true });
    
    // Validate all fields
    if (!validateForm()) {
      return; // Stop submission if validation fails
    }
    
    setIsLoading(true);
    
    console.log('[SIGNIN] Starting login process...');
    const apiEndpoint = `${FRONTEND_API_ENDPOINT}/auth/login`;
    console.log('[SIGNIN] API Endpoint:', apiEndpoint);
    console.log('[SIGNIN] FRONTEND_API_ENDPOINT value:', FRONTEND_API_ENDPOINT);
    
    try {
      // Call the login API endpoint
      console.log('[SIGNIN] Calling login API with data:', {
        email: formData.email,
        password: '********' // Masked for security
      });
      
      // Log the fetch operation before executing it
      console.log('[SIGNIN] About to execute fetch request to:', apiEndpoint);
      
      const response = await fetch(`${FRONTEND_API_ENDPOINT}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });
      
      console.log('[SIGNIN] Fetch request completed with status:', response.status);
      
      // First get the raw response text to help debug any JSON parsing issues
      const responseText = await response.clone().text();
      console.log('[SIGNIN] Raw response text:', responseText);
      
      // Check for empty response or server errors
      if (!responseText || responseText.trim() === '') {
        console.error('[SIGNIN] Empty response received from server');
        throw new Error('Server returned an empty response. This might indicate a Redis connection issue.');
      }
      
      if (!response.ok) {
        try {
          // Try to parse error as JSON
          const errorData = JSON.parse(responseText);
          console.error('[SIGNIN] Login error response:', errorData);
          
          // Set auth error message
          setErrors(prev => ({ 
            ...prev, 
            auth: errorData.error?.message || 'Invalid email or password' 
          }));
          
          throw new Error(errorData.error?.message || 'Login failed');
        } catch (jsonError) {
          // If JSON parsing fails, use the raw text
          console.error('[SIGNIN] Login error (non-JSON):', responseText);
          
          // Set auth error message
          setErrors(prev => ({ 
            ...prev, 
            auth: `Invalid email or password` 
          }));
          
          throw new Error(`Server error: ${response.status}. ${responseText || 'No additional details'}`);
        }
      }
      
      // Try to parse the response as JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('[SIGNIN] Login parsed response:', responseData);
      } catch (jsonError) {
        console.error('[SIGNIN] Error parsing JSON response:', jsonError);
        throw new Error('Invalid response format from server');
      }
      
      const user = responseData.data;
      
      console.log('[SIGNIN] Login response object structure:', JSON.stringify(responseData, null, 2));
      console.log('[SIGNIN] User data object structure:', JSON.stringify(user, null, 2));
      
      if (!user || !user.id) {
        console.error('[SIGNIN] Login response missing user ID. Response structure:', responseData);
        
        // If we have a malformed response but still need to proceed, create a fallback user
        // This is a temporary fix - the server should be fixed to return proper data
        const fallbackUser = {
          id: `temp-${Date.now()}`,
          name: formData.email.split('@')[0], // Use part of email as name
          email: formData.email,
          company: '', // Initialize empty company
          createdAt: new Date().toISOString()
        };
        
        console.log('[SIGNIN] Created fallback user:', fallbackUser);
        
        // Store fallback user data in localStorage
        console.log('[SIGNIN] Storing fallback user data in localStorage...');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('user', JSON.stringify(fallbackUser));
        
        console.log(`[SIGNIN] Fallback user stored with ID: ${fallbackUser.id}`);
        
        // Notify about auth change
        notifyAuthChange();
        
        toast({
          title: "Signed in with fallback data",
          description: "Welcome back to MOR.rest API (temporary user)"
        });
        
        // Navigate to playground using both approaches to ensure it works
        console.log('[SIGNIN] Navigating to playground with fallback user...');
        
        // First attempt: Use navigate from React Router
        navigate('/playground', { replace: true });
        
        // Backup approach: Direct location change after a delay
        setTimeout(() => {
          console.log('[SIGNIN] Fallback redirect: Using window.location.href');
          window.location.href = '/playground';
        }, 500);
        
        return;
      }
      
      // Store user data in localStorage
      console.log('[SIGNIN] Storing auth data in localStorage...');
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify(user));
      
      console.log(`[SIGNIN] User logged in with ID: ${user.id}`);
      console.log('[SIGNIN] localStorage after setting:', {
        isAuthenticated: localStorage.getItem('isAuthenticated'),
        userExists: !!localStorage.getItem('user')
      });
      
      // Notify components of auth change
      console.log('[SIGNIN] Broadcasting auth state change...');
      notifyAuthChange();
      
      toast({
        title: "Successfully signed in",
        description: "Welcome back to MOR.rest API",
      });
      
      // Use both React Router navigate and window.location for maximum reliability
      console.log('[SIGNIN] Setting up redirect to playground...');
      
      // First attempt: Use navigate from React Router
      navigate('/playground', { replace: true });
      
      // Backup approach: Direct location change after a delay
      setTimeout(() => {
        console.log('[SIGNIN] Backup redirect: Using window.location.href');
        window.location.href = '/playground';
      }, 500);
      
    } catch (error) {
      console.error('[SIGNIN] Login error:', error);
      
      // If no specific auth error was set earlier, set a generic one
      if (!errors.auth) {
        setErrors(prev => ({ 
          ...prev, 
          auth: 'Invalid email or password. Please try again.' 
        }));
      }
      
      toast({
        title: "Authentication failed",
        description: error instanceof Error 
          ? error.message 
          : "Please check your credentials and try again. If problem persists, Redis connection might be unavailable.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors.auth && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {errors.auth}
        </div>
      )}
      
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
            className={`pl-10 ${errors.email && touched.email ? 'border-destructive' : ''}`}
            required
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isLoading}
          />
        </div>
        {errors.email && touched.email && (
          <p className="text-sm text-destructive mt-1">{errors.email}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {/* Hidden for demo
          <Link 
            to="#" 
            className="text-xs text-primary hover:underline"
            onClick={(e) => {
              e.preventDefault();
              toast({
                title: "Password reset",
                description: "This feature is not available in the demo",
              });
            }}
          >
            Forgot password?
          </Link>
          */}
        </div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <KeyRound size={18} />
          </div>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className={`pl-10 pr-10 ${errors.password && touched.password ? 'border-destructive' : ''}`}
            required
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
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
        {errors.password && touched.password && (
          <p className="text-sm text-destructive mt-1">{errors.password}</p>
        )}
      </div>
      
      <Button 
        type="submit" 
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
