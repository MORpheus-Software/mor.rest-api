import { Link } from 'react-router-dom';

export default function ManagingAPITokens() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Managing API Tokens</h1>
      <p className="mb-4">
        [Placeholder content: This guide will cover how to manage your API tokens, including updating, revoking, and rotating tokens safely.]
      </p>
      <Link to="/docs/guides" className="text-primary hover:underline">Back to Guides</Link>
    </div>
  );
} 