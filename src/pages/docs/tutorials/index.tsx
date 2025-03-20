import { Link } from 'react-router-dom';

export default function TutorialsIndex() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Tutorials</h1>
      <ul className="space-y-2 text-lg">
        <li>
          <Link to="/docs/tutorials/building-chatbot" className="text-primary hover:underline">
            Building a Chatbot with our API
          </Link>
        </li>
        <li>
          <Link to="/docs/tutorials/token-authentication" className="text-primary hover:underline">
            Implementing Token Authentication
          </Link>
        </li>
        <li>
          <Link to="/docs/tutorials/streaming-response-ui" className="text-primary hover:underline">
            Creating a Streaming Response UI
          </Link>
        </li>
        <li>
          <Link to="/docs/tutorials/advanced-prompt-engineering" className="text-primary hover:underline">
            Advanced Prompt Engineering
          </Link>
        </li>
      </ul>
    </div>
  );
} 