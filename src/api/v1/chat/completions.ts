import { Request, Response } from 'express';
import { z } from 'zod';
import chalk from 'chalk';
import { API_BASE_URL } from '../../../lib/api/constants';
import { AuthenticatedRequest } from '../../../lib/api/auth-middleware';

const NFA_PROXY_URL = API_BASE_URL;

/**
 * Handler for chat completions requests
 */
export async function postChatCompletion(req: Request, res: Response) {
  try {
    console.log(chalk.blue(`[API] Chat completion request received`));
    console.log(chalk.blue(`[API] Forwarding to external service: ${NFA_PROXY_URL}/v1/chat/completions`));
    
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
      
      // Forward the request to the external service
      console.log(chalk.blue(`[API] Making request to ${NFA_PROXY_URL}/v1/chat/completions`));
      const externalResponse = await fetch(`${NFA_PROXY_URL}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(req.body),
      });
      
      // Check if the external request was successful
      if (!externalResponse.ok) {
        const errorText = await externalResponse.text();
        console.error(chalk.red(`[API] External service returned error (${externalResponse.status}): ${errorText}`));
        
        // Forward the error status and message
        res.status(externalResponse.status).send(errorText);
        return;
      }
      
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

// Export the handler as default as well for compatibility
export default { postChatCompletion };
