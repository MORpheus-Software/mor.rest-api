# Stage 1: Build the React frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build the TypeScript server
FROM node:18-alpine as server-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/server ./src/server
COPY src/api ./src/api
COPY src/lib ./src/lib
COPY src/utils ./src/utils

# Compile TypeScript to JavaScript
RUN npm install -g typescript
RUN tsc --project tsconfig.json

# Stage 3: Build the final image with compiled code
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled server files from server-builder
COPY --from=server-builder /app/dist ./dist

# Copy static frontend files from frontend-builder
COPY --from=frontend-builder /app/dist ./public

# Install necessary runtime dependencies without dev dependencies
RUN npm install --production --save express dotenv cors ioredis

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