
import { Request, Response } from 'express';
import { z } from 'zod';

// Define the schema for chat completion requests
const chatCompletionSchema = z.object({
  model: z.string().optional().default('mistral'),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string()
    })
  ),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  max_tokens: z.number().min(1).max(4096).optional(),
  stream: z.boolean().optional().default(false)
});

type ChatCompletionRequest = z.infer<typeof chatCompletionSchema>;

// Chat completions handler
export const chatCompletionsHandler = {
  postChatCompletion: async (req: Request, res: Response) => {
    try {
      // Parse and validate the request body
      const result = chatCompletionSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          error: {
            message: "Invalid request parameters",
            type: "invalid_request_error",
            details: result.error.errors
          }
        });
      }
      
      // Handle the validated request
      const { messages, model, temperature, max_tokens, stream } = result.data;
      
      // Log the request
      console.log(`[CHAT] Processing ${stream ? 'streaming' : 'non-streaming'} chat completion request with model: ${model}`);
      
      // This is a placeholder for actual implementation
      if (stream) {
        // Set appropriate headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Send response chunks
        const intervalId = setInterval(() => {
          const chunk = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [{
              index: 0,
              delta: { content: 'Hello, this is a test response.' },
              finish_reason: null
            }]
          };
          
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }, 1000);
        
        // End the stream after a few seconds
        setTimeout(() => {
          clearInterval(intervalId);
          
          // Send final chunk with finish_reason
          const finalChunk = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [{
              index: 0,
              delta: {},
              finish_reason: 'stop'
            }]
          };
          
          res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }, 3000);
        
        // Handle client disconnect
        req.on('close', () => {
          clearInterval(intervalId);
          console.log('[CHAT] Client disconnected, stopping stream');
        });
      } else {
        // Non-streaming response
        const completion = {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: model,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'This is a placeholder response for testing. Your actual implementation would call an AI model here.'
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
          }
        };
        
        res.json(completion);
      }
    } catch (err: unknown) {
      console.error('[CHAT] Error in chat completion:', err);
      
      res.status(500).json({
        error: {
          message: err instanceof Error ? err.message : 'An unknown error occurred',
          type: 'server_error'
        }
      });
    }
  }
};
