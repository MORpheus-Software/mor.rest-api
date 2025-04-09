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
app.use(express.json());

// Generate a deployment-specific ETag based on build time
const DEPLOY_VERSION = Date.now().toString();
console.log(`Server starting with deployment version: ${DEPLOY_VERSION}`);

// Smart caching strategy for index.html
app.use((req, res, next) => {
  // Only apply to root path or index.html requests
  if (req.path === '/' || req.path === '/index.html') {
    // Set Cache-Control to allow caching but require revalidation
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    
    // Set ETag based on deployment version
    res.setHeader('ETag', `"${DEPLOY_VERSION}"`);
    
    // Check If-None-Match header to see if client has current version
    const clientETag = req.headers['if-none-match'];
    if (clientETag === `"${DEPLOY_VERSION}"`) {
      // Client has current version, return 304 Not Modified
      return res.status(304).end();
    }
  }
  next();
});

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
    // Development path - Fix for correct directory structure
    console.log(chalk.blue('[SERVER] Resolving development path in morsaas directory'));
    
    // Try multiple potential development paths
    const devPaths = [
      path.join(__dirname, '../../dist'),      // /morsaas/dist
      path.join(__dirname, '../../../dist'),   // /AgentGarage/morsaas/dist
      path.join(process.cwd(), 'dist'),        // Using current working directory
    ];
    
    // Find the first path that exists
    let pathFound = false;
    for (const devPath of devPaths) {
      console.log(chalk.blue(`[SERVER] Checking dev path: ${devPath}`));
      if (fs.existsSync(devPath)) {
        publicPath = devPath;
        pathFound = true;
        console.log(chalk.green(`[SERVER] Using existing dev path: ${publicPath}`));
        break;
      }
    }
    
    // If no path exists yet, use the most likely one
    if (!pathFound) {
      publicPath = path.join(process.cwd(), 'dist');
      console.log(chalk.yellow(`[SERVER] No existing dev path found, using: ${publicPath}`));
    }
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
  
  // Development mode - redirect to Vite dev server if we can't find the file
  if (process.env.NODE_ENV === 'development' && (!fs.existsSync(path.join(publicPath, 'index.html')))) {
    console.log(chalk.yellow(`[SERVER] In development mode, redirecting to Vite dev server at http://localhost:8080${req.path}`));
    return res.redirect(`http://localhost:8080${req.path}`);
  }
  
  // Check if we need to inject runtime model variables
  if (fs.existsSync(path.join(publicPath, 'index.html'))) {
    try {
      // Read the index.html file
      const htmlContent = fs.readFileSync(path.join(publicPath, 'index.html'), 'utf-8');
      
      // Get the available models from environment
      const availableModels = process.env.REACT_APP_AVAILABLE_MODELS || '';
      
      // Create the runtime config script
      const runtimeConfigScript = `
        <script>
          // Runtime model configuration from server environment
          window.RUNTIME_CONFIG = {
            REACT_APP_DEFAULT_MODEL_NAME: "${process.env.REACT_APP_DEFAULT_MODEL_NAME || 'Llama-3.1-8B'}",
            REACT_APP_DEFAULT_MODEL_ID: "${process.env.REACT_APP_DEFAULT_MODEL_ID || 'meta-llama/llama-3.3-70b-instruct'}",
            REACT_APP_AVAILABLE_MODELS: "${availableModels.replace(/"/g, '\\"')}"
          };
          console.log("[RUNTIME] Injected runtime model config:", window.RUNTIME_CONFIG);
        </script>
      `;
      
      // Insert the runtime config script right before the closing </head> tag
      const modifiedHtml = htmlContent.replace('</head>', `${runtimeConfigScript}</head>`);
      
      // Send the modified HTML with the runtime config
      return res.send(modifiedHtml);
    } catch (error) {
      console.error(chalk.red(`[SERVER] Error injecting runtime config:`), error);
      // Fall back to sending the original file
      res.sendFile(path.join(publicPath, 'index.html'));
    }
  }
  
  // If we failed to modify or the file doesn't exist, send the original
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
    
    // Verify Redis connection is required
    try {
      // Force Redis connection to be established first
      const redisAvailable = await checkRedisConnection();
      
      if (redisAvailable) {
        console.log(chalk.green('[SERVER] Redis connection verified ✓'));
        console.log(chalk.green('[SERVER] Redis is available and will be used for data persistence'));
      } else {
        // This shouldn't happen as checkRedisConnection throws an error on failure
        throw new Error('Redis connection test failed');
      }
    } catch (redisError) {
      console.error(chalk.red('[SERVER] Error checking Redis connection:'), redisError);
      // Don't proceed if Redis is required
      throw new Error('Redis is required for operation');
    }
    
    // Start the HTTP server
    const PORT = parseInt(process.env.PORT || '4000', 10);
    
    try {
      const server = app.listen(PORT, () => {
        console.log(chalk.green(`[SERVER] Server is running on port ${PORT}`));
        console.log(chalk.green(`[SERVER] API available at http://localhost:${PORT}/api`));
        console.log(chalk.yellow('='.repeat(50)));
      });
      
      // Handle server errors
      server.on('error', (err: Error) => {
        // Handle EADDRINUSE error by trying alternative port
        if ((err as any).code === 'EADDRINUSE') {
          console.error(chalk.red(`[SERVER] Port ${PORT} is already in use, trying another port...`));
          
          // Get a random available port
          const altPort = PORT + Math.floor(Math.random() * 10000) + 1000;
          
          server.listen(altPort, () => {
            console.log(chalk.green(`[SERVER] Server started on alternative port ${altPort}`));
          });
        } else {
          throw err;
        }
      });
    } catch (serverError) {
      console.error(chalk.red('[SERVER] Failed to start server:'), serverError);
      throw serverError;
    }
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
