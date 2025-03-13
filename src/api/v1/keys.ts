
import { Request, Response } from 'express';
import { authMiddleware, requireAuth, AuthenticatedRequest } from '../../lib/api/auth-middleware.js';
import { createApiKey, getUserApiKeys, deleteApiKey, ApiKeyInfo, hasAnyApiKeys } from '../../lib/api/keys.js';
import { v4 as uuidv4 } from 'uuid';

// Get all API keys for the current user
const getKeys = async (req: Request, res: Response) => {
  try {
    console.log('[API] Getting API keys');
    
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.isAuthenticated) {
      return res.status(401).json({
        error: {
          message: 'Unauthorized',
          type: 'unauthorized'
        }
      });
    }
    
    const userId = authReq.userId;
    
    if (!userId) {
      return res.status(400).json({
        error: {
          message: 'Missing user ID',
          type: 'invalid_request_error'
        }
      });
    }
    
    const keys = await getUserApiKeys(userId);
    
    console.log(`[API] Returning ${keys.length} keys for user ${userId}`);
    
    return res.json({
      data: keys.map(key => ({
        id: key.key,
        name: key.name,
        lastUsed: key.lastUsedAt,
        created: key.createdAt
      }))
    });
  } catch (error) {
    console.error('[API] Error getting keys:', error);
    
    return res.status(500).json({
      error: {
        message: 'Failed to get API keys',
        type: 'server_error'
      }
    });
  }
};

// Create a new API key
const createKey = async (req: Request, res: Response) => {
  try {
    console.log('[API] Creating new API key');
    
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.isAuthenticated) {
      return res.status(401).json({
        error: {
          message: 'Unauthorized',
          type: 'unauthorized'
        }
      });
    }
    
    const userId = authReq.userId;
    
    if (!userId) {
      return res.status(400).json({
        error: {
          message: 'Missing user ID',
          type: 'invalid_request_error'
        }
      });
    }
    
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        error: {
          message: 'Missing API key name',
          type: 'invalid_request_error'
        }
      });
    }
    
    const key = await createApiKey(userId, name);
    
    console.log(`[API] Created key ${key.key.substring(0, 8)}... for user ${userId}`);
    
    return res.status(201).json({
      data: {
        id: key.key,
        name: key.name,
        created: key.createdAt,
        key: key.key
      }
    });
  } catch (error) {
    console.error('[API] Error creating key:', error);
    
    return res.status(500).json({
      error: {
        message: 'Failed to create API key',
        type: 'server_error'
      }
    });
  }
};

// Delete an API key
const deleteKey = async (req: Request, res: Response) => {
  try {
    console.log('[API] Deleting API key');
    
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.isAuthenticated) {
      return res.status(401).json({
        error: {
          message: 'Unauthorized',
          type: 'unauthorized'
        }
      });
    }
    
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        error: {
          message: 'Missing API key ID',
          type: 'invalid_request_error'
        }
      });
    }
    
    const success = await deleteApiKey(id);
    
    if (!success) {
      return res.status(404).json({
        error: {
          message: 'API key not found',
          type: 'not_found'
        }
      });
    }
    
    console.log(`[API] Deleted key ${id.substring(0, 8)}...`);
    
    return res.json({
      data: {
        id,
        deleted: true
      }
    });
  } catch (error) {
    console.error('[API] Error deleting key:', error);
    
    return res.status(500).json({
      error: {
        message: 'Failed to delete API key',
        type: 'server_error'
      }
    });
  }
};

// Check if there are any API keys in the system
const checkKeys = async (req: Request, res: Response) => {
  try {
    console.log('[API] Checking if API keys exist');
    
    const hasKeys = await hasAnyApiKeys();
    
    console.log(`[API] API keys exist: ${hasKeys}`);
    
    return res.json({
      data: {
        hasKeys
      }
    });
  } catch (error) {
    console.error('[API] Error checking keys:', error);
    
    return res.status(500).json({
      error: {
        message: 'Failed to check API keys',
        type: 'server_error'
      }
    });
  }
};

export default {
  getKeys,
  createKey,
  deleteKey,
  checkKeys
};
