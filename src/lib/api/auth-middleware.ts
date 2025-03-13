
import { Request, Response, NextFunction } from 'express';
import { get } from '../redis-adapter.js';
import { API_KEY_PREFIX } from './constants.js';

// Check if we're in a browser environment using safer type checks
const isBrowser = typeof window !== 'undefined' && 
  typeof document !== 'undefined' && 
  typeof window.document === 'object';

export interface AuthenticatedRequest extends Request {
  // The user ID associated with the API key if authentication was successful
  userId?: string;
  // Indicates if authentication was valid
  isAuthenticated: boolean;
  // Any error message if authentication failed
  authError?: string;
}

/**
 * Middleware to handle authentication for API requests
 * Supports simple API keys (sk-*)
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  authReq.isAuthenticated = false;
  
  // Get API key from Authorization header or api-key header (OpenAI style)
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
    authReq.authError = 'Missing API key';
    return next();
  }
  
  console.log('[AUTH] Found token:', token.substring(0, 8) + '...');
  
  try {
    // For simple API keys (starting with 'sk-')
    if (token.startsWith('sk-')) {
      console.log('[AUTH] Processing simple API key');
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
          // Simple API key is valid
          console.log('[AUTH] Simple API key is valid for user:', userId);
          authReq.isAuthenticated = true;
          authReq.userId = userId;
          return next();
        } else {
          console.log('[AUTH] Simple API key not found in Redis');
          authReq.authError = 'Invalid API key';
          return next();
        }
      } catch (error) {
        console.error('[AUTH] Error checking simple API key:', error);
        authReq.authError = 'Error validating API key';
        return next();
      }
    } else {
      // Not a simple API key
      console.log('[AUTH] Not a valid API key format, expecting sk-*');
      authReq.authError = 'Invalid API key format';
      return next();
    }
  } catch (error) {
    console.error('[AUTH] Auth middleware error:', error);
    authReq.authError = 'Authentication error';
    return next();
  }
}

/**
 * Check if the user is authenticated and respond with an error if not
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.isAuthenticated) {
    return res.status(401).json({
      error: {
        message: authReq.authError || 'Unauthorized',
        type: 'invalid_request_error',
        code: 'invalid_api_key'
      }
    });
  }
  
  next();
}
