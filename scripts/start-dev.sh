#!/bin/bash

# Make sure the script exits on any error
set -e

echo "======================================================"
echo "MorSaaS Development Environment with Required Redis"
echo "======================================================"

# Start Redis container using docker-compose
echo "Starting Redis container..."
docker-compose up -d redis

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
until docker-compose exec redis redis-cli ping | grep -q "PONG"
do
  echo "Redis not ready yet - sleeping for 1 second..."
  sleep 1
done
echo "Redis is ready!"

# Add test key to Redis directly
TESTKEY=$(node scripts/add-test-key.js | grep "Bearer" | awk '{print $2}')
echo "Using API Key: $TESTKEY"

echo "Adding test key to Redis directly..."
# docker-compose exec redis redis-cli set "apikey:$TESTKEY" "local-test-user"
# echo "Test key added to Redis"

# Set environment variables for the application
export REDIS_URL="redis://localhost:6379"
export NODE_ENV="development"
export PORT="4000"
export ALLOW_LOCAL_STORAGE="false"  # Explicitly disable localStorage fallback

# Display the environment variables
echo "Environment variables set:"
echo "REDIS_URL=$REDIS_URL"
echo "NODE_ENV=$NODE_ENV"
echo "PORT=$PORT"
echo "ALLOW_LOCAL_STORAGE=$ALLOW_LOCAL_STORAGE"

# Start the application
echo "Starting the application..."
npm run dev 