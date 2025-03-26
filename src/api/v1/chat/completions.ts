import { Request, Response } from 'express';
import { z } from 'zod';
import chalk from 'chalk';
import { API_BASE_URL } from '../../../lib/api/constants.js';
import { AuthenticatedRequest } from '../../../lib/api/auth-middleware.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const NFA_PROXY_URL = API_BASE_URL;
const SECONDARY_ENDPOINT_URL = process.env.SECONDARY_ENDPOINT_URL;
const SECONDARY_ENDPOINT_TOKEN = process.env.SECONDARY_ENDPOINT_TOKEN;
const SECONDARY_ENDPOINT_MODEL = process.env.SECONDARY_ENDPOINT_MODEL || 'openrouter/auto';
const CONSUMER_API_URL = process.env.CONSUMER_API_URL;
const USE_FALLBACK_AS_PRIMARY = process.env.USE_FALLBACK_AS_PRIMARY === 'true';

// OpenRouter configuration
const OPENROUTER_HTTP_REFERER = process.env.OPENROUTER_HTTP_REFERER || 'https://morsaas.com';
const OPENROUTER_APP_TITLE = process.env.OPENROUTER_APP_TITLE || 'MorSaaS';
const OPENROUTER_APP_VERSION = process.env.OPENROUTER_APP_VERSION || '1.0.0';

// Initialize these values at startup
console.log(chalk.cyan(`[API] Primary endpoint URL: ${USE_FALLBACK_AS_PRIMARY ? SECONDARY_ENDPOINT_URL : NFA_PROXY_URL}`));
console.log(chalk.cyan(`[API] Secondary endpoint URL: ${USE_FALLBACK_AS_PRIMARY ? NFA_PROXY_URL : SECONDARY_ENDPOINT_URL || 'Not configured'}`));
console.log(chalk.cyan(`[API] Secondary endpoint model: ${SECONDARY_ENDPOINT_MODEL}`));
console.log(chalk.cyan(`[API] Consumer API URL: ${CONSUMER_API_URL || 'Not configured'}`));
console.log(chalk.cyan(`[API] Using fallback as primary: ${USE_FALLBACK_AS_PRIMARY ? 'YES' : 'NO'}`));

/**
 * Handler for chat completions requests
 */
export async function postChatCompletion(req: Request, res: Response) {
  try {
    console.log(chalk.blue(`[API] Chat completion request received`));
    
    // Extract model information for logging
    const modelName = req.body?.model || 'unknown';
    console.log(chalk.blue(`[API] Requested model: ${modelName}`));
    
    // Check authentication status from middleware
    const authReq = req as AuthenticatedRequest;
    console.log(chalk.blue(`[API] Authentication status: ${authReq.isAuthenticated ? 'Authenticated' : 'Not authenticated'}`));
    if (authReq.authError) {
      console.log(chalk.red(`[API] Auth error: ${authReq.authError}`));
    }
    
    // If a session_id is provided in the request body, check if it's active
    const sessionToken = getSessionIdFromRequest(req);
    if (sessionToken && CONSUMER_API_URL) {
      const isActive = await checkSessionActive(sessionToken);
      if (!isActive) {
        console.log(chalk.yellow(`[API] Session ${sessionToken} is not active, will create a new session`));
      } else {
        console.log(chalk.green(`[API] Session ${sessionToken} is active and will be reused`));
      }
    }
    
    // Log which endpoint is being used as primary based on configuration
    if (USE_FALLBACK_AS_PRIMARY) {
      console.log(chalk.blue(`[API] Using secondary endpoint as primary: ${SECONDARY_ENDPOINT_URL}`));
    } else {
      console.log(chalk.blue(`[API] Using default primary endpoint: ${NFA_PROXY_URL}/v1/chat/completions`));
    }
    
    // Check if the request includes streaming
    const isStreaming = req.body.stream === true;
    
    // Forward the request to the external service
    try {
      // Get the original authorization header
      const authHeader = req.headers.authorization;
      
      // Create headers for the external request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Include the Authorization header if it exists
      if (authHeader) {
        console.log(chalk.blue(`[API] Including Authorization header in forwarded request`));
        headers['Authorization'] = authHeader;
      } else {
        console.log(chalk.yellow(`[API] Warning: No Authorization header in original request`));
      }
      
      // Include session_id header if it exists in the request
      if (sessionToken) {
        console.log(chalk.blue(`[API] Including session_id in forwarded request: ${sessionToken}`));
        headers['session_id'] = sessionToken;
      }
      
      let externalResponse;
      let usedFallback = false;
      let usedEndpoint = '';
      let modelUsed = modelName;
      
      if (USE_FALLBACK_AS_PRIMARY) {
        // If fallback is configured as primary, use it directly
        console.log(chalk.green(`[API] Using secondary endpoint as primary (by configuration)`));
        externalResponse = await useSecondaryEndpoint(req.body, isStreaming);
        usedEndpoint = SECONDARY_ENDPOINT_URL || '';
        usedFallback = false; // It's not a fallback if it's configured as primary
      } else {
        try {
          // Try the primary endpoint first
          console.log(chalk.blue(`[API] Making request to primary endpoint: ${NFA_PROXY_URL}/v1/chat/completions`));
          externalResponse = await fetch(`${NFA_PROXY_URL}/v1/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(req.body),
          });
          usedEndpoint = `${NFA_PROXY_URL}/v1/chat/completions`;
          
          // If primary endpoint fails and secondary is configured, try that
          if (!externalResponse.ok && SECONDARY_ENDPOINT_URL && SECONDARY_ENDPOINT_TOKEN) {
            console.log(chalk.yellow(`[API] Primary endpoint failed with status ${externalResponse.status}, falling back to secondary endpoint`));
            
            externalResponse = await useSecondaryEndpoint(req.body, isStreaming);
            usedFallback = true;
            usedEndpoint = SECONDARY_ENDPOINT_URL || '';
          }
        } catch (primaryError) {
          console.error(chalk.red(`[API] Primary endpoint error: ${primaryError}`));
          
          // If primary endpoint throws an error and secondary is configured, try that
          if (SECONDARY_ENDPOINT_URL && SECONDARY_ENDPOINT_TOKEN) {
            console.log(chalk.yellow(`[API] Primary endpoint threw an error, falling back to secondary endpoint`));
            
            externalResponse = await useSecondaryEndpoint(req.body, isStreaming);
            usedFallback = true;
            usedEndpoint = SECONDARY_ENDPOINT_URL || '';
          } else {
            // Re-throw the error if no fallback is available
            throw primaryError;
          }
        }
      }
      
      // Check if the external request was successful
      if (!externalResponse.ok) {
        const errorText = await externalResponse.text();
        console.error(chalk.red(`[API] ${usedFallback ? 'Secondary' : (USE_FALLBACK_AS_PRIMARY ? 'Primary (secondary)' : 'Primary')} endpoint returned error (${externalResponse.status}): ${errorText}`));
        
        // Forward the error status and message
        res.status(externalResponse.status).send(errorText);
        return;
      }
      
      // Attempt to extract model information from response for non-streaming
      if (!isStreaming) {
        try {
          const responseClone = externalResponse.clone();
          const jsonResponse = await responseClone.json();
          if (jsonResponse.model) {
            modelUsed = jsonResponse.model;
          }
        } catch (error) {
          console.warn(chalk.yellow(`[API] Could not extract model information from response: ${error}`));
        }
      }
      
      // Log the successful request with endpoint and model information
      console.log(chalk.green(`[API] Successfully completed chat request using:`));
      console.log(chalk.green(`[API] - Endpoint: ${usedEndpoint}`));
      console.log(chalk.green(`[API] - Endpoint Type: ${USE_FALLBACK_AS_PRIMARY ? 'Secondary as Primary' : (usedFallback ? 'Secondary (fallback)' : 'Primary')}`));
      console.log(chalk.green(`[API] - Model: ${modelUsed}`));
      
      // Handle streaming responses
      if (isStreaming) {
        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Get the response reader
        const reader = externalResponse.body?.getReader();
        
        // Stream the response back to the client
        if (reader) {
          // Handle client disconnects
          req.on('close', () => {
            console.log(chalk.yellow(`[API] Client disconnected from stream`));
            reader.cancel();
          });
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              // Forward the chunk to the client
              res.write(value);
              // No need to flush, Express handles this automatically
            }
            res.end();
          } catch (streamError) {
            console.error(chalk.red(`[API] Error streaming response: ${streamError}`));
            // The stream might have already ended, so we'll try to end it gracefully
            try { res.end(); } catch (e) { /* ignore */ }
          }
        } else {
          res.status(500).json({
            error: {
              message: 'Failed to read stream from external service',
              type: 'server_error',
            },
          });
        }
      } else {
        // For non-streaming responses, just pipe the response back
        const responseData = await externalResponse.json();
        res.json(responseData);
      }
    } catch (forwardError) {
      console.error(chalk.red(`[API] Error forwarding request: ${forwardError}`));
      res.status(500).json({
        error: {
          message: 'Failed to connect to external service',
          type: 'server_error',
        },
      });
    }
  } catch (error) {
    console.error(chalk.red('[API] Chat completion error:'), error);
    
    res.status(500).json({
      error: {
        message: 'An error occurred during chat completion',
        type: 'server_error',
      },
    });
  }
}

/**
 * Get the session ID from the request, either from headers or body
 */
function getSessionIdFromRequest(req: Request): string | null {
  // Check if the session_id is in headers
  const headerSessionId = req.headers.session_id as string;
  if (headerSessionId) {
    return headerSessionId;
  }
  
  // Check if the session_id is in the body
  if (req.body && req.body.session_id) {
    return req.body.session_id;
  }
  
  return null;
}

/**
 * Check if a session is active by calling the Consumer API
 */
async function checkSessionActive(sessionId: string): Promise<boolean> {
  if (!CONSUMER_API_URL) {
    console.log(chalk.yellow(`[API] Consumer API URL not configured, cannot check session status`));
    return false;
  }

  try {
    console.log(chalk.blue(`[API] Checking session active status for ${sessionId}`));
    const apiUrl = `${CONSUMER_API_URL}/api/v1/session/active/${sessionId}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log(chalk.yellow(`[API] Session status check failed with status ${response.status}`));
      return false;
    }
    
    const result = await response.json();
    console.log(chalk.blue(`[API] Session status check result: ${JSON.stringify(result)}`));
    
    return result.active === true;
  } catch (error) {
    console.error(chalk.red(`[API] Error checking session status: ${error}`));
    return false;
  }
}

/**
 * Use the secondary endpoint
 */
async function useSecondaryEndpoint(requestBody: any, isStreaming: boolean): Promise<Response> {
  return fallbackToSecondaryEndpoint(requestBody, isStreaming);
}

/**
 * Fallback to the secondary endpoint when the primary endpoint fails
 */
async function fallbackToSecondaryEndpoint(requestBody: any, isStreaming: boolean): Promise<Response> {
  if (!SECONDARY_ENDPOINT_URL || !SECONDARY_ENDPOINT_TOKEN) {
    throw new Error('Secondary endpoint not configured');
  }
  
  console.log(chalk.blue(`[API] Using secondary endpoint: ${SECONDARY_ENDPOINT_URL}`));
  
  // Create a copy of the request body and modify for OpenRouter
  const openRouterBody = {
    ...requestBody,
    model: SECONDARY_ENDPOINT_MODEL // Use configured model or default to openrouter/auto
  };
  
  // Create headers for OpenRouter API
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SECONDARY_ENDPOINT_TOKEN}`,
    'HTTP-Referer': OPENROUTER_HTTP_REFERER,
    'X-Title': OPENROUTER_APP_TITLE,
    'User-Agent': `${OPENROUTER_APP_TITLE}/${OPENROUTER_APP_VERSION}`
  };
  
  // Set Accept header based on streaming
  if (isStreaming) {
    headers['Accept'] = 'text/event-stream';
  } else {
    headers['Accept'] = 'application/json';
  }
  
  console.log(chalk.blue(`[API] Using secondary endpoint model: ${SECONDARY_ENDPOINT_MODEL}`));
  
  // Make the request to OpenRouter
  return fetch(SECONDARY_ENDPOINT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(openRouterBody),
  });
}

// Export the handler as default as well for compatibility
export default { postChatCompletion };
