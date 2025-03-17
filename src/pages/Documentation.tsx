import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, Code, Coffee, FileText, Lightbulb, Play, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const Documentation = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
        <p className="text-muted-foreground">Learn how to use our API and features</p>
      </div>
      
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search documentation..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Tabs defaultValue="api">
          <TabsList className="w-full sm:w-auto">
            {/* <TabsTrigger value="guides">Guides</TabsTrigger> */}
            <TabsTrigger value="api">API Reference</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            {/* <TabsTrigger value="faq">FAQ</TabsTrigger> */}
          </TabsList>
          
          <TabsContent value="guides" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Coffee className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle>Getting Started</CardTitle>
                  </div>
                  <CardDescription>Learn the basics of using our platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="text-sm">
                      <Link to="/docs/guides/introduction" className="text-primary hover:underline">
                        Introduction to MOR.rest API
                      </Link>
                    </li>
                    <li className="text-sm">
                      <Link to="/docs/guides/creating-first-token" className="text-primary hover:underline">
                        Creating your first API token
                      </Link>
                    </li>
                    <li className="text-sm">
                      <Link to="/docs/guides/token-permissions" className="text-primary hover:underline">
                        Understanding token permissions
                      </Link>
                    </li>
                    <li className="text-sm">
                      <Link to="/docs/guides/securing-tokens" className="text-primary hover:underline">
                        Securing your API tokens
                      </Link>
                    </li>
                  </ul>
                  <Button variant="ghost" size="sm" className="mt-4 w-full justify-start" asChild>
                    <Link to="/docs/guides">View all getting started guides</Link>
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Book className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle>User Guides</CardTitle>
                  </div>
                  <CardDescription>Comprehensive guides for all features</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="text-sm">
                      <Link to="/docs/guides/managing-api-tokens" className="text-primary hover:underline">
                        Managing API tokens
                      </Link>
                    </li>
                    <li className="text-sm">
                      <Link to="/docs/guides/api-playground" className="text-primary hover:underline">
                        Using the API playground
                      </Link>
                    </li>
                    <li className="text-sm">
                      <Link to="/docs/guides/mor-token-staking" className="text-primary hover:underline">
                        MOR token staking guide
                      </Link>
                    </li>
                    <li className="text-sm">
                      <Link to="/docs/guides/account-management" className="text-primary hover:underline">
                        Account management
                      </Link>
                    </li>
                  </ul>
                  <Button variant="ghost" size="sm" className="mt-4 w-full justify-start" asChild>
                    <Link to="/docs/guides">View all user guides</Link>
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Lightbulb className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle>Best Practices</CardTitle>
                  </div>
                  <CardDescription>Tips and recommendations for optimal usage</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="text-sm">
                      <Link to="/docs/best-practices/token-security" className="text-primary hover:underline">
                        Token security best practices
                      </Link>
                    </li>
                    <li className="text-sm">
                      <Link to="/docs/best-practices/rate-limiting" className="text-primary hover:underline">
                        Rate limiting strategies
                      </Link>
                    </li>
                    <li className="text-sm">
                      <Link to="/docs/best-practices/optimizing-requests" className="text-primary hover:underline">
                        Optimizing API requests
                      </Link>
                    </li>
                    <li className="text-sm">
                      <Link to="/docs/best-practices/monitoring-analytics" className="text-primary hover:underline">
                        Monitoring and analytics
                      </Link>
                    </li>
                  </ul>
                  <Button variant="ghost" size="sm" className="mt-4 w-full justify-start" asChild>
                    <Link to="/docs/best-practices">View all best practices</Link>
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle>Tutorials</CardTitle>
                  </div>
                  <CardDescription>Step-by-step walkthroughs for common tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="text-sm">
                      <Link to="/docs/tutorials/building-chatbot" className="text-primary hover:underline">
                        Building a chatbot with our API
                      </Link>
                    </li>
                    <li className="text-sm">
                      <Link to="/docs/tutorials/token-authentication" className="text-primary hover:underline">
                        Implementing token authentication
                      </Link>
                    </li>
                    <li className="text-sm">
                      <Link to="/docs/tutorials/streaming-response-ui" className="text-primary hover:underline">
                        Creating a streaming response UI
                      </Link>
                    </li>
                    <li className="text-sm">
                      <Link to="/docs/tutorials/advanced-prompt-engineering" className="text-primary hover:underline">
                        Advanced prompt engineering
                      </Link>
                    </li>
                  </ul>
                  <Button variant="ghost" size="sm" className="mt-4 w-full justify-start" asChild>
                    <Link to="/docs/tutorials">View all tutorials</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="api" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Code className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle>API Reference</CardTitle>
                </div>
                <CardDescription>Complete documentation of API endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Authentication</h3>
                    <p className="text-sm text-muted-foreground">
                      All API requests must include your API token in the Authorization header:
                    </p>
                    <pre className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md text-sm overflow-x-auto">
                      {`Authorization: Bearer sk-your-api-token`}
                    </pre>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Chat Completions Endpoint</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate chat completions from the provided prompt.
                    </p>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Endpoint</p>
                      <pre className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md text-sm overflow-x-auto">
                        {`POST /api/v1/chat/completions`}
                      </pre>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Request Body</p>
                      <pre className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md text-sm overflow-x-auto">
                        {`{
  "model": "LMR-Hermes-3-Llama-3.1-8B",
  "messages": [{ "role": "user", "content": "Say hello" }],
  "stream": true
}`}
                      </pre>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Response</p>
                      <pre className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md text-sm overflow-x-auto">
                        {`{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "LMR-Hermes-3-Llama-3.1-8B",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I assist you today?"
    },
    "finish_reason": "stop"
  }]
}`}
                      </pre>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="sm" className="mt-2">
                    <Play className="mr-2 h-4 w-4" />
                    Try this endpoint in Playground
                  </Button>
                  <Button variant="ghost" size="sm" className="mt-4 w-full justify-start" asChild>
                    <Link to="/docs/api">View full API reference</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="examples" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/*
              <Card>
                <CardHeader>
                  <CardTitle>Example: Web Chat Interface</CardTitle>
                  <CardDescription>Create a simple chat interface using our API</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="example-section">
                    <div className="web-chat-example" style={{ display: 'none' }}>
                      This example is hidden because it is not functional in the current implementation.
                    </div>
                    <Link to="/docs/examples/web-chat" className="btn-primary">
                      View full example
                    </Link>
                  </div>
                </CardContent>
              </Card>
              */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Example: Streaming Responses</CardTitle>
                  <CardDescription>Implement streaming responses for a better UX</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md text-sm overflow-x-auto">
                    {`// Example JavaScript code
async function streamResponse(message) {
  const response = await fetch('/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + API_KEY
    },
    body: JSON.stringify({
      model: 'LMR-Hermes-3-Llama-3.1-8B',
      messages: [{ role: 'user', content: message }],
      stream: true
    })
  });
  
  const reader = response.body.getReader();
  // Process the stream...
}`}
                  </pre>
                  <Button variant="outline" className="mt-4 w-full" asChild>
                    <Link to="/docs/examples/streaming-responses">View full example</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="faq" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>Quick answers to common questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">What are API tokens used for?</h3>
                  <p className="text-sm text-muted-foreground">
                    API tokens are secure credentials that allow you to authenticate your requests to our API. Each token can have specific permissions, allowing you to control exactly what actions it can perform.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">How do I secure my API tokens?</h3>
                  <p className="text-sm text-muted-foreground">
                    Never share your API tokens or commit them to public repositories. Store them securely in environment variables or secret management systems. Use specific tokens for specific applications and rotate them regularly.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">What models are available?</h3>
                  <p className="text-sm text-muted-foreground">
                    We offer a range of models including LMR-Hermes-3-Llama-3.1-8B, Llama-3.1-Sonar-Large-70B, and Llama-3.1-Sonar-Huge-405B. Different models have different capabilities and pricing.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">What are the rate limits?</h3>
                  <p className="text-sm text-muted-foreground">
                    Rate limits depend on your tier. Basic users have 10,000 requests per day, Silver users have 100,000, Gold users have 500,000, and Platinum users have unlimited requests.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">How does MOR token staking work?</h3>
                  <p className="text-sm text-muted-foreground">
                    By staking MOR tokens, you can unlock higher tiers with increased rate limits and additional features. The more tokens you stake, the higher your tier and the more benefits you receive.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">How do I contact support?</h3>
                  <p className="text-sm text-muted-foreground">
                    You can contact our support team via email at support@tokenhub.example.com or through the chat widget in the bottom right corner of any page.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Documentation;
