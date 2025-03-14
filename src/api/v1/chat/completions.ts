import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../lib/api/auth-middleware.js';
import { API_BASE_URL } from '../../../lib/api/constants.js';
import { updateKeyLastUsed } from '../../../lib/api/keys.js';
// @ts-ignore - using node-fetch v2 which doesn't have TypeScript declarations
import fetch from 'node-fetch';

// Format streaming responses for OpenAI compatibility
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

// Helper to process streaming buffer and extract complete events
const processStreamBuffer = (buffer: string): { events: string[], remainder: string } => {
  if (!buffer.includes('\n\n')) {
    // No complete events in the buffer yet
    return { events: [], remainder: buffer };
  }
  
  // Split by double newlines which typically separate SSE events
  const parts = buffer.split('\n\n');
  
  // The last part might be incomplete (no trailing \n\n)
  const remainder = parts.pop() || '';
  
  // Return complete events and the remainder
  return {
    events: parts.map(part => part + '\n\n'), // Re-add the separator that was removed by split
    remainder
  };
};

// Proxy function to forward requests to the base AI service
export async function proxyToBaseImage(
  endpoint: string,
  method: string,
  headers: Record<string, string>,
  body: any
) {
  // The correct URL format for the remote API
  // API_BASE_URL is the base domain
  // We need to add /v1/ prefix as this is the expected path structure
  const url = `${API_BASE_URL}/v1/${endpoint}`;
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

/**
 * Handler for chat completions endpoint
 */
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
      try {
        await updateKeyLastUsed(apiKey);
      } catch (err) {
        console.error('[COMPLETIONS] Error updating key usage:', err);
      }
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
    try {
      // Check if the response body is a ReadableStream and can be processed with getReader
      if (proxyResponse.body && typeof proxyResponse.body.getReader === 'function') {
        const reader = proxyResponse.body.getReader();
        const decoder = new TextDecoder();
        
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
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process and send complete events from the buffer
          const processedBuffer = processStreamBuffer(buffer);
          buffer = processedBuffer.remainder;
          
          if (processedBuffer.events.length > 0) {
            processedBuffer.events.forEach(event => {
              if (event.trim() && !event.includes('data: [DONE]')) {
                const formattedData = formatStreamingResponse(event);
                if (formattedData) {
                  res.write(formattedData);
                }
              } else if (event.includes('data: [DONE]')) {
                res.write('data: [DONE]\n\n');
              }
            });
          }
        }
      } else {
        // Alternative approach if getReader is not available - handle as a Node.js stream or plain response
        console.log(`[PROXY] Response body is not a standard ReadableStream, using alternative approach`);
        
        // If we have a Node.js readable stream
        if (proxyResponse.body && typeof proxyResponse.body.on === 'function') {
          let buffer = '';
          
          proxyResponse.body.on('data', (chunk) => {
            const decodedChunk = chunk.toString();
            buffer += decodedChunk;
            
            // Process and send complete events from the buffer
            const processedBuffer = processStreamBuffer(buffer);
            buffer = processedBuffer.remainder;
            
            if (processedBuffer.events.length > 0) {
              processedBuffer.events.forEach(event => {
                if (event.trim() && !event.includes('data: [DONE]')) {
                  const formattedData = formatStreamingResponse(event);
                  if (formattedData) {
                    res.write(formattedData);
                  }
                } else if (event.includes('data: [DONE]')) {
                  res.write('data: [DONE]\n\n');
                }
              });
            }
          });
          
          proxyResponse.body.on('end', () => {
            // Send any remaining data in the buffer
            if (buffer.trim()) {
              const formattedData = formatStreamingResponse(buffer);
              if (formattedData) {
                res.write(formattedData);
              }
            }
            res.write('data: [DONE]\n\n');
            res.end();
          });
          
          proxyResponse.body.on('error', (err) => {
            console.error('[PROXY] Error streaming response:', err);
            res.write(`data: { "error": "Streaming error: ${err.message}" }\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
          });
        } else {
          // If it's neither a ReadableStream nor a Node.js stream, try to get the full response
          console.log(`[PROXY] Falling back to full response handling`);
          try {
            const responseText = await proxyResponse.text();
            
            // Send the full response as one chunk
            const formattedData = formatStreamingResponse(responseText);
            if (formattedData) {
              res.write(formattedData);
            }
            res.write('data: [DONE]\n\n');
            res.end();
          } catch (textError) {
            console.error('[PROXY] Error getting full response text:', textError);
            res.write(`data: { "error": "Failed to read response: ${textError.message}" }\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
          }
        }
      }
    } catch (streamError) {
      console.error('[PROXY] Error processing stream:', streamError);
      
      // Only try to write to the response if headers haven't been sent yet
      if (!res.headersSent) {
        res.write(`data: { "error": "Stream processing error: ${streamError.message}" }\n\n`);
        res.write('data: [DONE]\n\n');
      }
      
      // Always end the response stream
      res.end();
    }
  } catch (error) {
    console.error('[PROXY] Error proxying request:', error);
    
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          message: 'An error occurred while processing your request',
          type: 'server_error',
        },
      });
    } else {
      // If headers have already been sent, try to send error in the stream format
      try {
        res.write(`data: {"error":{"message":"An error occurred while processing your request"}}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (writeError) {
        console.error('[PROXY] Error writing to stream after error:', writeError);
        // Just end the response as a last resort
        try {
          res.end();
        } catch (endError) {
          console.error('[PROXY] Even ending the response failed:', endError);
        }
      }
    }
  }
};

export default chatCompletionsHandler;
