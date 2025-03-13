
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../lib/api/auth-middleware.js';
import { API_BASE_URL } from '../../lib/api/constants.js';
import { validateApiKey } from '../../lib/api/keys.js';

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

const chatCompletions = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  
  try {
    // Return a mock response instead of trying to connect to a real AI service
    // This will help test the API endpoint
    
    const { messages, stream = false } = req.body;
    const userMessage = messages && messages.length > 0 ? messages[messages.length - 1].content : '';
    
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Generate a mock streaming response
      const response = "I'm a simulated AI response. This is a test of the streaming completion endpoint.";
      const chunks = response.split(' ');
      
      // Send the content word by word to simulate streaming
      chunks.forEach((chunk, index) => {
        setTimeout(() => {
          const formattedResponse = formatStreamingResponse(chunk + ' ');
          res.write(formattedResponse);
          
          // Send the [DONE] marker when the stream is complete
          if (index === chunks.length - 1) {
            res.write('data: [DONE]\n\n');
            res.end();
          }
        }, index * 100);
      });
    } else {
      // Generate a mock non-streaming response
      const responseText = `This is a simulated response to: "${userMessage}"`;
      
      // Send the mock completion
      res.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: req.body.model || 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: responseText,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: userMessage.length,
          completion_tokens: responseText.length,
          total_tokens: userMessage.length + responseText.length,
        },
      });
    }
  } catch (error) {
    console.error('[COMPLETIONS] Error:', error);
    
    res.status(500).json({
      error: {
        message: 'An error occurred while processing your request',
        type: 'server_error',
      },
    });
  }
};

export default {
  chatCompletions
};
