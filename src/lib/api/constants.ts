// API constants
export const FRONTEND_API_ENDPOINT = '/api/v1';

// Redis key prefixes
export const API_KEY_PREFIX = 'apikey:';
export const USER_KEYS_PREFIX = 'user-keys:';
export const USER_PREFIX = 'user:';
export const USER_EMAIL_INDEX = 'user-email-index:';
export const ALL_USERS_SET = 'all-users';

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
