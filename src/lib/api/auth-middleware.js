
import { Request, Response, NextFunction } from 'express';
import { get } from '../redis-adapter.ts';
import { API_KEY_PREFIX } from './constants.js';

// Safer environment detection that works in both Node.js and browser environments
const isBrowser = typeof process === 'undefined' || 
  !process.versions ||
  !process.versions.node;

export interface AuthenticatedRequest extends Request {
  // The user ID associated with the API key if authentication was successful
  userId?: string;
  // Indicates if authentication was valid
  isAuthenticated: boolean;
  // Any error message if authentication failed
  authError?: string;
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
  
  console.log('[USER AUTH] Found token:', token.substring(0, 8) + '...');
  
  try {
    // Only accept user tokens for backend authentication
    if (token.startsWith('user-')) {
      console.log('[USER AUTH] Processing user token');
      
      // Extract user ID from token (format: user-{id}-{timestamp})
      const parts = token.split('-');
      if (parts.length >= 3) {
        authReq.userId = parts[1];
        console.log('[USER AUTH] User authenticated with ID:', authReq.userId);
        
        // Check if the user ID is valid (not undefined or null)
        if (!authReq.userId || authReq.userId === 'undefined' || authReq.userId === 'null') {
          console.log('[USER AUTH] Invalid user ID in token:', authReq.userId);
          authReq.isAuthenticated = false;
          authReq.authError = 'Invalid user ID in token';
          return next();
        }
        
        // Valid user ID found
        authReq.isAuthenticated = true;
        return next();
      } else {
        console.log('[USER AUTH] Invalid token format - cannot extract user ID');
        authReq.authError = 'Invalid token format';
        return next();
      }
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
  
  console.log('[API KEY AUTH] Found token:', token.substring(0, 8) + '...');
  
  try {
    // Only accept API keys for NFA service proxy
    if (token.startsWith('sk-')) {
      console.log('[API KEY AUTH] Processing NFA service API key');
      try {
        // Mock auth for browser testing
        if (isBrowser) {
          console.log('[API KEY AUTH] Browser environment detected, using mock auth');
          authReq.isAuthenticated = true;
          authReq.userId = 'browser-user';
          return next();
        }
        
        // Use redis-adapter to check the key
        console.log('[API KEY AUTH] Looking up key in Redis:', `${API_KEY_PREFIX}${token}`);
        const userId = await get(`${API_KEY_PREFIX}${token}`);
        console.log('[API KEY AUTH] Redis lookup result:', userId);
        
        if (userId) {
          // API key is valid
          console.log('[API KEY AUTH] API key is valid for user:', userId);
          authReq.isAuthenticated = true;
          authReq.userId = userId;
          return next();
        } else {
          console.log('[API KEY AUTH] API key not found in Redis');
          authReq.authError = 'Invalid API key';
          return next();
        }
      } catch (error) {
        console.error('[API KEY AUTH] Error checking API key:', error);
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
        
        // Use redis-adapter to check the key
        console.log('[AUTH] Looking up key in Redis:', `${API_KEY_PREFIX}${token}`);
        const userId = await get(`${API_KEY_PREFIX}${token}`);
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
