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
COPY src/server ./src/server
COPY src/api ./src/api
COPY src/lib ./src/lib
COPY src/utils ./src/utils
COPY vite.config.ts ./

# Install TypeScript
RUN npm install -g typescript

# Validate TypeScript config files
RUN echo "Checking TypeScript config files:" && \
    ls -la tsconfig*.json && \
    echo "Contents of tsconfig.node.json:" && \
    cat tsconfig.node.json

# Compile TypeScript to JavaScript with better error reporting
RUN tsc --project tsconfig.node.json || (echo "TypeScript compilation failed. Check configurations and source files." && exit 1)

# Verify the compiled output
RUN ls -la dist || (echo "Compilation did not produce expected output directory" && exit 1)

# Stage 3: Build the final image with compiled code
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
RUN npm install --production --no-audit --no-fund --save express dotenv cors ioredis

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Set a healthcheck to verify the app is running
HEALTHCHECK --interval=5s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Use a simple startup command without ts-node for faster startup
CMD ["node", "dist/server/server.js"] 