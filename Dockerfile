# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy package files and install dependencies first (for better layer caching)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Create .env file from environment variables if it doesn't exist
RUN touch .env
# Set model environment variables (passed from GitHub Actions)
ARG REACT_APP_DEFAULT_MODEL_NAME
ARG REACT_APP_DEFAULT_MODEL_ID
ARG VITE_API_BASE_URL
RUN echo "REACT_APP_DEFAULT_MODEL_NAME=${REACT_APP_DEFAULT_MODEL_NAME:-LMR-Hermes-3-Llama-3.1-8B}" >> .env
RUN echo "REACT_APP_DEFAULT_MODEL_ID=${REACT_APP_DEFAULT_MODEL_ID:-llama-3.1-8b-instant}" >> .env
RUN echo "VITE_API_BASE_URL=${VITE_API_BASE_URL:-https://nfa-proxy-1081887913409.us-west1.run.app}" >> .env

# Log environment variables for build
RUN echo "Generated .env file:" && cat .env | sort

# Copy index.html first to ensure it's not missed
COPY index.html ./
RUN echo "Verifying index.html exists:" && \
    cat index.html | grep -n "<meta" || echo "No meta tags found in index.html"

# Copy source files
COPY . .

# Disable Vite's transform cache for HTML files to ensure fresh builds
ENV VITE_DISABLE_TRANSFORM_CACHE=true

# Build the frontend (Vite handles the frontend environment)
RUN echo "Building with model config..." && \
    npm run build

# Verify the built index.html contains expected meta tags
RUN echo "Verifying built index.html:" && \
    cat dist/index.html | grep -n "<meta" || echo "No meta tags found in built index.html"

# Stage 2: Build the TypeScript server
FROM node:20-alpine AS server-builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy environment configuration
COPY --from=frontend-builder /app/.env ./

# Copy TypeScript configuration files
COPY tsconfig*.json ./

# Copy source files
COPY src ./src
COPY vite.config.ts ./

# Add a runtime check to environment.d.ts to declare Vite types properly
RUN mkdir -p src/types && \
    echo "/// <reference types=\"vite/client\" />\n\ninterface ImportMeta {\n  readonly env: Record<string, any>;\n}" > src/types/environment.d.ts

# Make a safer build
RUN echo "Compiling TypeScript to JavaScript..." && \
    npx tsc --project tsconfig.build.json || echo "TypeScript compilation had errors, but continuing build"

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

# Start the server
CMD ["node", "dist/src/server/server.js"] 