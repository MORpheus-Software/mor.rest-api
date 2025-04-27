#!/bin/bash
set -e

# Simple MorSaaS Deployment Script for Google Cloud Run
echo "===== Simple MorSaaS Deployment ====="

# Configuration
PROJECT_ID="$(gcloud config get-value project)"
REGION="us-west1"
SERVICE_NAME="morsaas-dev"

# Clean up and build locally first
echo "Cleaning build cache..."
rm -rf dist node_modules/.vite

echo "Building application locally..."
node scripts/build-for-deploy.js

# Check build
if [ ! -f "dist/index.html" ]; then
  echo "Build failed! dist/index.html not found."
  exit 1
fi

echo "Listing dist directory contents:"
ls -la dist/

# Create a simple server file
echo "Creating simplified server.js..."
cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// For any other request, send index.html (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# Create a temp directory for Docker build
echo "Creating temporary build directory..."
mkdir -p docker-build
cp -R dist docker-build/
cp server.js docker-build/
cp package.json docker-build/

# Create a simplified Dockerfile directly in the build directory
echo "Creating simplified Dockerfile..."
cat > docker-build/Dockerfile << 'EOF'
FROM --platform=linux/amd64 node:20-alpine

WORKDIR /app

# Copy pre-built files and server
COPY dist/ ./dist/
COPY server.js ./
COPY package.json ./

# Install only production dependencies
RUN npm install --only=production --no-audit --no-fund

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
EOF

echo "Building Docker image with explicit platform..."
cd docker-build && docker build --platform=linux/amd64 -t "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" .
cd ..

echo "Pushing Docker image to GCR..."
docker push "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --cpu=1 \
  --memory=2Gi \
  --concurrency=80 \
  --min-instances=1 \
  --max-instances=10 \
  --timeout=600s \
  --set-env-vars="REDIS_URL=redis://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379,USE_FALLBACK_AS_PRIMARY=true"

# Clean up
echo "Cleaning up temporary files..."
rm -rf docker-build

echo "Deployment complete!" 