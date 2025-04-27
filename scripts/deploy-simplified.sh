#!/bin/bash
set -e

# Super simplified deployment script for MorSaaS
echo "===== MorSaaS Simplified Deployment ====="

# Configuration
PROJECT_ID="$(gcloud config get-value project)"
REGION="us-west1"
SERVICE_NAME="morsaas-dev"

# Clean up and build
echo "Cleaning build cache..."
rm -rf dist node_modules/.vite

echo "Building application..."
node scripts/build-for-deploy.js

# Check build
if [ ! -f "dist/index.html" ]; then
  echo "Build failed! dist/index.html not found."
  exit 1
fi

echo "Converting server JS files..."
# Copy server.ts to server.js with simple file extension change
cp src/server/server.ts src/server/server.js

echo "Building Docker image for AMD64 architecture..."
# Build with platform flag and simplified Dockerfile
docker build --platform linux/amd64 \
  -f Dockerfile.simplified \
  -t "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" .

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

echo "Deployment complete!" 