import { Link } from 'react-router-dom';

export default function Introduction() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Introduction to MOR.rest API</h1>
      <p className="mb-4">
        Welcome to the MOR.rest API. This guide provides an overview of our API, its main features, and how to get started quickly.
      </p>
      <p className="mb-4">
        [Placeholder content: Describe the basics of the API, authentication, endpoints, and available models.]
      </p>
      <Link to="/docs/guides" className="text-primary hover:underline">Back to Guides</Link>
    </div>
  );
} 