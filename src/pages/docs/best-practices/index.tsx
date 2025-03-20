import { Link } from 'react-router-dom';

export default function BestPracticesIndex() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Best Practices</h1>
      <ul className="space-y-2 text-lg">
         <li>
           <Link to="/docs/best-practices/token-security" className="text-primary hover:underline">
             Token Security Best Practices
           </Link>
         </li>
         <li>
           <Link to="/docs/best-practices/rate-limiting" className="text-primary hover:underline">
             Rate Limiting Strategies
           </Link>
         </li>
         <li>
           <Link to="/docs/best-practices/optimizing-requests" className="text-primary hover:underline">
             Optimizing API Requests
           </Link>
         </li>
         <li>
           <Link to="/docs/best-practices/monitoring-analytics" className="text-primary hover:underline">
             Monitoring and Analytics
           </Link>
         </li>
      </ul>
    </div>
  );
} 