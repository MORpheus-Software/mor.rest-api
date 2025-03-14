import { Request, Response } from 'express';
import { OpenAIStream } from '../../lib/openai-stream.js';
import { generateSchema } from '../../lib/generate-schema.js';
import { z } from 'zod';
import { fromZodError } from 'zod-error';
import chalk from 'chalk';
import { authMiddleware, AuthenticatedRequest } from '../../lib/api/auth-middleware.js';
import { kvGet, kvSet } from '../../lib/redis-adapter.js';
import { FRONTEND_API_ENDPOINT } from '../../lib/api/constants.js';

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

// Function to validate the request body against the schema
function validateRequest(req: Request): { success: true, data: z.infer<typeof requestSchema> } | { success: false, error: any } {
  try {
    const parsedData = requestSchema.parse(req.body);
    return { success: true, data: parsedData };
  } catch (error: any) {
    console.error('[API] Validation error:', error);
    return { success: false, error: fromZodError(error) };
  }
}

// Function to construct the OpenAI API payload
function constructPayload(data: z.infer<typeof requestSchema>) {
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

// Function to call the OpenAI API
async function callOpenAI(payload: any, apiKey: string) {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      headers: headers,
      method: "POST",
      body: JSON.stringify(payload),
    });
    
    return response;
  } catch (error) {
    console.error('[API] OpenAI call error:', error);
    throw error;
  }
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
    return res.status(400).json({ error: validationResult.error });
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
    // Call the OpenAI API
    const response = await callOpenAI(payload, apiKey);
    
    if (!response.ok) {
      console.log(chalk.red('[API] OpenAI API error'));
      return handleRequestError(res, await response.json(), response.status);
    }
    
    // Handle streaming response
    if (data.stream) {
      console.log(chalk.green('[API] Streaming response'));
      return streamResponse(res, response);
    } else {
      console.log(chalk.green('[API] JSON response'));
      const json = await response.json();
      return res.status(200).json(json);
    }
  } catch (error: any) {
    console.error(chalk.red('[API] Request processing error:', error));
    return handleRequestError(res, error);
  }
};

// Fix the streaming response function with proper type annotations
function streamResponse(res: Response, data: any) {
  const encoder = new TextEncoder();
  const stream = OpenAIStream(data);
  
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  
  stream.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    res.write(`data: ${text}\n\n`);
  });

  stream.on('error', (err: Error) => {
    console.error('[API] OpenAI stream error:', err);
    res.end();
  });
  
  stream.on('end', () => {
    console.log('[API] Stream ended');
    res.end();
  });
}

// Fix the error handling with proper type casting
function handleRequestError(res: Response, error: unknown, statusCode = 500) {
  console.error('[API] Chat completions error:', error);
  
  // Handle text errors by proper type checking and casting
  if (error instanceof Error) {
    const textError = error;
    return res.status(statusCode).json({
      error: {
        message: textError.message || 'Unknown error occurred',
        type: 'api_error'
      }
    });
  }
  
  // For stream errors, also do proper type checking
  if (typeof error === 'object' && error !== null) {
    const streamError = error as { message?: string };
    return res.status(statusCode).json({
      error: {
        message: streamError.message || 'Unknown streaming error occurred',
        type: 'api_error'
      }
    });
  }
  
  // Default case
  return res.status(statusCode).json({
    error: {
      message: 'An unknown error occurred',
      type: 'api_error'
    }
  });
}

export default {
  postChatCompletion
};
