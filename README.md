# MorSaaS Application

A SaaS application with API key management, authentication, and chat completions functionality.

## Features

- API Key Management (create, list, delete)
- Chat completions API endpoint
- Redis-backed data persistence with Upstash Redis support
- React frontend with modern UI components
- Fallback to secondary OpenAI-compatible endpoint if primary endpoint fails
- Session reuse to prevent creating new sessions unnecessarily

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

# Secondary Endpoint (Fallback) Configuration
SECONDARY_ENDPOINT_URL=https://api.openai.com/v1/chat/completions
SECONDARY_ENDPOINT_TOKEN=your_openai_api_key_here

# Consumer API Configuration
CONSUMER_API_URL=https://consumer-node-url.run.app
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

## Deploying with Fallback Functionality

The application supports fallback to a secondary model API when the primary model is unavailable. To deploy with this functionality, follow these steps:

### 1. Set up Required Secrets in Google Cloud Secret Manager

First, set up the OpenAI API key and secondary endpoint token in Google Cloud Secret Manager:

```bash
# Set up OpenAI API key
./scripts/setup-openai-key.sh YOUR_OPENAI_API_KEY

# Set up secondary endpoint token (if different from OpenAI key)
./scripts/setup-secondary-token.sh YOUR_SECONDARY_ENDPOINT_TOKEN
```

### 2. Update GitHub Repository Variables

Set the GitHub repository variables for your production, staging, and development environments:

```bash
# Run the script to set GitHub repository variables
./scripts/set-github-vars.sh
```

This script sets the following variables in your GitHub repository:
- `MODEL_NAME`: The name of the primary model
- `MODEL_ID`: The ID of the primary model
- `SECONDARY_URL`: The URL for the secondary endpoint
- `CONSUMER_URL`: The URL for the consumer API

### 3. Update Cloud Run Configuration Files

Before deploying, update your Cloud Run configuration files with the correct environment variables:

```bash
# Run from the root directory of the project
./scripts/update-cloud-run-configs.sh
```

This script updates both the production (`morsaas-service.yaml`) and development (`morsaas-dev-config.yaml`) configuration files with the correct environment variables and secret references.

### 4. Deploy to Cloud Run

Deploy the service using GitHub Actions or manually with gcloud:

```bash
# Using gcloud (manually)
gcloud run services replace morsaas-service.yaml --region=us-west1
gcloud run services replace morsaas-dev-config.yaml --region=us-west1
```

Or push changes to your repository to trigger the GitHub Actions workflow.

### Environment Variables for Fallback Functionality

The following environment variables are required for fallback functionality:

| Variable | Description | Example |
|----------|-------------|---------|
| `SECONDARY_ENDPOINT_URL` | URL for the secondary model API | `https://api.openai.com/v1/chat/completions` |
| `SECONDARY_ENDPOINT_TOKEN` | Authentication token for the secondary API | (Stored in Secret Manager) |
| `CONSUMER_API_URL` | URL for the consumer API | `https://consumer-node-1081887913409.us-west1.run.app` |
| `USE_FALLBACK_AS_PRIMARY` | When set to "true", the service will use the fallback endpoint as the primary chat endpoint | `false` (default) |

When deploying, ensure these variables are properly set in your Cloud Run configuration files.

#### Fallback Behavior

By default (`USE_FALLBACK_AS_PRIMARY=false`), the service will:
1. First attempt to use the primary endpoint (NFA Proxy URL)
2. If the primary endpoint fails, it will fall back to the secondary endpoint

When `USE_FALLBACK_AS_PRIMARY` is set to `true`, the service will:
1. Use the secondary endpoint as the primary endpoint
2. The original primary endpoint will not be used at all

Each chat request will be logged with information about which endpoint was used and which model processed the request.
