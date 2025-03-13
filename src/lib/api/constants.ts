
// API key prefixes for Redis storage
export const API_KEY_PREFIX = 'apikey:';
export const USER_KEYS_PREFIX = 'user-keys:';

// Base URL for the API, configure via environment variables
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://token-auth-saas-1081887913409.us-west1.run.app'; 

// API endpoint for frontend requests - uses relative URL for same-origin requests
export const FRONTEND_API_ENDPOINT = '/api/v1';
