#!/bin/sh
echo "Starting server..."
echo "Node environment: $NODE_ENV"
echo "Port: $PORT"
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la
echo "Available files in public directory:"
ls -la public || echo "No public files found"
echo "Available files in dist/server:"
ls -la dist/server || echo "No server files found"
echo "Starting node with server.js"
exec node --experimental-json-modules --loader ts-node/esm dist/server/server.js 