import { Link } from 'react-router-dom';

export default function AccountManagement() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Account Management</h1>
      <p className="mb-4">
        [Placeholder content: This guide covers managing your account settings, profile, and related API credentials.]
      </p>
      <Link to="/docs/guides" className="text-primary hover:underline">Back to Guides</Link>
    </div>
  );
} 