// Polyfills for Node.js global objects in browser environment

// Define global for libraries that expect Node.js global object
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.global = window;
}

// Buffer polyfill
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Buffer = window.Buffer || require('buffer/').Buffer;
}

// Process polyfill
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.process = window.process || { env: {} };
} 