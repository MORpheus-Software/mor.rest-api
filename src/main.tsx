// Import polyfills first
import './polyfills.ts'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupLovableEnvironment } from './lib/environment.ts'

// Set up environment based on where we're running
setupLovableEnvironment();

// Log environment information
console.log(`[MAIN] Starting application in ${process.env.NODE_ENV} mode`);
console.log(`[MAIN] API Base URL: ${process.env.VITE_API_BASE_URL || 'default'}`);
console.log(`[MAIN] Lovable Environment: ${process.env.LOVABLE_ENV === 'true' ? 'Yes' : 'No'}`);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
