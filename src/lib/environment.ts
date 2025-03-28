
/**
 * Environment utility functions for detecting and configuring environment-specific behavior
 */

/**
 * Checks if the application is running in the Lovable preview environment
 */
export function isLovableEnvironment(): boolean {
  return process.env.LOVABLE_ENV === 'true' || 
         (typeof window !== 'undefined' && window.location.hostname.includes('lovable.app')) || 
         (typeof window !== 'undefined' && window.location.hostname.includes('lovable.dev'));
}

/**
 * Sets up the environment variables specifically for Lovable
 */
export function setupLovableEnvironment(): void {
  if (isLovableEnvironment()) {
    console.log('[ENVIRONMENT] Detected Lovable environment, configuring application...');
    
    if (typeof window !== 'undefined') {
      // Set the LOVABLE_ENV flag
      (window as any).process = (window as any).process || {};
      (window as any).process.env = (window as any).process.env || {};
      (window as any).process.env.LOVABLE_ENV = 'true';
      
      // Use local Redis URL when in development
      if (process.env.NODE_ENV === 'development') {
        (window as any).process.env.REDIS_URL = 'redis://localhost:6379';
      } else {
        // Use Upstash Redis in preview/production modes
        (window as any).process.env.REDIS_URL = 'rediss://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379';
      }
    }
    
    console.log('[ENVIRONMENT] Lovable environment configured');
  }
}

/**
 * Gets the base API URL based on the current environment
 */
export function getApiBaseUrl(): string {
  // Always use the local API when in development or Lovable environment
  if (process.env.NODE_ENV === 'development' || isLovableEnvironment()) {
    return '/api';
  }
  
  // Return the configured API URL or default to the current origin
  return process.env.VITE_API_BASE_URL || 
         (typeof window !== 'undefined' 
           ? `${window.location.protocol}//${window.location.host}` 
           : 'http://localhost:4000');
}

export default {
  isLovableEnvironment,
  setupLovableEnvironment,
  getApiBaseUrl,
};
