
import { Request, Response } from 'express';
import { z } from 'zod';
import chalk from 'chalk';
import { AuthenticatedRequest } from '../../lib/api/auth-middleware.js';

// Define the expected structure of the request body
const requestSchema = z.object({
  prompt: z.string().min(1, { message: "Prompt must be at least 1 character." }),
  model: z.string().optional().default('gpt-3.5-turbo'),
  temperature: z.number().optional().default(0.8),
  presence_penalty: z.number().optional().default(0),
  frequency_penalty: z.number().optional().default(0),
  stream: z.boolean().optional().default(true),
  seed: z.number().optional(),
  n: z.number().optional().default(1),
  max_tokens: z.number().optional().default(1024),
  top_p: z.number().optional().default(1),
});

type RequestData = z.infer<typeof requestSchema>;

// Function to validate the request body against the schema
function validateRequest(req: Request): { success: true, data: RequestData } | { success: false, error: string } {
  try {
    const parsedData = requestSchema.parse(req.body);
    return { success: true, data: parsedData };
  } catch (error: any) {
    console.error('[API] Validation error:', error);
    return { success: false, error: error.message || 'Invalid request data' };
  }
}

// Function to construct the OpenAI API payload
function constructPayload(data: RequestData) {
  const payload = {
    model: data.model,
    messages: [{ role: "user", content: data.prompt }],
    temperature: data.temperature,
    presence_penalty: data.presence_penalty,
    frequency_penalty: data.frequency_penalty,
    stream: data.stream,
    n: data.n,
    max_tokens: data.max_tokens,
    top_p: data.top_p,
  };
  
  if (data.seed) {
    // @ts-expect-error: not officially supported but works
    payload.seed = data.seed;
  }
  
  return payload;
}

// Stub for the OpenAI stream method since we don't have the actual implementation
function simulateOpenAIStream(response: Response): NodeJS.ReadableStream {
  const streamData = {
    on: function(event: string, callback: (data: Buffer | Error) => void) {
      if (event === 'data') {
        // Simulate a streamed response
        setTimeout(() => {
          callback(Buffer.from(JSON.stringify({
            choices: [{
              delta: { content: "This is a simulated response " },
              index: 0
            }]
          })));
          
          // End the stream after a short delay
          setTimeout(() => {
            if (this.endCallback) this.endCallback();
          }, 500);
        }, 100);
      } else if (event === 'error') {
        // No errors in our simulation
      } else if (event === 'end') {
        this.endCallback = callback;
      }
      return this;
    },
    endCallback: null as null | (() => void)
  };
  
  return streamData as unknown as NodeJS.ReadableStream;
}

// Function to handle the chat completions request
const postChatCompletion = async (req: Request, res: Response) => {
  console.log(chalk.blue('[API] Chat completions request received'));
  
  // Authenticate the request
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.isAuthenticated) {
    console.log(chalk.yellow('[API] Unauthorized request'));
    return res.status(401).json({
      error: {
        message: 'Unauthorized',
        type: 'unauthorized'
      }
    });
  }
  
  // Validate the request body
  const validationResult = validateRequest(req);
  
  if (!validationResult.success) {
    console.log(chalk.yellow('[API] Validation failed'));
    return res.status(400).json({ 
      error: {
        message: validationResult.error,
        type: 'invalid_request_error'
      } 
    });
  }
  
  const data = validationResult.data;
  
  // Construct the OpenAI API payload
  const payload = constructPayload(data);
  
  // Get the API key from the request headers
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    console.log(chalk.yellow('[API] Missing API key'));
    return res.status(400).json({
      error: {
        message: 'Missing API key',
        type: 'invalid_request_error'
      }
    });
  }
  
  try {
    // In a real implementation, we would call the OpenAI API here
    // For now, we'll just return a mock response
    console.log(chalk.green('[API] Generating mock response'));
    
    // Handle streaming response
    if (data.stream) {
      console.log(chalk.green('[API] Streaming response'));
      
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      
      const stream = simulateOpenAIStream(res);
      
      stream.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        res.write(`data: ${text}\n\n`);
      });

      stream.on('error', (err: Error) => {
        console.error('[API] Stream error:', err);
        res.end();
      });
      
      stream.on('end', () => {
        console.log('[API] Stream ended');
        res.end();
      });
      
      return;
    } else {
      console.log(chalk.green('[API] JSON response'));
      return res.status(200).json({
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: data.model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "This is a mock API response. The actual OpenAI integration is not implemented in this demo."
            },
            finish_reason: "stop"
          }
        ],
        usage: {
          prompt_tokens: data.prompt.length,
          completion_tokens: 30,
          total_tokens: data.prompt.length + 30
        }
      });
    }
  } catch (error: unknown) {
    console.error(chalk.red('[API] Request processing error:'), error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
    
    return res.status(500).json({
      error: {
        message: errorMessage,
        type: 'api_error'
      }
    });
  }
};

export default {
  postChatCompletion
};
