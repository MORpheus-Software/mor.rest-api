
import { Request, Response } from 'express';
import { authMiddleware, requireAuth, AuthenticatedRequest } from '../../lib/api/auth-middleware.js';
import { createApiKey, getUserApiKeys, deleteApiKey, ApiKeyInfo, hasAnyApiKeys } from '../../lib/api/keys.js';
import { v4 as uuidv4 } from 'uuid';

// Get all API keys for the current user
export const getApiKeys = async (req: Request, res: Response) => {
  // Authenticate the request
  await authMiddleware(req, res, () => {});
  
  // Check if authenticated
  const authReq = req as AuthenticatedRequest;
  if (!authReq.isAuthenticated) {
    return res.status(401).json({
      error: {
        message: authReq.authError || 'Unauthorized',
        type: 'invalid_request_error',
      }
    });
  }

  try {
    const userId = authReq.userId as string;
    const keys = await getUserApiKeys(userId);
    
    return res.status(200).json({
      data: keys.map(key => ({
        id: key.key,
        name: key.name,
        created_at: key.createdAt,
        last_used_at: key.lastUsedAt || null,
      }))
    });
  } catch (error) {
    console.error('[API-KEYS] Error getting keys:', error);
    return res.status(500).json({
      error: {
        message: 'An error occurred while retrieving API keys',
        type: 'server_error',
      }
    });
  }
};

// Create a new API key
export const createKey = async (req: Request, res: Response) => {
  try {
    // Check if there are any existing API keys
    const anyKeysExist = await hasAnyApiKeys();
    
    // If this is not the first key, require authentication
    if (anyKeysExist) {
      // Authenticate the request
      await authMiddleware(req, res, () => {});
      
      // Check if authenticated
      const authReq = req as AuthenticatedRequest;
      if (!authReq.isAuthenticated) {
        return res.status(401).json({
          error: {
            message: authReq.authError || 'Unauthorized',
            type: 'invalid_request_error',
          }
        });
      }

      const userId = authReq.userId as string;
      const { name } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({
          error: {
            message: 'Missing or invalid name for API key',
            type: 'invalid_request_error',
          }
        });
      }
      
      const key = await createApiKey(userId, name);
      
      return res.status(201).json({
        data: {
          id: key.key,
          name: key.name,
          key: key.key, // Only return the full key on creation
          created_at: key.createdAt,
        }
      });
    } else {
      // For the very first key, no authentication required
      console.log('[API-KEYS] Creating first API key without authentication');
      
      const { name } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({
          error: {
            message: 'Missing or invalid name for API key',
            type: 'invalid_request_error',
          }
        });
      }
      
      // Generate a random user ID for the first key
      const userId = `user_${uuidv4()}`;
      
      const key = await createApiKey(userId, name);
      
      return res.status(201).json({
        data: {
          id: key.key,
          name: key.name,
          key: key.key, // Return the full key
          created_at: key.createdAt,
        }
      });
    }
  } catch (error) {
    console.error('[API-KEYS] Error creating key:', error);
    return res.status(500).json({
      error: {
        message: 'An error occurred while creating the API key',
        type: 'server_error',
      }
    });
  }
};

// Delete an API key
export const deleteKey = async (req: Request, res: Response) => {
  // Authenticate the request
  await authMiddleware(req, res, () => {});
  
  // Check if authenticated
  const authReq = req as AuthenticatedRequest;
  if (!authReq.isAuthenticated) {
    return res.status(401).json({
      error: {
        message: authReq.authError || 'Unauthorized',
        type: 'invalid_request_error',
      }
    });
  }

  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        error: {
          message: 'Missing API key ID',
          type: 'invalid_request_error',
        }
      });
    }
    
    const success = await deleteApiKey(id);
    
    if (!success) {
      return res.status(404).json({
        error: {
          message: 'API key not found',
          type: 'not_found_error',
        }
      });
    }
    
    return res.status(200).json({
      data: {
        id,
        deleted: true,
      }
    });
  } catch (error) {
    console.error('[API-KEYS] Error deleting key:', error);
    return res.status(500).json({
      error: {
        message: 'An error occurred while deleting the API key',
        type: 'server_error',
      }
    });
  }
};

export default {
  getApiKeys,
  createKey,
  deleteKey,
};
