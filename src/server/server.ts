import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import * as chatCompletionsHandler from '../api/v1/chat/completions.js';
import keyHandlers from '../api/v1/keys.js';
import metricsHandlers from '../api/v1/metrics.js';
import authHandlers from '../api/v1/auth.js';
import { checkRedisConnection } from './setupRedis.js';
import { 
  userAuthMiddleware, 
  apiKeyAuthMiddleware, 
  requireAuth 
} from '../lib/api/auth-middleware.js';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Debug environment variables
console.log(chalk.cyan('[SERVER] Environment variables:'));
console.log(chalk.cyan(`  PORT: ${process.env.PORT || '4000'}`));
console.log(chalk.cyan(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`));
console.log(chalk.cyan(`  REDIS_URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`));

// Create Express server
const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// Determine the dirname (ES module compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log environment information
console.log(chalk.blue('[SERVER] Environment Information:'));
console.log(chalk.blue(`[SERVER] NODE_ENV: ${process.env.NODE_ENV}`));
console.log(chalk.blue(`[SERVER] PORT: ${PORT}`));
console.log(chalk.blue(`[SERVER] Current directory: ${__dirname}`));
console.log(chalk.blue(`[SERVER] Parent directory: ${path.resolve(__dirname, '..')}`));

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(chalk.blue(`[SERVER] ${req.method} ${req.path}`));
  // Log request body for debugging (sanitize in production)
  if (req.method === 'POST' && Object.keys(req.body || {}).length > 0) {
    const sanitizedBody = { ...req.body };
    // Don't log sensitive fields
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    if (sanitizedBody.apiKey) sanitizedBody.apiKey = '[REDACTED]';
    console.log(chalk.gray(`[SERVER] Request body: ${JSON.stringify(sanitizedBody)}`));
  }
  next();
});

// Error handling middleware with proper type annotations
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(chalk.red('[SERVER] Error:'), err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      type: 'server_error',
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
const apiRouter = express.Router();

// Create separate routers for API key management and NFA service proxying
const appManagementRouter = express.Router();
const nfaServiceRouter = express.Router();
const authRouter = express.Router();

// Authentication endpoints - no auth required for registration/login
authRouter.post('/register', (req, res) => {
  console.log(chalk.green('[SERVER] Processing registration request'));
  authHandlers.register(req, res);
});

authRouter.post('/login', (req, res) => {
  console.log(chalk.green('[SERVER] Processing login request'));
  authHandlers.login(req, res);
});

// Auth endpoint requiring authentication
authRouter.get('/me', userAuthMiddleware, requireAuth, (req, res) => {
  authHandlers.me(req, res);
});

// Apply app user authentication to app management endpoints
appManagementRouter.use(userAuthMiddleware);

// API Key management endpoints - require user authentication
appManagementRouter.get('/keys', requireAuth, (req, res) => {
  keyHandlers.getKeys(req, res);
});

appManagementRouter.post('/keys', requireAuth, (req, res) => {
  console.log(chalk.green('[SERVER] Processing API key creation request'));
  keyHandlers.createKey(req, res);
});

appManagementRouter.delete('/keys/:id', requireAuth, (req, res) => {
  keyHandlers.deleteKey(req, res);
});

// Metrics endpoint also uses user authentication
appManagementRouter.get('/metrics', requireAuth, (req, res) => {
  metricsHandlers.getMetrics(req, res);
});

// Apply API key authentication to NFA service proxy endpoints
nfaServiceRouter.use(apiKeyAuthMiddleware);

// NFA service proxy endpoints - require API key authentication
nfaServiceRouter.post('/chat/completions', requireAuth, (req, res) => {
  chatCompletionsHandler.postChatCompletion(req, res);
});

// Auth verification endpoint
nfaServiceRouter.get('/auth/verify', requireAuth, (req, res) => {
  res.json({ authenticated: true, userId: (req as any).userId });
});

// Mount auth routes
app.use('/api/v1/auth', authRouter);

// Mount app management routes
app.use('/api/v1/app', appManagementRouter);

// Mount NFA service proxy routes 
app.use('/api/v1', nfaServiceRouter);

// Serve static files from the public directory (React app)
let publicPath = '';

// Determine the public path with multiple fallback options
try {
  if (process.env.NODE_ENV === 'production') {
    // First try the standard production path
    publicPath = path.join(__dirname, '../../public');
    
    // Check if the path exists
    if (!fs.existsSync(publicPath)) {
      console.log(chalk.yellow(`[SERVER] Primary public path not found: ${publicPath}`));
      
      // Try alternative paths
      const alternatives = [
        path.join(__dirname, '../public'),
        path.join(__dirname, '../../../public'),
        path.join(__dirname, '../../../../public'),
        '/app/public', // Docker container root
      ];
      
      for (const altPath of alternatives) {
        console.log(chalk.yellow(`[SERVER] Trying alternative path: ${altPath}`));
        if (fs.existsSync(altPath)) {
          publicPath = altPath;
          console.log(chalk.green(`[SERVER] Found valid public path: ${publicPath}`));
          break;
        }
      }
    }
  } else {
    // Development path
    publicPath = path.join(__dirname, '../../../dist');
  }
  
  // Final check
  if (!fs.existsSync(publicPath)) {
    console.warn(chalk.yellow(`[SERVER] WARNING: Public path doesn't exist: ${publicPath}`));
    // Still assign the path - we'll create a fallback handler
  }
} catch (error) {
  console.error(chalk.red(`[SERVER] Error resolving public path:`), error);
  publicPath = process.env.NODE_ENV === 'production' ? '/app/public' : path.join(__dirname, '../../../dist');
}

console.log(chalk.cyan(`[SERVER] Serving static files from: ${publicPath}`));

// Create the public directory if it doesn't exist
try {
  if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath, { recursive: true });
    
    // Create a minimal index.html if in production
    if (process.env.NODE_ENV === 'production') {
      const minimalHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>MorSaaS - Server Running</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    .status { padding: 20px; background: #f0f8ff; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>MorSaaS Server</h1>
    <div class="status">
      <p>✅ Server is running correctly</p>
      <p>The API is available at /api</p>
    </div>
  </div>
</body>
</html>`;
      fs.writeFileSync(path.join(publicPath, 'index.html'), minimalHtml);
      console.log(chalk.green('[SERVER] Created minimal index.html file'));
    }
  }
} catch (error) {
  console.error(chalk.red(`[SERVER] Error creating public directory:`), error);
}

// Serve static files
app.use(express.static(publicPath));

// Handle all other routes by serving the index.html
app.get('*', (req, res) => {
  console.log(chalk.blue(`[SERVER] Serving index.html for route: ${req.path}`));
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Verify Redis connection on startup
checkRedisConnection()
  .then((isConnected: boolean) => {
    if (isConnected) {
      console.log(chalk.green('[SERVER] Redis connection verified ✓'));
    } else {
      console.error(chalk.red('[SERVER] Redis connection test failed! Using fallback storage.'));
    }
  })
  .catch((error: Error) => {
    console.error(chalk.red('[SERVER] Redis connection verification error:'), error);
  });

// Start server
async function startServer() {
  try {
    console.log(chalk.yellow('='.repeat(50)));
    console.log(chalk.yellow('Starting MorSaaS API Server'));
    console.log(chalk.yellow('='.repeat(50)));
    
    let redisAvailable = false;
    
    try {
      // Check Redis connection with timeout
      const redisPromise = checkRedisConnection();
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          console.error(chalk.red('[SERVER] Redis connection check timed out after 10 seconds'));
          resolve(false);
        }, 10000);
      });
      
      redisAvailable = await Promise.race([redisPromise, timeoutPromise]);
    } catch (error) {
      console.error(chalk.red('[SERVER] Error checking Redis connection:'), error);
      console.log(chalk.yellow('[SERVER] Continuing without Redis...'));
    }
    
    if (redisAvailable) {
      console.log(chalk.green('[SERVER] Redis is available and will be used for data persistence'));
    } else {
      console.log(chalk.yellow('[SERVER] Redis is not available, falling back to localStorage'));
      console.log(chalk.yellow('[SERVER] Note: API keys and other data will not persist between server restarts'));
    }
    
    return new Promise<void>((resolve) => {
      // Add connection timeout handler
      const startTimeout = setTimeout(() => {
        console.error(chalk.red('[SERVER] Server start timed out after 30 seconds'));
        console.log(chalk.yellow('[SERVER] Forcing server start...'));
        resolve();
      }, 30000);
      
      const server = app.listen(PORT, () => {
        clearTimeout(startTimeout);
        console.log(chalk.green(`[SERVER] Server is running on port ${PORT}`));
        console.log(chalk.green(`[SERVER] API available at http://localhost:${PORT}/api`));
        console.log(chalk.yellow('='.repeat(50)));
        resolve();
      });
      
      // Handle server errors
      server.on('error', (err: Error) => {
        clearTimeout(startTimeout);
        console.error(chalk.red('[SERVER] Server error:'), err);
        
        // Check if the port is already in use
        if ((err as any).code === 'EADDRINUSE') {
          console.log(chalk.yellow(`[SERVER] Port ${PORT} is already in use, trying another port...`));
          
          // Try another port
          server.listen(0, () => {
            const address = server.address();
            const newPort = typeof address === 'object' && address ? address.port : PORT;
            console.log(chalk.green(`[SERVER] Server started on alternative port ${newPort}`));
            resolve();
          });
        }
      });
    });
  } catch (error) {
    console.error(chalk.red('[SERVER] Unexpected error during server startup:'), error);
    console.log(chalk.yellow('[SERVER] Attempting to continue...'));
  }
}

// Start the server with additional error handling
try {
  startServer().catch(err => {
    console.error(chalk.red('[SERVER] Failed to start server:'), err);
    console.log(chalk.yellow('[SERVER] Attempting to recover...'));
    
    // Recovery attempt - start a minimal server
    const recoveryApp = express();
    recoveryApp.get('/api/health', (req, res) => {
      res.json({ status: 'recovering', message: 'Server is recovering from a startup error' });
    });
    recoveryApp.get('/', (req, res) => {
      res.send('<h1>Server Recovery Mode</h1><p>The server is running in recovery mode due to a startup error.</p>');
    });
    
    recoveryApp.listen(PORT, () => {
      console.log(chalk.yellow(`[SERVER] Recovery server started on port ${PORT}`));
    });
  });
} catch (error) {
  console.error(chalk.red('[SERVER] Critical server error:'), error);
  
  // Start minimal fallback server to prevent container from crashing
  const fallbackApp = express();
  fallbackApp.get('/api/health', (req, res) => {
    res.json({ status: 'fallback', message: 'Server is running in fallback mode' });
  });
  fallbackApp.get('/', (req, res) => {
    res.send('<h1>Server Fallback Mode</h1><p>The server is running in fallback mode due to a critical error.</p>');
  });
  
  fallbackApp.listen(PORT, () => {
    console.log(chalk.yellow(`[SERVER] Fallback server started on port ${PORT}`));
  });
}

export default app;
