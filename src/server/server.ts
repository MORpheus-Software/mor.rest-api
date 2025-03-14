
import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import chalk from 'chalk';
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
  if (chatCompletionsHandler && typeof chatCompletionsHandler.postChatCompletion === 'function') {
    chatCompletionsHandler.postChatCompletion(req, res);
  } else {
    res.status(501).json({ error: { message: 'Not implemented', type: 'not_implemented' } });
  }
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
  console.log(chalk.yellow('='.repeat(50)));
  console.log(chalk.yellow('Starting MorSaaS API Server'));
  console.log(chalk.yellow('='.repeat(50)));
  
  let redisAvailable = false;
  
  try {
    // Check Redis connection
    redisAvailable = await checkRedisConnection();
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
    const server = app.listen(PORT, () => {
      console.log(chalk.green(`[SERVER] Server is running on port ${PORT}`));
      console.log(chalk.green(`[SERVER] API available at http://localhost:${PORT}/api`));
      console.log(chalk.yellow('='.repeat(50)));
      resolve();
    });
    
    // Handle server errors
    server.on('error', (err: Error) => {
      console.error(chalk.red('[SERVER] Server error:'), err);
    });
  });
}

// Start the server
startServer().catch(err => {
  console.error(chalk.red('[SERVER] Failed to start server:'), err);
  process.exit(1);
});

export default app;
