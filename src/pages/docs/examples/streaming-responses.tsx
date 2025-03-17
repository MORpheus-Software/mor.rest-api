import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const StreamingResponsesExample = () => {
  const [userInput, setUserInput] = useState('Tell me a short story about space exploration');
  const [streaming, setStreaming] = useState(false);
  const [response, setResponse] = useState('');
  const [streamComplete, setStreamComplete] = useState(false);

  // This function simulates a streaming response
  const simulateStreamingResponse = (input) => {
    // Predefined responses based on common prompts
    const responses = {
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
    <DashboardLayout>
      <div className="px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Streaming Responses Example</h1>
          <p className="mt-2 text-muted-foreground">
            This page demonstrates how to implement and use streaming responses with the MOR.rest API.
          </p>
        </div>
        
        <Tabs defaultValue="demo">
          <TabsList>
            <TabsTrigger value="demo">Live Demo</TabsTrigger>
            <TabsTrigger value="code">Code Example</TabsTrigger>
            <TabsTrigger value="explanation">How It Works</TabsTrigger>
          </TabsList>
          
          <TabsContent value="demo" className="space-y-4 mt-4">
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
          </TabsContent>
          
          <TabsContent value="code" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Code Implementation</CardTitle>
                <CardDescription>
                  Full JavaScript example for implementing streaming responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <button 
                    className="absolute right-2 top-2 bg-primary text-primary-foreground hover:bg-primary/90 py-1 px-3 text-xs rounded-md z-10"
                    onClick={(event) => {
                      const codeContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MOR.rest Streaming Example</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .chat-container {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .messages {
      min-height: 300px;
      max-height: 500px;
      overflow-y: auto;
      padding: 16px;
      background-color: #f8fafc;
    }
    .input-container {
      display: flex;
      padding: 12px;
      border-top: 1px solid #e2e8f0;
    }
    input {
      flex-grow: 1;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      margin-right: 8px;
    }
    button {
      background-color: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      cursor: pointer;
    }
    button:disabled {
      background-color: #94a3b8;
      cursor: not-allowed;
    }
    .status {
      font-size: 12px;
      color: #64748b;
      margin-top: 8px;
    }
    .user-message {
      background-color: #dbeafe;
      border-radius: 16px 16px 0 16px;
      padding: 8px 16px;
      margin-bottom: 12px;
      align-self: flex-end;
      max-width: 80%;
      margin-left: auto;
    }
    .assistant-message {
      background-color: #e2e8f0;
      border-radius: 16px 16px 16px 0;
      padding: 8px 16px;
      margin-bottom: 12px;
      align-self: flex-start;
      max-width: 80%;
    }
    .messages-container {
      display: flex;
      flex-direction: column;
    }
    .cursor {
      display: inline-block;
      width: 2px;
      height: 14px;
      background-color: #000;
      animation: blink 1s infinite;
      margin-left: 2px;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
  </style>
</head>
<body>
  <h1>MOR.rest API Streaming Example</h1>
  <p>This example demonstrates how to use streaming responses with the MOR.rest API.</p>
  
  <div class="chat-container">
    <div class="messages" id="messages">
      <div class="messages-container" id="messages-container"></div>
    </div>
    <div class="input-container">
      <input type="text" id="user-input" placeholder="Type your message here..." />
      <button id="send-button">Send</button>
    </div>
  </div>
  <div class="status" id="status"></div>
  
  <script>
    const API_KEY = 'your_mor_rest_api_key'; // Replace with your API key
    let isStreaming = false;
    
    document.addEventListener('DOMContentLoaded', () => {
      const userInput = document.getElementById('user-input');
      const sendButton = document.getElementById('send-button');
      const messagesContainer = document.getElementById('messages-container');
      const statusElement = document.getElementById('status');
    
      // Function to add a user message to the chat
      function addUserMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'user-message';
        messageElement.textContent = text;
        messagesContainer.appendChild(messageElement);
        messagesContainer.parentElement.scrollTop = messagesContainer.parentElement.scrollHeight;
      }
    
      // Function to add or update an assistant message
      function addAssistantMessage(id, text) {
        let messageElement = document.getElementById(id);
        
        if (!messageElement) {
          messageElement = document.createElement('div');
          messageElement.id = id;
          messageElement.className = 'assistant-message';
          messagesContainer.appendChild(messageElement);
        }
        
        messageElement.textContent = text;
        
        // Auto-scroll
        messagesContainer.parentElement.scrollTop = messagesContainer.parentElement.scrollHeight;
        return messageElement;
      }
    
      // Handle send button click
      sendButton.addEventListener('click', () => {
        const message = userInput.value.trim();
        if (message && !isStreaming) {
          // Clear input
          userInput.value = '';
          
          // Add user message to chat
          addUserMessage(message);
          
          // Start streaming response
          streamChatCompletion(message);
        }
      });
    
      // Handle Enter key press
      userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !isStreaming) {
          sendButton.click();
        }
      });
    
      // Main stream handling function
      async function streamChatCompletion(userMessage) {
        // Guard against multiple simultaneous requests
        if (isStreaming) return;
        
        isStreaming = true;
        sendButton.disabled = true;
        
        const responseId = 'response-' + Date.now();
        const messageElement = addAssistantMessage(responseId, '');
        
        // Add blinking cursor
        const cursor = document.createElement('span');
        cursor.className = 'cursor';
        messageElement.appendChild(cursor);
        
        statusElement.textContent = 'Streaming...';
        
        try {
          const response = await fetch('https://api.mor.rest/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + API_KEY
            },
            body: JSON.stringify({
              model: 'LMR-Hermes-3-Llama-3.1-8B',
              messages: [{ role: 'user', content: userMessage }],
              stream: true
            })
          });
          
          if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
          }
          
          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let accumulatedText = '';
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Remove cursor on completion
              if (cursor.parentNode) {
                cursor.parentNode.removeChild(cursor);
              }
              break;
            }
            
            // Decode the chunk and process it
            const chunk = decoder.decode(value, { stream: true });
            
            // For SSE data in 'data: {...}' format
            const lines = chunk
              .split('\\n')
              .filter(line => line.startsWith('data: '))
              .map(line => line.replace('data: ', ''));
              
            for (const line of lines) {
              if (line === '[DONE]') continue;
              
              try {
                const parsedLine = JSON.parse(line);
                const content = parsedLine.choices[0]?.delta?.content || '';
                if (content) {
                  accumulatedText += content;
                  messageElement.textContent = accumulatedText;
                  messageElement.appendChild(cursor);
                }
              } catch (e) {
                console.error('Error parsing stream chunk:', e);
              }
            }
          }
          
          statusElement.textContent = 'Stream completed';
          
        } catch (error) {
          statusElement.textContent = \`Error: \${error.message}\`;
          console.error('Stream error:', error);
          // Remove cursor on error
          if (cursor.parentNode) {
            cursor.parentNode.removeChild(cursor);
          }
        } finally {
          isStreaming = false;
          sendButton.disabled = false;
        }
      }
    });
  </script>
</body>
</html>`;
                      navigator.clipboard.writeText(codeContent)
                        .then(() => {
                          const btn = event.target;
                          btn.textContent = "Copied!";
                          setTimeout(() => {
                            btn.textContent = "Copy";
                          }, 2000);
                        })
                        .catch(err => {
                          console.error('Failed to copy: ', err);
                        });
                    }}
                  >
                    Copy
                  </button>
                  <pre className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md overflow-x-auto text-sm pt-10">
                    {`// Complete implementation with stream handling

// HTML Structure
/*
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MOR.rest Streaming Example</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .chat-container {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .messages {
      min-height: 300px;
      max-height: 500px;
      overflow-y: auto;
      padding: 16px;
      background-color: #f8fafc;
    }
    .input-container {
      display: flex;
      padding: 12px;
      border-top: 1px solid #e2e8f0;
    }
    input {
      flex-grow: 1;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      margin-right: 8px;
    }
    button {
      background-color: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      cursor: pointer;
    }
    button:disabled {
      background-color: #94a3b8;
      cursor: not-allowed;
    }
    .status {
      font-size: 12px;
      color: #64748b;
      margin-top: 8px;
    }
    .user-message {
      background-color: #dbeafe;
      border-radius: 16px 16px 0 16px;
      padding: 8px 16px;
      margin-bottom: 12px;
      align-self: flex-end;
      max-width: 80%;
      margin-left: auto;
    }
    .assistant-message {
      background-color: #e2e8f0;
      border-radius: 16px 16px 16px 0;
      padding: 8px 16px;
      margin-bottom: 12px;
      align-self: flex-start;
      max-width: 80%;
    }
    .messages-container {
      display: flex;
      flex-direction: column;
    }
    .cursor {
      display: inline-block;
      width: 2px;
      height: 14px;
      background-color: #000;
      animation: blink 1s infinite;
      margin-left: 2px;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
  </style>
</head>
<body>
  <h1>MOR.rest API Streaming Example</h1>
  <p>This example demonstrates how to use streaming responses with the MOR.rest API.</p>
  
  <div class="chat-container">
    <div class="messages" id="messages">
      <div class="messages-container" id="messages-container"></div>
    </div>
    <div class="input-container">
      <input type="text" id="user-input" placeholder="Type your message here..." />
      <button id="send-button">Send</button>
    </div>
  </div>
  <div class="status" id="status"></div>
  
  <script>
    const API_KEY = 'your_mor_rest_api_key'; // Replace with your API key
    let isStreaming = false;
    
    document.addEventListener('DOMContentLoaded', () => {
      const userInput = document.getElementById('user-input');
      const sendButton = document.getElementById('send-button');
      const messagesContainer = document.getElementById('messages-container');
      const statusElement = document.getElementById('status');
    
      // Function to add a user message to the chat
      function addUserMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'user-message';
        messageElement.textContent = text;
        messagesContainer.appendChild(messageElement);
        messagesContainer.parentElement.scrollTop = messagesContainer.parentElement.scrollHeight;
      }
    
      // Function to add or update an assistant message
      function addAssistantMessage(id, text) {
        let messageElement = document.getElementById(id);
        
        if (!messageElement) {
          messageElement = document.createElement('div');
          messageElement.id = id;
          messageElement.className = 'assistant-message';
          messagesContainer.appendChild(messageElement);
        }
        
        messageElement.textContent = text;
        
        // Auto-scroll
        messagesContainer.parentElement.scrollTop = messagesContainer.parentElement.scrollHeight;
        return messageElement;
      }
    
      // Handle send button click
      sendButton.addEventListener('click', () => {
        const message = userInput.value.trim();
        if (message && !isStreaming) {
          // Clear input
          userInput.value = '';
          
          // Add user message to chat
          addUserMessage(message);
          
          // Start streaming response
          streamChatCompletion(message);
        }
      });
    
      // Handle Enter key press
      userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !isStreaming) {
          sendButton.click();
        }
      });
    
      // Main stream handling function
      async function streamChatCompletion(userMessage) {
        // Guard against multiple simultaneous requests
        if (isStreaming) return;
        
        isStreaming = true;
        sendButton.disabled = true;
        
        const responseId = 'response-' + Date.now();
        const messageElement = addAssistantMessage(responseId, '');
        
        // Add blinking cursor
        const cursor = document.createElement('span');
        cursor.className = 'cursor';
        messageElement.appendChild(cursor);
        
        statusElement.textContent = 'Streaming...';
        
        try {
          const response = await fetch('https://api.mor.rest/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + API_KEY
            },
            body: JSON.stringify({
              model: 'LMR-Hermes-3-Llama-3.1-8B',
              messages: [{ role: 'user', content: userMessage }],
              stream: true
            })
          });
          
          if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
          }
          
          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let accumulatedText = '';
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Remove cursor on completion
              if (cursor.parentNode) {
                cursor.parentNode.removeChild(cursor);
              }
              break;
            }
            
            // Decode the chunk and process it
            const chunk = decoder.decode(value, { stream: true });
            
            // For SSE data in 'data: {...}' format
            const lines = chunk
              .split('\\n')
              .filter(line => line.startsWith('data: '))
              .map(line => line.replace('data: ', ''));
              
            for (const line of lines) {
              if (line === '[DONE]') continue;
              
              try {
                const parsedLine = JSON.parse(line);
                const content = parsedLine.choices[0]?.delta?.content || '';
                if (content) {
                  accumulatedText += content;
                  messageElement.textContent = accumulatedText;
                  messageElement.appendChild(cursor);
                }
              } catch (e) {
                console.error('Error parsing stream chunk:', e);
              }
            }
          }
          
          statusElement.textContent = 'Stream completed';
          
        } catch (error) {
          statusElement.textContent = \`Error: \${error.message}\`;
          console.error('Stream error:', error);
          // Remove cursor on error
          if (cursor.parentNode) {
            cursor.parentNode.removeChild(cursor);
          }
        } finally {
          isStreaming = false;
          sendButton.disabled = false;
        }
      }
    });
  </script>
</body>
</html>`}
                  </pre>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    This example includes a complete implementation with HTML, CSS, and JavaScript that you can copy and use directly. Just replace the API_KEY with your actual MOR.rest API key.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="explanation" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>How Streaming Works</CardTitle>
                <CardDescription>
                  Understanding the technical implementation of API response streaming
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">1. Streaming Request</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    To initiate a streaming response, set <code>stream: true</code> in your request body. This tells the API to send back data incrementally as it's generated.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold">2. Server-Sent Events Format</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Streaming responses use the Server-Sent Events (SSE) format. Each chunk is prefixed with <code>data: </code> and contains a JSON object with a partial completion.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold">3. Reading the Stream</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    The <code>response.body.getReader()</code> method returns a reader object that can read chunks of data as they arrive. Each chunk needs to be decoded using a <code>TextDecoder</code>.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold">4. Processing Delta Updates</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Each delta update contains a small piece of the overall response. In chat completions, the <code>delta.content</code> field contains the new text to be appended to your UI.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold">5. Stream Completion</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    The stream is completed when either the <code>done</code> flag is true or when a special <code>[DONE]</code> message is received in the stream.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-between">
          <Button variant="outline" asChild>
            <Link to="/docs">← Back to Documentation</Link>
          </Button>
          <a 
            href="https://codesandbox.io/s/mor-rest-streaming-demo-forked-5cpvr2?file=/src/App.jsx"
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Open in CodeSandbox ↗
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StreamingResponsesExample; 