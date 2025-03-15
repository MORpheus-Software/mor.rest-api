// API constants
export const FRONTEND_API_ENDPOINT = '/api/v1';

// Redis key prefixes
export const API_KEY_PREFIX = 'apikey:';
export const USER_KEYS_PREFIX = 'user-keys:';
export const USER_PREFIX = 'user:';
export const USER_EMAIL_INDEX = 'user-email-index:';
export const ALL_USERS_SET = 'all-users';

// Safer environment detection that works in both Node.js and browser environments
const isBrowser = typeof window !== 'undefined';

// Default API base URL
const DEFAULT_API_URL = 'https://nfa-proxy-1081887913409.us-west1.run.app';

// Log the environment for debugging
const debugEnvironment = () => {
  try {
    console.log(`[ENV] Running in ${isBrowser ? 'browser' : 'Node.js'} environment`);
    if (!isBrowser) {
      console.log(`[ENV] Node.js environment variables: VITE_API_BASE_URL=${process.env?.VITE_API_BASE_URL || 'undefined'}`);
    }
  } catch (e) {
    // Ignore errors in production
  }
};

// Run the debug logging if needed
if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
  debugEnvironment();
}

// Safely access Vite's environment variables in the browser
// This avoids TypeScript errors during server build
const getViteEnv = () => {
  try {
    // Only try to access import.meta.env in the browser
    if (isBrowser && typeof import.meta !== 'undefined') {
      const value = import.meta.env?.VITE_API_BASE_URL;
      if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
        console.log(`[ENV] Browser environment variables: VITE_API_BASE_URL=${value || 'undefined'}`);
      }
      return value;
    }
  } catch (e) {
    console.warn('[ENV] Error accessing import.meta.env:', e);
  }
  return undefined;
};

// Base URL for the remote API, configure via environment variables
// This should NOT include "/api" as it's used for server-to-server communication
// The remote service expects requests at /v1/chat/completions
export const API_BASE_URL = isBrowser 
  ? (getViteEnv() || process.env?.VITE_API_BASE_URL || DEFAULT_API_URL)
  : (process.env?.VITE_API_BASE_URL || DEFAULT_API_URL);

// Log the final API URL for debugging
if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
  console.log(`[ENV] Using API_BASE_URL: ${API_BASE_URL}`);
} 
