
/**
 * Environment utility functions for detecting and configuring environment-specific behavior
 */

/**
 * Checks if the application is running in the Lovable preview environment
 */
export function isLovableEnvironment(): boolean {
  return process.env.LOVABLE_ENV === 'true' || 
         window.location.hostname.includes('lovable.app') || 
         window.location.hostname.includes('lovable.dev');
}

/**
 * Sets up the environment variables specifically for Lovable
 */
export function setupLovableEnvironment(): void {
  if (isLovableEnvironment()) {
    console.log('[ENVIRONMENT] Detected Lovable environment, configuring application...');
    
    // Set the LOVABLE_ENV flag
    (window as any).process = (window as any).process || {};
    (window as any).process.env = (window as any).process.env || {};
    (window as any).process.env.LOVABLE_ENV = 'true';
    
    // Configure API URL for Lovable environment
    (window as any).process.env.VITE_API_BASE_URL = 'https://nfa-proxy-1081887913409.us-west1.run.app';
    
    console.log('[ENVIRONMENT] Lovable environment configured');
  }
}

/**
 * Gets the base API URL based on the current environment
 */
export function getApiBaseUrl(): string {
  if (isLovableEnvironment()) {
    return 'https://nfa-proxy-1081887913409.us-west1.run.app';
  }
  
  // Return the configured API URL or default to the current origin
  return process.env.VITE_API_BASE_URL || 
         `${window.location.protocol}//${window.location.host}`;
}

export default {
  isLovableEnvironment,
  setupLovableEnvironment,
  getApiBaseUrl,
};
