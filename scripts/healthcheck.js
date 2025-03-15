#!/usr/bin/env node

/**
 * Health check script for the MorSaaS application
 * Used by Docker healthcheck to ensure the application is running correctly
 */

// Use built-in Node.js modules only to avoid dependencies
import http from 'http';

// Configuration (with defaults)
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 8080;
const TIMEOUT = parseInt(process.env.HEALTHCHECK_TIMEOUT || '5000', 10);
const ENDPOINT = process.env.HEALTHCHECK_ENDPOINT || '/api/health';

console.log(`Performing health check: http://${HOST}:${PORT}${ENDPOINT}`);

// Create an HTTP request to check if the server is responding
const request = http.request({
  host: HOST,
  port: PORT,
  path: ENDPOINT,
  method: 'GET',
  timeout: TIMEOUT
}, (response) => {
  // Read the response body
  let data = '';
  
  response.on('data', (chunk) => {
    data += chunk;
  });
  
  response.on('end', () => {
    // Check if the response was successful (200 OK)
    if (response.statusCode === 200) {
      console.log('Health check passed ✅');
      console.log(`Response: ${data.slice(0, 100)}${data.length > 100 ? '...' : ''}`);
      process.exit(0); // Exit with success
    } else {
      console.error(`Health check failed with status: ${response.statusCode} ❌`);
      console.error(`Response: ${data}`);
      process.exit(1); // Exit with error
    }
  });
});

// Handle errors
request.on('error', (error) => {
  console.error(`Health check error: ${error.message} ❌`);
  process.exit(1); // Exit with error
});

// Handle timeout
request.on('timeout', () => {
  console.error(`Health check timed out after ${TIMEOUT}ms ❌`);
  request.destroy();
  process.exit(1); // Exit with error
});

// Send the request
request.end(); 