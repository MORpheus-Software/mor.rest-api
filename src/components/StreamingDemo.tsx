import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

// Mock response generator
const generateMockResponse = (): string => {
  return "In the year 2157, humanity launched the first interstellar mission. The spacecraft 'Horizon' carried a crew of twelve brave explorers toward Alpha Centauri. What began as a scientific journey soon became a tale of discovery, resilience, and wonder as they encountered phenomena beyond imagination. After five years of travel, they made first contact with an intelligent crystalline species that communicated through light patterns. This historic meeting forever changed humanity's understanding of our place in the cosmos.";
};

// Mock fetch implementation
const mockFetch = async (url: string, options: RequestInit) => {
  const fullResponse = generateMockResponse();
  
  // Create a mock ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      // Split response into chunks and send them with delays
      const chunks = fullResponse.split('');
      for (const chunk of chunks) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 20));
        
        // Create a mock SSE data chunk
        const mockData = {
          choices: [{
            delta: { content: chunk }
          }]
        };
        
        // Send the chunk in SSE format
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(mockData)}\n\n`));
      }
      
      // Send completion message
      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
};

export const StreamingDemo = () => {
  const [streaming, setStreaming] = useState(false);
  const [response, setResponse] = useState('');
  const [streamComplete, setStreamComplete] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const handleStreamingResponse = async () => {
    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setStreaming(true);
    setResponse('');
    setStreamComplete(false);

    try {
      // Use mock fetch instead of real fetch
      const response = await mockFetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo_key'
        },
        body: JSON.stringify({
          model: 'LMR-Hermes-3-Llama-3.1-8B',
          messages: [{ role: 'user', content: 'Tell me a short story about space exploration' }],
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          
          // Process SSE data format
          const lines = chunk
            .split('\n')
            .filter(line => line.startsWith('data: '))
            .map(line => line.replace('data: ', ''));

          for (const line of lines) {
            if (line === '[DONE]') continue;

            try {
              const parsedLine = JSON.parse(line);
              const content = parsedLine.choices[0]?.delta?.content || '';
              if (content) {
                accumulatedText += content;
                setResponse(accumulatedText);
              }
            } catch (e) {
              console.error('Error parsing stream chunk:', e);
            }
          }
        }
      }

      setStreamComplete(true);
    } catch (error) {
      console.error('Stream error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while streaming the response",
        variant: "destructive",
      });
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreaming(false);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Interactive Streaming Demo</CardTitle>
        <CardDescription>
          Click the button to see a streaming response of a short story about space exploration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value="Tell me a short story about space exploration"
              disabled
              className="flex-grow bg-muted"
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleStreamingResponse}
                disabled={streaming}
              >
                {streaming ? "Streaming..." : "Start Stream"}
              </Button>
              {streaming && (
                <Button 
                  variant="destructive"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
          
          <div className="border rounded-md p-4 min-h-[200px] bg-slate-50 dark:bg-slate-900">
            <p className="whitespace-pre-wrap">
              {response}
              {streaming && <span className="animate-pulse">▌</span>}
            </p>
            {streamComplete && !streaming && (
              <div className="text-xs text-muted-foreground mt-4 pt-2 border-t">
                Stream completed
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 