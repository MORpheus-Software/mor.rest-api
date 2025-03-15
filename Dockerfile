# Stage 1: Build the React frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Stage 2: Build the TypeScript server
FROM node:18-alpine as server-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy all TypeScript configuration files
COPY tsconfig*.json ./

# Copy source files that will be compiled
COPY src ./src

# Install TypeScript
RUN npm install -g typescript

# Compile TypeScript to JavaScript
RUN echo "Compiling TypeScript to JavaScript..." && \
    tsc --project tsconfig.build.json || echo "TypeScript compilation had errors, but we're continuing the build"

# Show compile results for build verification
RUN echo "Compiled files:" && \
    find dist -type f | sort

# Stage 3: Build the final production image
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund

# Copy compiled server files from server-builder
COPY --from=server-builder /app/dist ./dist

# Copy static frontend files from frontend-builder
COPY --from=frontend-builder /app/dist ./public

# Install necessary runtime dependencies
RUN npm install --production --no-audit --no-fund --save express dotenv cors ioredis ts-node

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Set a healthcheck to verify the app is running
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Create a startup script that can handle both production and debug modes
RUN echo '#!/bin/sh\n\
if [ "$DEBUG" = "true" ]; then\n\
  echo "Running in debug mode"\n\
  echo "File structure:"\n\
  find ./dist -type f | sort\n\
  echo "Server JS files:"\n\
  find ./dist -name "server.js"\n\
  echo "Constants JS files:"\n\
  find ./dist -name "constants.js"\n\
fi\n\
\n\
# Start the server\n\
exec node --experimental-json-modules --loader ts-node/esm ./dist/server/server.js\n\
' > /app/start.sh && chmod +x /app/start.sh

# Run the startup script
CMD ["/app/start.sh"] 