import { Link } from 'react-router-dom';

export default function ChatCompletions() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Chat Completions Endpoint</h1>
      <p className="mb-4">
        [Placeholder content: This document details the Chat Completions endpoint of the MOR.rest API. It includes example requests, response formats, error handling, and best practices for utilizing the endpoint effectively.]
      </p>
      <Link to="/docs/api" className="text-primary hover:underline">Back to API Reference</Link>
    </div>
  );
} 