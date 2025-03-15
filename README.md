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

## Local Development with Redis

For local development, the application can use a Redis Docker container. Here's how to set it up:

1. Make sure your `.env` file is configured to use the local Redis:
   ```
   # For local development with Docker
   REDIS_URL=redis://localhost:6379
   ```

2. Start the Redis container using Docker Compose:
   ```bash
   docker-compose up -d redis
   ```

3. Run the application in development mode:
   ```bash
   npm run dev
   ```

The development environment includes special handling for Redis connections to ensure compatibility with the Docker setup. These settings only apply in development mode and won't affect production deployments.

If you want to check your Redis data, you can use Redis Commander UI by running:
```bash
npm run redis-ui
```
Then visit http://localhost:8081 in your browser to access the Redis UI.
