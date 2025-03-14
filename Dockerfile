# Stage 1: Build the React frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build the final image with both frontend and server
FROM node:18-alpine

WORKDIR /app

# Install production dependencies for the server
COPY package*.json ./
RUN npm ci --only=production

# Copy server files
COPY src/server ./src/server
COPY src/api ./src/api
COPY src/lib ./src/lib
COPY src/utils ./src/utils
COPY tsconfig.json ./

# Copy built frontend from the previous stage
COPY --from=frontend-builder /app/dist ./dist

# Install necessary runtime dependencies
RUN npm install --save express dotenv cors ioredis

# Expose the port the app runs on
ENV PORT=8080
EXPOSE 8080

# Set Node.js to run in production mode
ENV NODE_ENV=production

# Command to run the application
CMD ["node", "--experimental-json-modules", "--loader", "ts-node/esm", "src/server/server.ts"] 