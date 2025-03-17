import { Link } from 'react-router-dom';

export default function MORTokenStaking() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">MOR Token Staking Guide</h1>
      <p className="mb-4">
        [Placeholder content: This guide explains how to stake MOR tokens to unlock enhanced features and higher API rate limits.]
      </p>
      <Link to="/docs/guides" className="text-primary hover:underline">Back to Guides</Link>
    </div>
  );
} 