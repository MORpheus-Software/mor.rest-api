# MorSaaS Application

A SaaS application with API key management, authentication, and chat completions functionality.

## Features

- API Key Management (create, list, delete)
- Chat completions API endpoint
- Redis-backed data persistence with Upstash Redis support
- React frontend with modern UI components

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Redis (optional, for local development if not using Upstash)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on the provided example:

```
# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend API base URL 
VITE_API_BASE_URL=http://127.0.0.1:4000

# Redis Configuration - Use Upstash Redis URL for both dev and production
REDIS_URL=redis://global:your-password@your-hostname.upstash.io:port
```

### Configuring Upstash Redis

For consistent development and production environments, we recommend using Upstash Redis in development. 

Run the configuration script:

```bash
# From the project root
chmod +x scripts/configure-upstash.sh
./scripts/configure-upstash.sh
```

This script will:
- Read the production Upstash URL from the deployment script
- Update your .env file and docker-compose.yml with the correct Upstash Redis URL
- Ensure your local development environment uses the same Redis instance as production

### Running the Application

#### Development Mode

To run the frontend in development mode:

```bash
npm run dev
```

To run the server in development mode:

```bash
npm run server:dev
```

#### Production Mode

To build for production:

```bash
npm run build
```

To run the server in production mode:

```bash
npm run server
```

## API Endpoints

### Authentication

All API endpoints require authentication via API keys. Include the API key in the Authorization header:

```
Authorization: Bearer your-api-key
```

### API Key Management

- `GET /api/v1/keys`: List all API keys
- `POST /api/v1/keys`: Create a new API key with `{ "name": "Key Name" }`
- `DELETE /api/v1/keys/:id`: Delete an API key

### Chat Completions

- `POST /api/v1/chat/completions`: Send chat completion requests

## Redis Configuration

The application will automatically use Redis if available, or fall back to localStorage.

To install and run Redis:

### macOS

```bash
brew install redis
redis-server
```

### Linux

```bash
sudo apt install redis-server
sudo systemctl start redis
```

### Docker

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

## Local Redis Setup with Docker

For local development, you can run Redis in a Docker container:

1. Make sure you have Docker and Docker Compose installed

2. Start Redis using Docker Compose:
   ```bash
   docker-compose up -d redis
   ```

3. Add a test API key for local development:
   ```bash
   node scripts/add-test-key.js
   ```

4. Run the application with Redis environment variables set:
   ```bash
   REDIS_URL=redis://localhost:6379 npm run dev
   ```

Alternatively, you can use the start-dev.sh script to do all of this in one step:
```bash
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

This will:
- Start the Redis container using Docker Compose
- Set the correct environment variables
- Start the application in development mode
