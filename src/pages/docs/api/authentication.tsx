import { Link } from 'react-router-dom';

export default function AuthenticationDoc() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Authentication</h1>
      <p className="mb-4">
        [Placeholder content: This document provides details on the authentication process, including how to include your API token in the request headers, expected formats, and handling authentication errors.]
      </p>
      <Link to="/docs/api" className="text-primary hover:underline">Back to API Reference</Link>
    </div>
  );
} 