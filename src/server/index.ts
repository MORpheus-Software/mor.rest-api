// Server entry point using ES modules
import('./server.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
}); 