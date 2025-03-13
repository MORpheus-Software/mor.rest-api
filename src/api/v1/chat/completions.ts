import { Request, Response as ExpressResponse, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../lib/api/auth-middleware.js';
import { API_BASE_URL } from '../../../lib/api/constants.js';
import { validateApiKey, updateKeyLastUsed } from '../../../lib/api/keys.js';
// @ts-ignore - using node-fetch v2 which doesn't have TypeScript declarations
import fetch from 'node-fetch';

// Extend Express Response type to include optional flush method
interface Response extends ExpressResponse {
  flush?: () => void;
}

export const formatStreamingResponse = (originalData: string): string => {
  // If empty or whitespace, ignore
  if (!originalData.trim()) {
    return '';
  }

  try {
    // Try to parse as JSON
    const jsonData = JSON.parse(originalData);
    
    // Format for OpenAI compatibility
    return `data: ${JSON.stringify({
      id: jsonData.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: jsonData.created || Math.floor(Date.now() / 1000),
      model: jsonData.model || 'unknown',
      choices: [
        {
          index: 0,
          delta: {
            content: jsonData.content || jsonData.text || '',
          },
          finish_reason: jsonData.finish_reason || null,
        },
      ],
    })}\n\n`;
  } catch (e) {
    // If not valid JSON, return as text content
    return `data: ${JSON.stringify({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: 'unknown',
      choices: [
        {
          index: 0,
          delta: {
            content: originalData,
          },
          finish_reason: null,
        },
      ],
    })}\n\n`;
  }
};

// Proxy function to forward requests to the base AI service
export async function proxyToBaseImage(
  endpoint: string,
  method: string,
  headers: Record<string, string>,
  body: any
) {
  const url = `${API_BASE_URL}/${endpoint}`;
  console.log(`[PROXY] Forwarding request to: ${url}`);
  
  // Filter out unnecessary headers
  const filteredHeaders: Record<string, string> = {};
  Object.entries(headers).forEach(([key, value]) => {
    // Skip headers that shouldn't be forwarded
    if (
      !['host', 'connection', 'content-length', 'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-dest'].includes(key.toLowerCase())
    ) {
      filteredHeaders[key] = value;
    }
  });
  
  try {
    return await fetch(url, {
      method,
      headers: filteredHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    console.error(`[PROXY] Error connecting to backend:`, error);
    throw error;
  }
}

// Middleware to ensure request is authenticated
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.isAuthenticated) {
    return res.status(401).json({
      error: {
        message: authReq.authError || 'Authentication required',
        type: 'authentication_error',
      },
    });
  }
  
  next();
};

// Main handler for chat completions endpoint
const chatCompletionsHandler = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  
  try {
    // Extract API key for usage tracking
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['api-key'] as string;
    
    let apiKey = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    } else if (apiKeyHeader) {
      apiKey = apiKeyHeader;
    }
    
    // Update last used timestamp for metrics
    if (apiKey && authReq.isAuthenticated) {
      await updateKeyLastUsed(apiKey).catch(err => 
        console.error('[COMPLETIONS] Error updating key usage:', err)
      );
    }
    
    // Parse the request body
    const reqBody = req.body;
    const isStreamingRequest = reqBody.stream === true;
    
    // Add debug logging for the request
    console.log(`[PROXY] Request body:`, {
      model: reqBody.model,
      messages: reqBody.messages?.length,
      stream: reqBody.stream,
    });
    
    // Log the authenticated user making the request
    console.log(`[PROXY] Authenticated request from user: ${authReq.userId || 'unknown'}`);
    
    // Proxy the request to the base AI service
    const proxyResponse = await proxyToBaseImage(
      'chat/completions',
      'POST',
      req.headers as Record<string, string>,
      reqBody
    );
    
    // For non-streaming requests or error responses
    if (!isStreamingRequest || !proxyResponse.ok) {
      if (!proxyResponse.ok) {
        console.error(`[PROXY] Error from BaseImage API: ${proxyResponse.status}`);
        
        try {
          // Try to parse as JSON first
          const errorData = await proxyResponse.json();
          return res.status(proxyResponse.status).json(errorData);
        } catch (parseError) {
          // If not JSON, get the text response
          try {
            const errorText = await proxyResponse.text();
            console.error(`[PROXY] Non-JSON error response: ${errorText.substring(0, 100)}...`);
            return res.status(proxyResponse.status).json({
              error: {
                message: `Proxy error: ${proxyResponse.status} ${proxyResponse.statusText}`,
                type: 'proxy_error',
                proxy_status: proxyResponse.status,
                proxy_text: errorText.substring(0, 200) // Include part of the response for debugging
              }
            });
          } catch (textError) {
            // If we can't even get the text, return a generic error
            return res.status(proxyResponse.status).json({
              error: {
                message: `Proxy error: ${proxyResponse.status} ${proxyResponse.statusText}`,
                type: 'proxy_error'
              }
            });
          }
        }
      }
      
      // For successful non-streaming responses, try to parse as JSON
      try {
        const data = await proxyResponse.json();
        console.log(`[PROXY] Success: received chat completion response`);
        
        // Transform the response if needed (e.g., to match OpenAI format)
        const transformedData = {
          ...data,
          // Ensure there's at least a choices array
          choices: data.choices || [{ 
            message: { 
              content: data.response || data.text || data.content || JSON.stringify(data) 
            }
          }]
        };
        
        return res.status(200).json(transformedData);
      } catch (parseError) {
        console.error(`[PROXY] Error parsing JSON response: ${parseError}`);
        return res.status(500).json({
          error: {
            message: 'Failed to parse proxy response as JSON',
            type: 'server_error',
          }
        });
      }
    }
    
    // For streaming responses
    console.log(`[PROXY] Setting up streaming response`);
    
    // Set up proper response headers for streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    
    // Stream the response data
    if (proxyResponse.body) {
      const reader = proxyResponse.body.getReader();
      const decoder = new TextDecoder();
      
      try {
        let buffer = '';  // Buffer to handle partial chunks
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Send any remaining data in the buffer
            if (buffer.trim()) {
              console.log(`[PROXY] Processing remaining buffer before ending: ${buffer.substring(0, 50)}${buffer.length > 50 ? '...' : ''}`);
              const formattedData = formatStreamingResponse(buffer);
              if (formattedData) {
                res.write(formattedData);
              }
            }
            
            // Send final [DONE] event
            res.write('data: [DONE]\n\n');
            break;
          }
          
          // Decode the chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          console.log(`[PROXY] Received chunk (${chunk.length} bytes): ${chunk.substring(0, 50)}${chunk.length > 50 ? '...' : ''}`);
          
          // Handle raw text streaming - if there are no newlines, this might be pure text
          if (!chunk.includes('\n') && !buffer.includes('\n')) {
            const formattedData = formatStreamingResponse(chunk);
            if (formattedData) {
              res.write(formattedData);
            }
            continue; // Skip buffer processing for pure text chunks
          }
          
          buffer += chunk;
          
          // Process complete lines in the buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // The last line might be incomplete
          
          for (const line of lines) {
            if (line.trim()) {
              const formattedData = formatStreamingResponse(line);
              if (formattedData) {
                res.write(formattedData);
              }
            }
          }
          
          // Flush response to avoid buffering
          if (res.flush) {
            res.flush();
          }
        }
        
        console.log(`[PROXY] Streaming completed successfully`);
      } catch (error) {
        console.error('[PROXY] Error streaming response:', error);
        // Try to send an error in the stream
        try {
          res.write(`data: {"error":{"message":"Streaming error: ${(error as Error).message}"}}\n\n`);
        } catch (writeError) {
          console.error('[PROXY] Error sending error in stream:', writeError);
        }
      } finally {
        res.end();
      }
    } else {
      // No response body
      console.log(`[PROXY] No response body to stream`);
      res.write('data: {"error":{"message":"No response body from proxy"}}\n\n');
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    console.error('[PROXY] Error proxying request:', error);
    
    res.status(500).json({
      error: {
        message: 'An error occurred while processing your request',
        type: 'server_error',
      },
    });
  }
};

// Export the handler for the server.ts to use
export default chatCompletionsHandler;
