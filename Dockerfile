# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Stage 2: Build the TypeScript server
FROM node:22-alpine AS server-builder
WORKDIR /app

# Copy package files and install dependencies (including dev dependencies for TypeScript)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy TypeScript configuration files
COPY tsconfig*.json ./

# Copy source files
COPY src ./src
COPY vite.config.ts ./

# Compile TypeScript to JavaScript
# Use the project's TypeScript compiler, not a global one
RUN echo "Compiling TypeScript to JavaScript..." && \
    npx tsc --project tsconfig.build.json

# Create package.json to mark the dist directory as ES module
RUN echo '{ "type": "module" }' > dist/package.json

# Debug - show compiled imports
RUN echo "Checking compiled imports:" && \
    cat dist/src/api/v1/chat/completions.js | grep "import"

# Show the directory structure
RUN find dist -type d | sort && \
    echo "Compiled files:" && \
    find dist -type f | sort

# Stage 3: Final image with only production dependencies
FROM node:22-alpine
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund

# Copy compiled server files from server-builder
COPY --from=server-builder /app/dist ./dist

# Copy static frontend files from frontend-builder
COPY --from=frontend-builder /app/dist ./public

# Add runtime dependencies if needed
RUN npm install --production --no-audit --no-fund --save express dotenv cors ioredis

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

# Expose the port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Start the server - we don't need experimental flags now
CMD ["node", "dist/src/server/server.js"] 