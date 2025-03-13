
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import chalk from 'chalk';
import chatCompletionsHandler from '../api/v1/chat/completions.js';
import keyHandlers from '../api/v1/keys.js';
import metricsHandlers from '../api/v1/metrics.js';
import { checkRedisConnection } from './setupRedis.js';

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
  console.log(chalk.blue(`[SERVER] ${req.method} ${req.url}`));
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

// Error handling middleware
app.use((err, req, res, next) => {
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

// API Key endpoints with wrapper functions
apiRouter.get('/keys', (req, res) => {
  // Change getApiKeys to getKeys to match the actual method name in keyHandlers
  keyHandlers.getKeys(req, res);
});

apiRouter.post('/keys', (req, res) => {
  console.log(chalk.green('[SERVER] Processing API key creation request'));
  keyHandlers.createKey(req, res);
});

apiRouter.delete('/keys/:id', (req, res) => {
  keyHandlers.deleteKey(req, res);
});

// Chat completions endpoint with wrapper function
apiRouter.post('/chat/completions', (req, res) => {
  // Fix to call the handler directly rather than accessing a property
  chatCompletionsHandler(req, res);
});

// Metrics endpoint
apiRouter.get('/metrics', (req, res) => {
  metricsHandlers.getMetrics(req, res);
});

// Mount API routes
app.use('/api/v1', apiRouter);

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
    server.on('error', (err) => {
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
