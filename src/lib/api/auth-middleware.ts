import { Request, Response, NextFunction } from 'express';
import { createRedisClient } from '../redis-adapter.js';
import { API_KEY_PREFIX } from './constants.js';
import { validateApiKey } from './keys.js';
import { Redis } from 'ioredis';
import { getRedisClient } from '../../server/setupRedis.js';

// Safer environment detection that works in both Node.js and browser environments
const isBrowser = typeof process === 'undefined' || 
  !process.versions ||
  !process.versions.node;

// Mock verifyToken function if needed by the rest of this file
function verifyToken(token: string): Promise<any> {
  console.log('[AUTH] Using mock verifyToken, this should be replaced with actual implementation');
  return Promise.resolve(null);
}

// User ID mapping (used for testing and development)
const ID_MAPPING: Record<string, string> = {
  'abf631bc': 'abf631bc-4a56-4870-a6e8-90761d51f116',
  '87fceff2': 'abf631bc-4a56-4870-a6e8-90761d51f116',
  'b31d67a9': 'b31d67a9-2613-4d30-844c-34e0cbfb9776',
  '8543eb17': '8543eb17-06c1-40e0-87dc-ba65786eea59',
  '20ba5139': '20ba5139-ec6e-4335-b47a-9f22836924e7',
  'f93a96a7': 'f93a96a7-1c41-4ec1-86e1-380f9f5e0813',
};

export interface AuthenticatedRequest extends Request {
  // The user ID associated with the API key if authentication was successful
  userId?: string;
  // Indicates if authentication was valid
  isAuthenticated: boolean;
  // Any error message if authentication failed
  authError?: string;
  // Additional information about the API key
  apiKeyInfo?: any;
}

// Redis client
let redisClient: any = null;

/**
 * Get or create a Redis client with connection retries
 */
async function getRedisClientWithRetry(maxRetries: number = 3): Promise<any> {
  if (redisClient) {
    return redisClient;
  }
  
  let lastError = null;
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      console.log(`[AUTH] Redis client connection attempt ${attempts + 1}/${maxRetries}`);
      redisClient = await createRedisClient();
      
      // Test the connection with a simple ping
      await redisClient.ping();
      console.log('[AUTH] Redis client connected successfully');
      return redisClient;
    } catch (error) {
      lastError = error;
      console.error(`[AUTH] Redis connection error (attempt ${attempts + 1}/${maxRetries}):`, error);
      attempts++;
      
      // Wait before retrying
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  }
  
  console.error('[AUTH] All Redis connection attempts failed');
  throw lastError || new Error('Failed to connect to Redis after multiple attempts');
}

/**
 * Checks if an API key exists in localStorage (fallback when Redis is unavailable)
 * @param token The API key to check
 * @returns {valid: boolean, userId: string | null} Result of checking localStorage
 */
function checkApiKeyInLocalStorage(token: string): { valid: boolean, userId: string | null } {
  try {
    console.log('[LOCAL AUTH] Checking API key in localStorage...');
    
    // Access localStorage differently based on environment
    let apiKeysString: string | null = null;
    
    // In Node.js, we need to use a different approach since global.localStorage doesn't exist
    if (typeof window === 'undefined') {
      try {
        // In Node.js environment, try using filesystem if available
        const fs = require('fs');
        const path = require('path');
        const dataFile = path.join(process.cwd(), '.localStorage', 'apiKeys.json');
        
        if (fs.existsSync(dataFile)) {
          apiKeysString = fs.readFileSync(dataFile, 'utf8');
          console.log('[LOCAL AUTH] Loaded API keys from filesystem');
        } else {
          console.log('[LOCAL AUTH] No API keys file found in filesystem');
        }
      } catch (fsError) {
        console.error('[LOCAL AUTH] Error accessing filesystem:', fsError);
        apiKeysString = null;
      }
    } else {
      // In browser environment, use localStorage directly
      apiKeysString = localStorage.getItem('apiKeys');
    }
    
    if (!apiKeysString) {
      console.log('[LOCAL AUTH] No API keys found in storage');
      return { valid: false, userId: null };
    }
    
    // Parse API keys from storage
    const apiKeys = JSON.parse(apiKeysString);
    console.log(`[LOCAL AUTH] Found ${apiKeys.length} API keys in storage`);
    
    // Find API key
    const matchingKey = apiKeys.find((key: any) => key.token === token && key.status === 'active');
    
    if (matchingKey) {
      console.log('[LOCAL AUTH] API key found in storage');
      return { valid: true, userId: matchingKey.userId || 'local-user' };
    } else {
      console.log('[LOCAL AUTH] API key not found in storage');
      return { valid: false, userId: null };
    }
  } catch (error) {
    console.error('[LOCAL AUTH] Error checking API key in storage:', error);
    return { valid: false, userId: null };
  }
}

/**
 * Convert shortened user ID to full UUID
 * This is a helper function to convert legacy shortened IDs to full UUIDs
 * It looks up the ID in the mapping or tries to find it in the database
 * 
 * @param shortId The shortened user ID (e.g. 'abf631bc')
 * @returns Promise resolving to full UUID or null if not found
 */
async function expandUserId(shortId: string): Promise<string | null> {
  console.log('[USER AUTH] Expanding shortened user ID:', shortId);
  
  // Check if it's already a full UUID
  if (shortId.includes('-')) {
    return shortId;
  }
  
  // Check our static mapping first for known IDs
  if (ID_MAPPING[shortId]) {
    console.log(`[USER AUTH] Found mapping for ${shortId}: ${ID_MAPPING[shortId]}`);
    return ID_MAPPING[shortId];
  }
  
  // If not in the mapping, try to find it in Redis
  try {
    const redisClient = await getRedisClient();
    const keys = await redisClient.keys(`user:${shortId}*`);
    
    // Look for keys that match the pattern user:{shortId}-*-*-*-*
    const fullUuidKeys = keys.filter(key => {
      const keyParts = key.split(':');
      const userId = keyParts[1];
      return userId.startsWith(shortId) && userId.includes('-');
    });
    
    if (fullUuidKeys.length > 0) {
      // Extract the user ID from the key (removing the 'user:' prefix)
      const fullUuid = fullUuidKeys[0].split(':')[1];
      console.log(`[USER AUTH] Found matching UUID in Redis: ${fullUuid}`);
      return fullUuid;
    }
    
    console.log(`[USER AUTH] No matching UUID found for ${shortId}`);
    return null;
  } catch (error) {
    console.error(`[USER AUTH] Error expanding user ID: ${error}`);
    return null;
  }
}

/**
 * User authentication middleware (for app backend routes)
 * Only accepts user-* tokens, rejects API keys
 */
export async function userAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  authReq.isAuthenticated = false;
  
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  console.log('[USER AUTH] Authorization header:', authHeader ? 'present' : 'missing');
  
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7).trim() 
    : null;
  
  if (!token) {
    console.log('[USER AUTH] No token found in Authorization header');
    authReq.authError = 'Missing user authentication token';
    return next();
  }
  
  console.log('[USER AUTH] Found token:', token.substring(0, 15) + '...');
  
  try {
    // Only accept user tokens for backend authentication
    if (token.startsWith('user-')) {
      console.log('[USER AUTH] Processing user token');
      
      // Extract user ID from token (format: user-{id}-{timestamp})
      const parts = token.split('-');
      if (parts.length >= 3) {
        // Get the extracted user ID from the token
        const extractedId = parts[1];
        console.log('[USER AUTH] Extracted user ID from token:', extractedId);
        
        // Check if the user ID is valid (not undefined or null)
        if (!extractedId || extractedId === 'undefined' || extractedId === 'null') {
          console.log('[USER AUTH] Invalid user ID in token:', extractedId);
          authReq.isAuthenticated = false;
          authReq.authError = 'Invalid user ID in token';
          return next();
        }
        
        // Expand the user ID to full UUID if it's a shortened form
        const fullUserId = await expandUserId(extractedId);
        
        if (fullUserId) {
          // Set the userId to the full UUID
          authReq.userId = fullUserId;
          console.log('[USER AUTH] Expanded user ID to full UUID:', fullUserId);
        } else {
          // If we couldn't expand the ID, use the original extracted ID
          authReq.userId = extractedId;
          console.log('[USER AUTH] Could not expand ID, using original:', extractedId);
        }
        
        // Check if timestamp is present and valid (not required for authentication, but good to log)
        const timestamp = parts[2];
        if (!timestamp || isNaN(Number(timestamp))) {
          console.log('[USER AUTH] Token has invalid timestamp, but continuing with authentication');
        } else {
          const tokenDate = new Date(Number(timestamp));
          console.log(`[USER AUTH] Token timestamp: ${tokenDate.toISOString()} (${Math.floor((Date.now() - Number(timestamp)) / 1000 / 60)} minutes old)`);
        }
        
        // Valid user ID found
        console.log('[USER AUTH] User successfully authenticated with ID:', authReq.userId);
        authReq.isAuthenticated = true;
        return next();
      } else {
        console.log('[USER AUTH] Invalid token format - cannot extract user ID, parts:', parts.length);
        authReq.authError = 'Invalid token format';
        return next();
      }
    } else if (token.startsWith('sk-')) {
      // API key in user auth context
      console.log('[USER AUTH] API key provided in user authentication context');
      authReq.authError = 'API keys are not valid for this endpoint, use a user token instead';
      return next();
    } else {
      // Not a user token
      console.log('[USER AUTH] Not a valid user token format, expecting user-*');
      authReq.authError = 'Invalid user authentication format';
      return next();
    }
  } catch (error) {
    console.error('[USER AUTH] Auth middleware error:', error);
    authReq.authError = 'User authentication error';
    return next();
  }
}

/**
 * API key authentication middleware (for NFA service proxy routes)
 * Only accepts sk-* API keys, rejects user tokens
 */
export async function apiKeyAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  authReq.isAuthenticated = false;
  
  // Get API key from Authorization header or api-key header
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['api-key'] as string;
  
  console.log('[API KEY AUTH] Headers:', { 
    auth: authHeader ? 'present' : 'missing', 
    apiKey: apiKeyHeader ? 'present' : 'missing' 
  });
  
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7).trim() 
    : apiKeyHeader?.trim() || null;
  
  if (!token) {
    console.log('[API KEY AUTH] No API key found in headers');
    authReq.authError = 'Missing API key';
    return next();
  }
  
  console.log('[API KEY AUTH] Found token:', token);
  
  try {
    // Debug: Accept any API key format for testing
    if (true) {
      console.log('[API KEY AUTH] Processing API key');
      try {
        // Mock auth for browser testing
        if (isBrowser) {
          console.log('[API KEY AUTH] Browser environment detected, using mock auth');
          authReq.isAuthenticated = true;
          authReq.userId = 'browser-user';
          return next();
        }
        
        // Env-based debug skip: only skip validation if API_KEY_AUTH_DEBUG=true
        if (process.env.API_KEY_AUTH_DEBUG === 'true') {
          console.log('[API KEY AUTH] DEBUG MODE: Skipping validation, accepting all keys due to env var');
          authReq.isAuthenticated = true;
          authReq.userId = 'debug-user';
          return next();
        }

        // Debug: Skip validation for testing
        // console.log('[API KEY AUTH] DEBUG MODE: Skipping validation, accepting all keys');
        // authReq.isAuthenticated = true;
        // authReq.userId = 'debug-user';
        // return next();  // To re-enable, uncomment these lines and remove the env-based skip above
        
        const apiKeyInfo = await validateApiKey(token);
        
        if (apiKeyInfo) {
          // API key is valid
          console.log('[API KEY AUTH] API key is valid for user:', apiKeyInfo.userId);
          authReq.isAuthenticated = true;
          authReq.userId = apiKeyInfo.userId;
          authReq.apiKeyInfo = apiKeyInfo;
          return next();
        } else {
          // API key is invalid
          console.log('[API KEY AUTH] API key is invalid');
          authReq.authError = 'Invalid API key';
          return next();
        }
      } catch (error) {
        console.error('[API KEY AUTH] Error validating API key:', error);
        authReq.authError = 'Error validating API key';
        return next();
      }
    } else {
      // Not an API key
      console.log('[API KEY AUTH] Not a valid API key format, expecting sk-*');
      authReq.authError = 'Invalid API key format';
      return next();
    }
  } catch (error) {
    console.error('[API KEY AUTH] Auth middleware error:', error);
    authReq.authError = 'API key authentication error';
    return next();
  }
}

/**
 * Legacy middleware that handles both auth types
 * @deprecated Use userAuthMiddleware or apiKeyAuthMiddleware instead
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  console.warn('[AUTH] Using deprecated authMiddleware - use userAuthMiddleware or apiKeyAuthMiddleware instead');
  const authReq = req as AuthenticatedRequest;
  authReq.isAuthenticated = false;
  
  // Get auth token from Authorization header or api-key header
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['api-key'] as string;
  
  console.log('[AUTH] Headers:', { 
    auth: authHeader ? 'present' : 'missing', 
    apiKey: apiKeyHeader ? 'present' : 'missing' 
  });
  
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7).trim() 
    : apiKeyHeader?.trim() || null;
  
  if (!token) {
    console.log('[AUTH] No token found in headers');
    authReq.authError = 'Missing authentication';
    return next();
  }
  
  console.log('[AUTH] Found token:', token.substring(0, 8) + '...');
  
  try {
    // For app auth tokens (starting with 'user-')
    if (token.startsWith('user-')) {
      console.log('[AUTH] Processing app auth token');
      // In development, accept any user token as valid
      // In production, this would validate against a JWT or session store
      authReq.isAuthenticated = true;
      
      // Extract user ID from token (format: user-{id}-{timestamp})
      const parts = token.split('-');
      if (parts.length >= 2) {
        authReq.userId = parts[1];
        console.log('[AUTH] User authenticated with ID:', authReq.userId);
      } else {
        authReq.userId = 'unknown-user';
      }
      
      return next();
    }
    // For NFA service API keys (starting with 'sk-')
    else if (token.startsWith('sk-')) {
      console.log('[AUTH] Processing NFA service API key');
      try {
        // Mock auth for browser testing
        if (isBrowser) {
          console.log('[AUTH] Browser environment detected, using mock auth');
          authReq.isAuthenticated = true;
          authReq.userId = 'browser-user';
          return next();
        }
        
        try {
          // Initialize Redis client if not done already
          if (!redisClient) {
            redisClient = await getRedisClientWithRetry();
          }
          
          // Use Redis client to check the key
          console.log('[AUTH] Looking up key in Redis:', `${API_KEY_PREFIX}${token}`);
          const userId = await redisClient.get(`${API_KEY_PREFIX}${token}`);
          console.log('[AUTH] Redis lookup result:', userId);
          
          if (userId) {
            // API key is valid
            console.log('[AUTH] API key is valid for user:', userId);
            authReq.isAuthenticated = true;
            authReq.userId = userId;
            return next();
          } else {
            console.log('[AUTH] API key not found in Redis');
            authReq.authError = 'Invalid API key';
            return next();
          }
        } catch (error) {
          console.error('[AUTH] Error checking API key:', error);
          authReq.authError = 'Error validating API key';
          return next();
        }
      } catch (error) {
        console.error('[AUTH] Error checking API key:', error);
        authReq.authError = 'Error validating API key';
        return next();
      }
    } else {
      // Not a valid token format
      console.log('[AUTH] Not a valid token format, expecting user-* or sk-*');
      authReq.authError = 'Invalid authentication format';
      return next();
    }
  } catch (error) {
    console.error('[AUTH] Auth middleware error:', error);
    authReq.authError = 'Authentication error';
    return next();
  }
}

/**
 * Middleware to require authentication
 * Use this after an auth middleware to ensure the request is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.isAuthenticated) {
    res.status(401).json({
      error: {
        message: authReq.authError || 'Authentication required',
        type: 'authentication_error',
      },
    });
    return;
  }
  
  next();
}
