# MorSaaS Deployment to Google Cloud Run

This directory contains scripts for deploying MorSaaS to Google Cloud Run. The scripts handle the build process, Docker image creation, and deployment to Google Cloud Run.

## Overview of Deployment Process

The deployment process involves several steps:

1. **Building the application**: The build process uses a custom script (`build-for-deploy.js`) that bypasses TypeScript type checking to avoid build failures due to type errors.
2. **Creating a Docker image**: The application is packaged into a Docker image.
3. **Pushing the Docker image**: The Docker image is pushed to Google Container Registry (GCR).
4. **Deploying to Cloud Run**: The Docker image is deployed to Google Cloud Run.

## Available Deployment Scripts

### 1. `deploy-to-cloud-run-dev.sh`

This is the main development deployment script with comprehensive environment configuration and detailed steps.

Features:
- Loads environment variables from .env file
- Fetches GitHub environment variables
- Configures model configuration and endpoints
- Sets up secrets in Google Cloud Secret Manager
- Builds and deploys Docker image with proper model configuration
- Configures IAM policies for public access
- Performs health checks

Usage:
```bash
./deploy-to-cloud-run-dev.sh
```

### 2. `simple-deploy-to-cloud-run.sh`

This is a simplified deployment script that focuses on the core deployment process without the detailed environment configuration.

Features:
- Minimal configuration required
- Uses the TypeScript error bypass build script
- Streamlined deployment process

Usage:
```bash
./simple-deploy-to-cloud-run.sh
```

You can also specify a custom service name and region:
```bash
SERVICE_NAME=my-custom-service REGION=us-east1 ./simple-deploy-to-cloud-run.sh
```

### 3. `build-for-deploy.js`

This script is used by the deployment scripts to build the application while bypassing TypeScript type checking.

Features:
- Runs Vite build directly with TypeScript error bypass
- Verifies build output
- Falls back to an alternative build method if needed

## Troubleshooting

### TypeScript Build Errors

The deployment scripts use `build-for-deploy.js` to bypass TypeScript errors during deployment. This allows the application to be deployed despite TypeScript errors in the codebase.

If you see TypeScript errors when running the normal build command (`npm run build`), but want to deploy anyway, use one of the deployment scripts which will use the TypeScript error bypass.

### Docker Build Issues

If you encounter issues with the Docker build process, check:
1. The Docker daemon is running
2. You have sufficient disk space
3. You're authenticated with Google Cloud (`gcloud auth login`)

### Deployment Failures

If deployment to Cloud Run fails, check:
1. Service account permissions
2. API enablement status
3. Quota limitations
4. Region availability

## Environment Variables

The deployment scripts use various environment variables to configure the deployment. These variables can be set in a `.env` file, as environment variables, or specified when running the script.

Key environment variables:
- `PROJECT_ID`: Google Cloud project ID
- `REGION`: Google Cloud region for deployment (default: us-west1)
- `SERVICE_NAME`: Name of the Cloud Run service (default: morsaas-dev)
- `REACT_APP_AVAILABLE_MODELS`: List of available models
- `SECONDARY_ENDPOINT_URL`: URL for the secondary endpoint
- `SECONDARY_ENDPOINT_MODEL`: Model to use for the secondary endpoint
- `USE_FALLBACK_AS_PRIMARY`: Whether to use the fallback as the primary endpoint
- `CONSUMER_API_URL`: URL for the consumer API

## Prerequisites

Before running the deployment scripts, ensure you have:

1. Google Cloud SDK installed and configured
2. Docker installed and running
3. Node.js installed
4. Authenticated with Google Cloud (`gcloud auth login`)
5. Proper permissions in your Google Cloud project

## Recommended Deployment Flow

For first-time deployment:
1. Ensure prerequisites are met
2. Run `./deploy-to-cloud-run-dev.sh` for a comprehensive deployment

For subsequent deployments:
1. Run `./simple-deploy-to-cloud-run.sh` for a streamlined deployment

## After Deployment

After successful deployment, the script will output the URL of your deployed service. You can access your application at this URL. 