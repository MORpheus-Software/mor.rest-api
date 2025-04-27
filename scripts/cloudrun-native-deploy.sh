#!/bin/bash
set -e

# Cloud Run native deployment script for MorSaaS
echo "===== MorSaaS Cloud Run Native Deployment ====="

# Configuration
PROJECT_ID="$(gcloud config get-value project)"
REGION="us-west1"
SERVICE_NAME="morsaas-dev"

echo "Using Project ID: $PROJECT_ID"
echo "Using Region: $REGION"
echo "Using Service Name: $SERVICE_NAME"

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

# Create a minimal server.js file
echo "Creating simple Express server..."
cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();

// Serve static files from dist directory
app.use(express.static('dist'));

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Set port and start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# Create minimal package.json for deployment
cat > package.json.deploy << 'EOF'
{
  "name": "morsaas",
  "version": "1.0.0",
  "main": "server.js",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "scripts": {
    "start": "node server.js"
  }
}
EOF

# Temporarily backup the original package.json
mv package.json package.json.original
mv package.json.deploy package.json

echo "Deploying to Cloud Run using native buildpacks..."
# Use gcloud run deploy with source
gcloud run deploy "$SERVICE_NAME" \
  --source=. \
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

# Restore the original package.json
mv package.json.original package.json

echo "Deployment complete!" 