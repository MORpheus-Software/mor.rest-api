import { Request, Response } from 'express';
import { 
  createUser, 
  authenticateUser, 
  getUserByEmail, 
  getUserById, 
  updateUser 
} from '../../lib/api/users';
import { v4 as uuidv4 } from 'uuid';

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response) => {
  try {
    console.log('[AUTH] Processing registration request');
    
    const { name, email, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        error: {
          message: 'Missing required fields',
          type: 'invalid_request_error'
        }
      });
    }
    
    // Check if email is already registered
    const existingUser = await getUserByEmail(email);
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
    
    // Create the user
    const user = await createUser({
      name,
      email,
      passwordHash
    });
    
    // Remove sensitive data before sending response
    const { passwordHash: _, ...safeUser } = user;
    
    console.log(`[AUTH] User registered successfully: ${user.id}`);
    
    return res.status(201).json({
      data: safeUser
    });
  } catch (error) {
    console.error('[AUTH] Registration error:', error);
    
    return res.status(500).json({
      error: {
        message: 'Failed to register user',
        type: 'server_error'
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
    
    // Authenticate user
    const user = await authenticateUser(email, password);
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
    
    return res.status(500).json({
      error: {
        message: 'Failed to log in',
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
