
// Server entry point using ES modules
console.log('Starting API server...');
import('./server.js').then(() => {
  console.log('API server started successfully');
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
