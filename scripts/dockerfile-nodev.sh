#!/bin/bash
set -e

# Clean up any previous build
echo "Cleaning previous build..."
rm -rf dist node_modules/.vite

# Build the application first
echo "Building application..."
node scripts/build-for-deploy.js

# Check if build succeeded
if [ ! -f "dist/index.html" ]; then
  echo "Build failed! dist/index.html not found."
  exit 1
fi

# Create a temporary Dockerfile for deployment
echo "Creating optimized Dockerfile for deployment..."

cat > Dockerfile.deploy << 'EOF'
# Use Node.js as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PORT=8080

# Copy files needed for server
COPY package*.json ./
COPY dist ./dist
COPY src/server ./src/server
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Install only production dependencies
RUN npm install --only=production --no-audit --no-fund

# Expose the port
EXPOSE 8080

# Start the server
CMD ["node", "src/server/server.js"]
EOF

echo "Created Dockerfile.deploy"

# Build the Docker image for AMD64
echo "Building Docker image for AMD64 architecture..."
docker build --platform linux/amd64 \
  -f Dockerfile.deploy \
  -t "gcr.io/$(gcloud config get-value project)/morsaas-dev:latest" .

# Push to GCR
echo "Pushing image to Google Container Registry..."
docker push "gcr.io/$(gcloud config get-value project)/morsaas-dev:latest"

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy morsaas-dev \
  --image="gcr.io/$(gcloud config get-value project)/morsaas-dev:latest" \
  --region="us-west1" \
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