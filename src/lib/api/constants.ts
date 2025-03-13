
// API key prefixes for Redis storage
export const API_KEY_PREFIX = 'apikey:';
export const USER_KEYS_PREFIX = 'user-keys:';

// Safer environment detection that works in both Node.js and browser environments
const isBrowser = typeof process === 'undefined' || 
  !process.versions ||
  !process.versions.node;

// Base URL for the API, configure via environment variables
export const API_BASE_URL = isBrowser 
  ? (process.env?.VITE_API_BASE_URL || 'https://token-auth-saas-1081887913409.us-west1.run.app')
  : (process.env?.VITE_API_BASE_URL || 'https://token-auth-saas-1081887913409.us-west1.run.app'); 

// API endpoint for frontend requests - uses relative URL for same-origin requests
export const FRONTEND_API_ENDPOINT = '/api/v1';
