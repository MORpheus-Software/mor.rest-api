import { Link } from 'react-router-dom';

export default function APIPlaygroundGuide() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Using the API Playground</h1>
      <p className="mb-4">
        [Placeholder content: This guide explains how to effectively use the API Playground to test endpoints and experiment with the MOR.rest API.]
      </p>
      <Link to="/docs/guides" className="text-primary hover:underline">Back to Guides</Link>
    </div>
  );
} 