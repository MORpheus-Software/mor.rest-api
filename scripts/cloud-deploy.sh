#!/bin/bash
set -e

# Simpler deployment script for MorSaaS
echo "===== MorSaaS Cloud Deployment ====="

# Configuration Variables
PROJECT_ID="$(gcloud config get-value project)"
REGION="us-west1"
SERVICE_NAME="morsaas-dev"

echo "Using Project ID: $PROJECT_ID"
echo "Using Region: $REGION"
echo "Using Service Name: $SERVICE_NAME"

# Make sure the environment is set up properly
echo "Setting up Docker build environment..."
export PUPPETEER_SKIP_DOWNLOAD=true
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export NODE_ENV=production

# Clean up
echo "Cleaning build cache..."
rm -rf dist node_modules/.vite

# Run build
echo "Building application..."
node scripts/build-for-deploy.js

# Check if build succeeded
if [ ! -f "dist/index.html" ]; then
  echo "Build failed! dist/index.html not found."
  exit 1
fi

echo "Build successful. Building Docker image for AMD64 architecture..."

# Build Docker image directly using the existing Dockerfile
docker buildx build --platform linux/amd64 \
  --build-arg BUILD_ID="$(date +%s)" \
  --build-arg REACT_APP_AVAILABLE_MODELS="mistralai/mistral-small-3.1-24b-instruct|Mistral Small 3.1 24B,deepseek/deepseek-r1-zero|Deepseek R1 Zero,meta-llama/llama-3.3-70b-instruct|Llama 3.3 70B" \
  --build-arg VITE_API_BASE_URL="https://nfa-proxy-1081887913409.us-west1.run.app" \
  --build-arg SECONDARY_ENDPOINT_URL="https://openrouter.ai/api/v1/chat/completions" \
  --build-arg SECONDARY_ENDPOINT_MODEL="openrouter/auto" \
  --build-arg USE_FALLBACK_AS_PRIMARY="true" \
  --build-arg CONSUMER_API_URL="https://consumer-node-1081887913409.us-west1.run.app" \
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

echo "Deployment process complete!" 