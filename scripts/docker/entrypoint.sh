#!/bin/sh
echo "Starting container with entrypoint script"
echo "Checking for start.sh..."
if [ -f /app/start.sh ]; then
  echo "Found start.sh - executing it..."
  exec /app/start.sh
else
  echo "ERROR: start.sh not found in $(pwd)"
  echo "Directory contents:"
  ls -la
  echo "Using fallback server..."
  exec node /app/fallback-server.js
fi 