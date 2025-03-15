#!/bin/bash
set -e

echo "====================================================="
echo "Testing Production Build Configuration"
echo "====================================================="

# Build the Docker image with production settings
echo "Building Docker image..."
docker build -t morsaas-production:latest .

# Run the container with production settings
echo "Running container with production settings..."
docker run -d --name morsaas-production-test \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  morsaas-production:latest

echo "Container started. Waiting for it to initialize..."
sleep 5

# Check if the container is running
if docker ps | grep morsaas-production-test > /dev/null; then
  echo "Container is running. Checking logs..."
  docker logs morsaas-production-test
  
  echo "====================================================="
  echo "Testing health endpoint..."
  curl -s http://localhost:8080/api/health || echo "Health endpoint not available yet"
  
  echo -e "\n\nProduction build test complete."
  echo "To stop the container: docker stop morsaas-production-test"
  echo "To remove the container: docker rm morsaas-production-test"
else
  echo "Container failed to start. Checking logs..."
  docker logs morsaas-production-test
  
  # Clean up
  docker rm morsaas-production-test || true
  
  echo "Production build test failed."
fi 