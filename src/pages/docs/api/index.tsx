import { Link } from 'react-router-dom';

export default function APIReference() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">API Reference</h1>
      <p className="mb-4">
        [Placeholder content: This section provides detailed documentation of all available API endpoints, including request/response formats, error codes, and usage examples.]
      </p>
      <ul className="space-y-2">
        <li>
          <Link to="/docs/api/authentication" className="text-primary hover:underline">
            Authentication
          </Link>
        </li>
        <li>
          <Link to="/docs/api/chat-completions" className="text-primary hover:underline">
            Chat Completions Endpoint
          </Link>
        </li>
      </ul>
      <Link to="/docs" className="text-primary hover:underline mt-4 block">Back to Documentation</Link>
    </div>
  );
} 