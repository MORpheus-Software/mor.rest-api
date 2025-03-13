
import { Request, Response } from 'express';
import { authMiddleware, requireAuth, AuthenticatedRequest } from '../../lib/api/auth-middleware.js';
import { API_BASE_URL } from '../../lib/api/constants.js';
import { validateApiKey } from '../../lib/api/keys.js';

export const formatStreamingResponse = (originalData: string): string => {
  // If empty or whitespace, ignore
  if (!originalData || !originalData.trim()) {
    return '';
  }
  
  // If the data is already properly formatted, return it as is
  if (originalData.startsWith('data:')) {
    return originalData;
  }

  try {
    // Try to parse the data as JSON
    const jsonData = JSON.parse(originalData);
    
    // Format it as an SSE compatible event
    return `data: ${JSON.stringify(jsonData)}\n\n`;
  } catch (e) {
    // If parsing fails, handle as text
    return `data: {"choices":[{"delta":{"content":"${originalData}"}}]}\n\n`;
  }
};

export const proxyToBaseImage = async (
  endpoint: string,
  method: string,
  headers: Record<string, string>,
  body: any
) => {
  const url = `${API_BASE_URL}/v1/${endpoint}`;
  
  console.log(`[PROXY] Proxying request to: ${url}`);
  
  // Clean up headers
  delete headers['host'];
  delete headers['content-length'];
  
  return fetch(url, {
    method,
    headers,
    body: JSON.stringify(body)
  });
};

export default async function chatCompletionsHandler(req: Request, res: Response) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: {
        message: 'Method not allowed',
        type: 'invalid_request_error',
      }
    });
  }

  // Authenticate the request
  await authMiddleware(req, res, () => {});
  
  // Check if authenticated
  const authReq = req as AuthenticatedRequest;
  if (!authReq.isAuthenticated) {
    return res.status(401).json({
      error: {
        message: authReq.authError || 'Unauthorized',
        type: 'invalid_request_error',
      }
    });
  }

  try {
    // Parse the request body
    const reqBody = req.body;
    const isStreamingRequest = reqBody.stream === true;
    
    // Add debug logging for the request
    console.log(`[PROXY] Request body:`, {
      model: reqBody.model,
      messages: reqBody.messages?.length,
      stream: reqBody.stream,
    });
    
    // Extract headers from the original request
    const headers: Record<string, string> = {};
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value;
      } else if (Array.isArray(value) && value.length > 0) {
        headers[key] = value[0];
      }
    });
    
    // Log the authenticated user making the request
    console.log(`[PROXY] Authenticated request from user: ${authReq.userId}`);
    
    // Proxy the request to BaseImage
    const proxyResponse = await proxyToBaseImage(
      'chat/completions',
      'POST',
      headers,
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
          ...(data as Record<string, any>),
          // Ensure there's at least a choices array
          choices: (data as any).choices || [{ 
            message: { 
              content: (data as any).response || (data as any).text || (data as any).content || JSON.stringify(data) 
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
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
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
    return res.status(500).json({
      error: {
        message: 'An error occurred while processing your request',
        type: 'server_error',
      }
    });
  }
}
