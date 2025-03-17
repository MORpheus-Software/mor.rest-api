import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const StreamingDemo = () => {
  const [userInput, setUserInput] = useState('Tell me a short story about space exploration');
  const [streaming, setStreaming] = useState(false);
  const [response, setResponse] = useState('');
  const [streamComplete, setStreamComplete] = useState(false);

  // This function simulates a streaming response
  const simulateStreamingResponse = (input: string) => {
    // Predefined responses based on common prompts
    const responses: Record<string, string> = {
      "hello": "Hello there! How can I assist you today?",
      "tell me a joke": "Why don't scientists trust atoms? Because they make up everything!",
      "tell me a short story about space exploration": "In the year 2157, humanity launched the first interstellar mission. The spacecraft 'Horizon' carried a crew of twelve brave explorers toward Alpha Centauri. What began as a scientific journey soon became a tale of discovery, resilience, and wonder as they encountered phenomena beyond imagination. After five years of travel, they made first contact with an intelligent crystalline species that communicated through light patterns. This historic meeting forever changed humanity's understanding of our place in the cosmos.",
      "how are you": "I'm functioning well, thank you for asking! How can I help you today?",
      "what is streaming": "Streaming in API responses allows data to be sent incrementally as it's generated, rather than waiting for the complete response. This creates a more responsive user experience, especially for large responses like chat completions."
    };

    // Default response if no matching predefined response
    let fullResponse = responses[input.toLowerCase()] || 
      `Here's a response to your query: "${input}". Streaming allows for more interactive and responsive experiences.`;

    setStreaming(true);
    setResponse('');
    setStreamComplete(false);
    
    let index = 0;
    // Simulate character-by-character streaming with random timing
    const streamInterval = setInterval(() => {
      if (index < fullResponse.length) {
        setResponse(prev => prev + fullResponse.charAt(index));
        index++;
      } else {
        clearInterval(streamInterval);
        setStreaming(false);
        setStreamComplete(true);
      }
    }, Math.random() * 30 + 20); // Random delay between 20-50ms for realistic typing effect
    
    return () => clearInterval(streamInterval);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Interactive Streaming Demo</CardTitle>
        <CardDescription>
          Type a message and see the response stream in character by character.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Enter a message..."
              className="flex-grow"
            />
            <Button 
              onClick={() => simulateStreamingResponse(userInput)}
              disabled={streaming || !userInput.trim()}
            >
              {streaming ? "Streaming..." : "Send"}
            </Button>
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