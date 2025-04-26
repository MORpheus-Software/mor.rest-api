# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy package files and install dependencies first (for better layer caching)
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Create .env file from environment variables if it doesn't exist
RUN touch .env
# Set model environment variables (passed from GitHub Actions)
ARG REACT_APP_DEFAULT_MODEL_NAME
ARG REACT_APP_DEFAULT_MODEL_ID
ARG VITE_API_BASE_URL
ARG SECONDARY_ENDPOINT_URL
ARG SECONDARY_ENDPOINT_MODEL
ARG USE_FALLBACK_AS_PRIMARY
ARG CONSUMER_API_URL
ARG REACT_APP_AVAILABLE_MODELS

# Write environment variables to .env file
RUN echo "REACT_APP_DEFAULT_MODEL_NAME=${REACT_APP_DEFAULT_MODEL_NAME:-Llama-3.1-8B}" >> .env
RUN echo "REACT_APP_DEFAULT_MODEL_ID=${REACT_APP_DEFAULT_MODEL_ID:-meta-llama/llama-3.3-70b-instruct}" >> .env
RUN echo "VITE_API_BASE_URL=${VITE_API_BASE_URL:-https://nfa-proxy-1081887913409.us-west1.run.app}" >> .env
RUN echo "SECONDARY_ENDPOINT_URL=${SECONDARY_ENDPOINT_URL:-https://openrouter.ai/api}" >> .env
RUN echo "SECONDARY_ENDPOINT_MODEL=${SECONDARY_ENDPOINT_MODEL:-openrouter/auto}" >> .env
RUN echo "USE_FALLBACK_AS_PRIMARY=${USE_FALLBACK_AS_PRIMARY:-false}" >> .env
RUN echo "CONSUMER_API_URL=${CONSUMER_API_URL:-https://consumer-node-1081887913409.us-west1.run.app}" >> .env
# Use printf to handle special characters in the model list
RUN printf "REACT_APP_AVAILABLE_MODELS=%s\n" "${REACT_APP_AVAILABLE_MODELS:-mistralai/mistral-small-3.1-24b-instruct|Mistral Small 3.1 24B,deepseek/deepseek-r1-zero|Deepseek R1 Zero,meta-llama/llama-3.3-70b-instruct|Llama 3.3 70B}" >> .env

# Log environment variables for build
RUN echo "Generated .env file:" && cat .env | sort

# Copy index.html first to ensure it's not missed
COPY index.html ./
RUN echo "Verifying index.html exists:" && \
    cat index.html | grep -n "<meta" || echo "No meta tags found in index.html"

# Copy source files
COPY . .

# Make scripts executable
RUN chmod +x scripts/*.js scripts/*.sh || true

# Disable Vite's transform cache for HTML files to ensure fresh builds
ENV VITE_DISABLE_TRANSFORM_CACHE=true

# Build using our custom script that bypasses TypeScript errors
RUN echo "Building with custom script to bypass TypeScript errors..." && \
    node scripts/build-for-deploy.js

# Verify the built index.html contains expected meta tags
RUN echo "Verifying built index.html:" && \
    cat dist/index.html | grep -n "<meta" || echo "No meta tags found in built index.html"

# Stage 2: Build the TypeScript server
FROM node:20-alpine AS server-builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Install tsc-alias for resolving path aliases
RUN npm install --save-dev tsc-alias

# Copy environment configuration
COPY --from=frontend-builder /app/.env ./

# Copy TypeScript configuration files
COPY tsconfig*.json ./

# Copy source files
COPY src ./src
COPY vite.config.ts ./
COPY scripts ./scripts

# Make scripts executable
RUN chmod +x scripts/fix-esm-imports.js scripts/apply-fixes-for-production.js

# Add a runtime check to environment.d.ts to declare Vite types properly
RUN mkdir -p src/types && \
    echo "/// <reference types=\"vite/client\" />\n\ninterface ImportMeta {\n  readonly env: Record<string, any>;\n}" > src/types/environment.d.ts

# Apply fixes and compile with proper path alias resolution
RUN echo "Applying fixes and compiling TypeScript to JavaScript..." && \
    node scripts/apply-fixes-for-production.js && \
    npx tsc --project tsconfig.build.json && \
    npx tsc-alias --project tsconfig.build.json

# Create package.json to mark the dist directory as ES module
RUN echo '{ "type": "module" }' > dist/package.json

# Debug - show the files in the dist directory
RUN echo "Compiled files in dist:" && \
    find dist -type f | sort

# Stage 3: Final production image
FROM node:20-alpine
WORKDIR /app

# Generate a unique build ID for cache control
ARG BUILD_ID
ENV DEPLOY_VERSION="${BUILD_ID:-$(date +%s)}"
RUN echo "Building with DEPLOY_VERSION: $DEPLOY_VERSION"

# Copy package.json files
COPY package*.json ./

# Install only production dependencies - with more verbose output and fallback approach
RUN echo "Installing production dependencies..." && \
    npm install --production --no-audit --no-fund --loglevel verbose || \
    (echo "Retrying with standard npm install..." && \
     npm install --omit=dev --no-audit --no-fund)

# Copy compiled server files from server-builder
COPY --from=server-builder /app/dist ./dist

# Copy static frontend files from frontend-builder
COPY --from=frontend-builder /app/dist ./public

# Add any required runtime dependencies
RUN echo "Installing runtime dependencies..." && \
    npm install --no-audit --no-fund --omit=dev express dotenv cors ioredis

# Copy .env file for runtime environment variables
COPY --from=frontend-builder /app/.env ./.env

# Create runtime configuration script using multiple echo commands
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "Starting server with runtime environment..."' >> /app/start.sh && \
    echo '# Create runtime environment file' >> /app/start.sh && \
    echo 'touch /app/.env.runtime' >> /app/start.sh && \
    echo '# Copy existing environment' >> /app/start.sh && \
    echo 'cat /app/.env > /app/.env.runtime' >> /app/start.sh && \
    echo '# Override with runtime values if provided' >> /app/start.sh && \
    echo 'if [ ! -z "$REACT_APP_DEFAULT_MODEL_NAME" ]; then' >> /app/start.sh && \
    echo '  echo "REACT_APP_DEFAULT_MODEL_NAME=$REACT_APP_DEFAULT_MODEL_NAME" >> /app/.env.runtime' >> /app/start.sh && \
    echo '  echo "Using runtime model name: $REACT_APP_DEFAULT_MODEL_NAME"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'if [ ! -z "$REACT_APP_DEFAULT_MODEL_ID" ]; then' >> /app/start.sh && \
    echo '  echo "REACT_APP_DEFAULT_MODEL_ID=$REACT_APP_DEFAULT_MODEL_ID" >> /app/.env.runtime' >> /app/start.sh && \
    echo '  echo "Using runtime model ID: $REACT_APP_DEFAULT_MODEL_ID"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'if [ ! -z "$SECONDARY_ENDPOINT_URL" ]; then' >> /app/start.sh && \
    echo '  echo "SECONDARY_ENDPOINT_URL=$SECONDARY_ENDPOINT_URL" >> /app/.env.runtime' >> /app/start.sh && \
    echo '  echo "Using runtime secondary endpoint URL: $SECONDARY_ENDPOINT_URL"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'if [ ! -z "$SECONDARY_ENDPOINT_MODEL" ]; then' >> /app/start.sh && \
    echo '  echo "SECONDARY_ENDPOINT_MODEL=$SECONDARY_ENDPOINT_MODEL" >> /app/.env.runtime' >> /app/start.sh && \
    echo '  echo "Using runtime secondary endpoint model: $SECONDARY_ENDPOINT_MODEL"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'if [ ! -z "$USE_FALLBACK_AS_PRIMARY" ]; then' >> /app/start.sh && \
    echo '  echo "USE_FALLBACK_AS_PRIMARY=$USE_FALLBACK_AS_PRIMARY" >> /app/.env.runtime' >> /app/start.sh && \
    echo '  echo "Using runtime fallback as primary setting: $USE_FALLBACK_AS_PRIMARY"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'if [ ! -z "$CONSUMER_API_URL" ]; then' >> /app/start.sh && \
    echo '  echo "CONSUMER_API_URL=$CONSUMER_API_URL" >> /app/.env.runtime' >> /app/start.sh && \
    echo '  echo "Using runtime consumer API URL: $CONSUMER_API_URL"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'if [ ! -z "$REACT_APP_AVAILABLE_MODELS" ]; then' >> /app/start.sh && \
    echo '  echo "REACT_APP_AVAILABLE_MODELS=$REACT_APP_AVAILABLE_MODELS" >> /app/.env.runtime' >> /app/start.sh && \
    echo '  echo "Using runtime available models: $REACT_APP_AVAILABLE_MODELS"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'if [ ! -z "$OPENROUTER_HTTP_REFERER" ]; then' >> /app/start.sh && \
    echo '  echo "OPENROUTER_HTTP_REFERER=$OPENROUTER_HTTP_REFERER" >> /app/.env.runtime' >> /app/start.sh && \
    echo '  echo "Using runtime OpenRouter HTTP referer: $OPENROUTER_HTTP_REFERER"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'if [ ! -z "$OPENROUTER_APP_TITLE" ]; then' >> /app/start.sh && \
    echo '  echo "OPENROUTER_APP_TITLE=$OPENROUTER_APP_TITLE" >> /app/.env.runtime' >> /app/start.sh && \
    echo '  echo "Using runtime OpenRouter app title: $OPENROUTER_APP_TITLE"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'if [ ! -z "$OPENROUTER_APP_VERSION" ]; then' >> /app/start.sh && \
    echo '  echo "OPENROUTER_APP_VERSION=$OPENROUTER_APP_VERSION" >> /app/.env.runtime' >> /app/start.sh && \
    echo '  echo "Using runtime OpenRouter app version: $OPENROUTER_APP_VERSION"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '# Start the server with the runtime environment' >> /app/start.sh && \
    echo 'export $(grep -v "^#" /app/.env.runtime | xargs)' >> /app/start.sh && \
    echo 'node dist/src/server/server.js' >> /app/start.sh

# Make sure the script is executable
RUN chmod +x /app/start.sh && \
    # Debug - verify the script exists and is executable
    ls -la /app/start.sh && \
    cat /app/start.sh

# Make the app more robust in production
COPY scripts/healthcheck.js ./scripts/

# Add healthcheck to ensure the app is running properly
HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 \
    CMD node scripts/healthcheck.js || exit 1

# Expose the port
EXPOSE 8080

# Set runtime environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Start the server with the runtime environment script
CMD ["/app/start.sh"] 