// API key prefixes for Redis storage
export const API_KEY_PREFIX = 'apikey:';
export const USER_KEYS_PREFIX = 'user-keys:';

// Safer environment detection that works in both Node.js and browser environments
const isBrowser = typeof process === 'undefined' || 
  !process.versions ||
  !process.versions.node;

// Base URL for the remote API, configure via environment variables
// This should NOT include "/api" as it's used for server-to-server communication
// The remote service expects requests at /v1/chat/completions
export const API_BASE_URL = isBrowser 
  ? (process.env?.VITE_API_BASE_URL || 'https://nfa-proxy-1081887913409.us-west1.run.app')
  : (process.env?.VITE_API_BASE_URL || 'https://nfa-proxy-1081887913409.us-west1.run.app'); 

// API endpoint for frontend requests to our local API - always starts with /api
export const FRONTEND_API_ENDPOINT = '/api/v1';
