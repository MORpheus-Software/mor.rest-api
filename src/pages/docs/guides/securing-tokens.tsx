import { Link } from 'react-router-dom';

export default function SecuringTokens() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Securing Your API Tokens</h1>
      <p className="mb-4">
        [Placeholder content: This guide will explain best practices to secure your API tokens, including avoiding exposure and safe storage tips.]
      </p>
      <Link to="/docs/guides" className="text-primary hover:underline">Back to Guides</Link>
    </div>
  );
} 