#!/bin/bash
set -e

# ESM Fix Deployment Script for MorSaaS
echo "===== MorSaaS ESM Fix Deployment ====="

# Configuration
PROJECT_ID="$(gcloud config get-value project)"
REGION="us-west1"
SERVICE_NAME="morsaas-dev"

# Create a temporary Vite config without ESM imports
echo "Creating temporary Vite config without ESM imports..."
cat > vite.config.temp.js << 'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Determine if we're in development mode
  const isDevelopment = mode === 'development';
  const isPreview = mode === 'preview' || mode === 'production';
  
  // Set default Redis URL
  const redisUrl = 'redis://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379';
  process.env.REDIS_URL = redisUrl;
  
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/api': {
          target: isDevelopment ? 'http://localhost:4000' : '/api',
          changeOrigin: isDevelopment,
          secure: !isDevelopment
        }
      }
    },
    plugins: [
      react(),
      nodePolyfills({
        protocolImports: true,
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        buffer: 'buffer/',
        process: 'process/browser',
        stream: 'stream-browserify',
        util: 'util/'
      },
    },
    build: {
      emptyOutDir: true,
    },
    define: {
      'process.env': {
        NODE_ENV: JSON.stringify(mode),
        VITE_API_BASE_URL: JSON.stringify('/api'),
        REDIS_URL: JSON.stringify(redisUrl)
      },
      global: 'window',
    },
  };
});
EOF

# Run the build with the temporary config
echo "Building with temporary config..."
VITE_CONFIG_PATH=vite.config.temp.js npm run build

# Verify build
if [ ! -d "dist" ]; then
  echo "Build failed! 'dist' directory not found."
  exit 1
fi

echo "Creating server.js file..."
# Create a simple Express server to serve the built files
cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// For any other request, send the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

echo "Creating simplified Dockerfile..."
# Create a simple Dockerfile
cat > Dockerfile.esm-fix << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy built files and server
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

echo "Building Docker image..."
docker build -f Dockerfile.esm-fix -t "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" .

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
  --timeout=600s

echo "Deployment complete!"

# Clean up temporary files
echo "Cleaning up temporary files..."
rm -f vite.config.temp.js

echo "Done!" 