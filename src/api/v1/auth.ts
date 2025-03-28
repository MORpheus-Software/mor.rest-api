
import { Request, Response } from 'express';
import { 
  createUser, 
  authenticateUser, 
  getUserByEmail, 
  getUserById, 
  updateUser 
} from '../../lib/api/users.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
  try {
    console.log('[AUTH] Processing registration request');
    
    const { name, email, password, company } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        error: {
          message: 'Missing required fields',
          type: 'invalid_request_error'
        }
      });
    }
    
    // Add retry logic for Redis connection issues
    let existingUser = null;
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        // Check if email is already registered
        existingUser = await getUserByEmail(email);
        break; // If successful, exit the retry loop
      } catch (redisError) {
        console.error(`[AUTH] Redis error during getUserByEmail (Attempt ${retries + 1}/${maxRetries}):`, redisError);
        
        if (retries >= maxRetries - 1) {
          // If we've reached max retries, throw the error to be caught by the outer catch
          throw redisError;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
        retries++;
      }
    }
    
    if (existingUser) {
      return res.status(409).json({
        error: {
          message: 'Email already registered',
          type: 'account_exists'
        }
      });
    }
    
    // In a real app, you would hash the password here
    // const passwordHash = await bcrypt.hash(password, 10);
    const passwordHash = `mock_hash_${password}_${Date.now()}`;
    
    // Add retry logic for Redis connection issues during user creation
    retries = 0;
    let user = null;
    
    while (retries < maxRetries) {
      try {
        // Create the user
        user = await createUser({
          name,
          email,
          passwordHash,
          company
        });
        break; // If successful, exit the retry loop
      } catch (redisError) {
        console.error(`[AUTH] Redis error during createUser (Attempt ${retries + 1}/${maxRetries}):`, redisError);
        
        if (retries >= maxRetries - 1) {
          // If we've reached max retries, throw the error to be caught by the outer catch
          throw redisError;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
        retries++;
      }
    }
    
    // Remove sensitive data before sending response
    const { passwordHash: _, ...safeUser } = user;
    
    console.log(`[AUTH] User registered successfully: ${user.id}`);
    
    return res.status(201).json({
      data: safeUser
    });
  } catch (error) {
    console.error('[AUTH] Registration error:', error);
    
    // Determine the appropriate error response
    if (error.message && error.message.includes('Redis')) {
      return res.status(503).json({
        error: {
          message: 'Service temporarily unavailable: Redis connection issue',
          type: 'service_unavailable',
          details: error.message
        }
      });
    }
    
    return res.status(500).json({
      error: {
        message: 'Failed to register user',
        type: 'server_error',
        details: error.message
      }
    });
  }
};

/**
 * Log in a user
 */
export const login = async (req: Request, res: Response) => {
  try {
    console.log('[AUTH] Processing login request');
    console.log('[AUTH] Login data:', { email: req.body.email, password: req.body.password ? '(provided)' : '(missing)' });
    
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: {
          message: 'Missing email or password',
          type: 'invalid_request_error'
        }
      });
    }
    
    // Authenticate user with retry logic
    let user = null;
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        // Authenticate user
        user = await authenticateUser(email, password);
        console.log('[AUTH] Authentication result:', user ? 'success' : 'failed');
        break; // If successful, exit the retry loop
      } catch (redisError) {
        console.error(`[AUTH] Redis error during authentication (Attempt ${retries + 1}/${maxRetries}):`, redisError);
        
        if (retries >= maxRetries - 1) {
          // If we've reached max retries, throw the error to be caught by the outer catch
          throw redisError;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
        retries++;
      }
    }
    
    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password',
          type: 'authentication_error'
        }
      });
    }
    
    // Remove sensitive data before sending response
    const { passwordHash: _, ...safeUser } = user;
    
    console.log(`[AUTH] User logged in successfully: ${user.id}`);
    
    return res.json({
      data: safeUser
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    
    // More detailed error response
    return res.status(500).json({
      error: {
        message: 'Failed to log in: ' + (error.message || 'Unknown error'),
        type: 'server_error'
      }
    });
  }
};

/**
 * Get current user information
 */
export const me = async (req: Request, res: Response) => {
  try {
    console.log('[AUTH] Processing current user request');
    
    // Extract user ID from authenticated request
    const userId = (req as any).userId;
    
    if (!userId) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          type: 'authentication_error'
        }
      });
    }
    
    // Get user data
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          type: 'not_found'
        }
      });
    }
    
    // Remove sensitive data before sending response
    const { passwordHash: _, ...safeUser } = user;
    
    return res.json({
      data: safeUser
    });
  } catch (error) {
    console.error('[AUTH] Current user error:', error);
    
    return res.status(500).json({
      error: {
        message: 'Failed to get user information',
        type: 'server_error'
      }
    });
  }
};

// Export all handlers as a default object
export default {
  register,
  login,
  me
};
