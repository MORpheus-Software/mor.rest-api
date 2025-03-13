# MorSaaS Application

A SaaS application with API key management, authentication, and chat completions functionality.

## Features

- API Key Management (create, list, delete)
- Chat completions API endpoint
- Redis-backed data persistence with localStorage fallback
- React frontend with modern UI components

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Redis (optional, for data persistence)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on the provided example:

```
# Server Configuration
PORT=3001
NODE_ENV=development

# Redis Configuration
REDIS_URL=redis://localhost:6379

# API Configuration
API_BASE_URL=https://token-auth-saas-1081887913409.us-west1.run.app

# JWT Secret for user authentication
JWT_SECRET=your-jwt-secret-change-this-in-production

# Proxy configuration
BASEIMAGE_PROXY_URL=https://token-auth-saas-1081887913409.us-west1.run.app
```

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
