import { Link } from 'react-router-dom';

export default function GuidesIndex() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Guides</h1>
      <ul className="space-y-2 text-lg">
         <li><Link to="/docs/guides/introduction" className="text-primary hover:underline">Introduction to MOR.rest API</Link></li>
         <li><Link to="/docs/guides/creating-first-token" className="text-primary hover:underline">Creating Your First API Token</Link></li>
         <li><Link to="/docs/guides/token-permissions" className="text-primary hover:underline">Understanding Token Permissions</Link></li>
         <li><Link to="/docs/guides/securing-tokens" className="text-primary hover:underline">Securing Your API Tokens</Link></li>
         <li><Link to="/docs/guides/managing-api-tokens" className="text-primary hover:underline">Managing API Tokens</Link></li>
         <li><Link to="/docs/guides/api-playground" className="text-primary hover:underline">Using the API Playground</Link></li>
         <li><Link to="/docs/guides/mor-token-staking" className="text-primary hover:underline">MOR Token Staking Guide</Link></li>
         <li><Link to="/docs/guides/account-management" className="text-primary hover:underline">Account Management</Link></li>
      </ul>
    </div>
  );
} 