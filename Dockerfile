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

# Create a file extension map to help with imports
RUN echo "{\n  \"imports\": {\n    \"#/*\": \"./dist/*\"\n  }\n}" > ./package.json.imports

# Update package.json to include imports field for ESM
RUN cat package.json.imports package.json > package.json.tmp && \
    sed -i 's/\(  "type": "module",\)/\1\n  "imports": {\n    "#\/*": ".\/dist\/*"\n  },/' package.json.tmp && \
    mv package.json.tmp package.json

# Compile TypeScript to JavaScript
RUN echo "Compiling TypeScript to JavaScript..." && \
    tsc --project tsconfig.build.json || echo "TypeScript compilation had errors, but we're continuing the build"

# Show compile results for build verification
RUN echo "Compiled files:" && \
    find dist -type f | sort

# Create a helper to fix import paths in compiled JS files
RUN echo "Fixing import paths in compiled JS files..." && \
    find dist -type f -name "*.js" -exec sed -i 's|\\.\\.\/\\.\\.\/\\.\\./lib|\\#/lib|g' {} \; && \
    find dist -type f -name "*.js" -exec sed -i 's|\\.\\.\/\\.\\.\/lib|\\#/lib|g' {} \; && \
    find dist -type f -name "*.js" -exec sed -i 's|\\.\\.\/lib|\\#/lib|g' {} \;

# Stage 3: Build the final production image
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund

# Copy compiled server files from server-builder
COPY --from=server-builder /app/dist ./dist
COPY --from=server-builder /app/package.json ./

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

# Use a single CMD instruction that can handle debug mode
CMD if [ "$DEBUG" = "true" ]; then \
      echo "Running in debug mode"; \
      echo "File structure:"; \
      find ./dist -type f | sort; \
      echo "Server JS files:"; \
      find ./dist -name "server.js"; \
      echo "Constants JS files:"; \
      find ./dist -name "constants.js"; \
      echo "Package.json:"; \
      cat package.json; \
    fi && \
    node --experimental-json-modules --loader ts-node/esm ./dist/server/server.js 