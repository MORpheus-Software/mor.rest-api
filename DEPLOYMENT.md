# Deploying MorSaaS to Google Cloud Run

This document provides instructions for deploying the MorSaaS application to Google Cloud Run, a fully managed serverless platform that automatically scales your stateless containers.

## Prerequisites

Before deploying, ensure you have the following installed:

1. **Google Cloud SDK**: [Installation Guide](https://cloud.google.com/sdk/docs/install)
2. **Docker**: [Installation Guide](https://docs.docker.com/get-docker/)
3. **Node.js and npm**: [Installation Guide](https://nodejs.org/)
4. **Git**: [Installation Guide](https://git-scm.com/downloads)

You'll also need:

- A Google Cloud account with billing enabled
- A project created in Google Cloud Console
- Access to the Upstash Redis credentials used in production (or a new Upstash account)

## Deployment Options

### Option 1: Using the Deployment Script (Recommended)

We've provided an automated script that handles the entire deployment process:

1. Make the script executable:
   ```bash
   chmod +x scripts/deploy-to-cloud-run.sh
   ```

2. Run the script:
   ```bash
   ./scripts/deploy-to-cloud-run.sh
   ```

3. Follow the prompts in the script. You'll need to:
   - Log in to Google Cloud if not already logged in
   - Provide your Google Cloud Project ID
   - Choose between using the production Upstash Redis endpoint or a custom one

The script will:
- Check for required tools
- Initialize Google Cloud settings
- Build a Docker image of your application
- Push the image to Google Container Registry
- Deploy the application to Cloud Run with the correct Upstash configuration
- Provide guidance on Upstash Redis monitoring

### Option 2: Manual Deployment

If you prefer to deploy manually or customize the deployment process:

#### 1. Build the Docker Image

```bash
# Build the Docker image
docker build -t gcr.io/[PROJECT-ID]/morsaas-app:latest .
```

#### 2. Push the Image to Google Container Registry

```bash
# Configure Docker to use gcloud for authentication
gcloud auth configure-docker

# Push the image
docker push gcr.io/[PROJECT-ID]/morsaas-app:latest
```

#### 3. Deploy to Cloud Run

```bash
gcloud run deploy morsaas \
  --image=gcr.io/[PROJECT-ID]/morsaas-app:latest \
  --platform=managed \
  --region=us-west1 \
  --memory=1Gi \
  --cpu=1 \
  --concurrency=80 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=300s \
  --set-env-vars="REDIS_URL=your-upstash-redis-url,NODE_ENV=production" \
  --allow-unauthenticated
```

## About Upstash Redis

MorSaaS uses Upstash Redis for data persistence. Upstash provides serverless Redis with the following benefits:

1. **Serverless Redis**: Pay only for what you use with no minimum fees
2. **Global Replication**: Low latency access from anywhere
3. **REST API**: Access your Redis database via HTTP requests
4. **Free Tier**: Generous free tier for development and small applications

### Monitoring Your Upstash Redis

1. Access the Upstash console at [https://console.upstash.com](https://console.upstash.com)
2. Select your database
3. View metrics, logs, and connection details
4. Set up alerts for usage thresholds

### Updating Your Upstash Configuration

If you need to update the Upstash Redis URL after deployment:

```bash
gcloud run services update morsaas \
  --region=us-west1 \
  --set-env-vars=REDIS_URL=your-new-upstash-redis-url
```

## Customizing Deployment

You can customize the deployment by modifying the `scripts/deploy-to-cloud-run.sh` script or by using additional flags with the `gcloud run deploy` command.

### Common Customizations

- **Region**: Change the `--region` flag to deploy in a different region
- **Memory/CPU**: Adjust the `--memory` and `--cpu` flags based on your needs
- **Scaling**: Modify `--min-instances` and `--max-instances` for scaling behavior
- **Environment Variables**: Add custom environment variables via `--set-env-vars`

## Continuous Deployment

For continuous deployment, consider:

1. **GitHub Actions**: Set up a workflow to automatically deploy on pushes to main
2. **Cloud Build**: Configure a trigger to build and deploy on code changes
3. **GitLab CI/CD**: Use GitLab's CI/CD pipelines to automate deployment

### Required Secrets for GitHub Actions

If using the provided GitHub Actions workflow, you'll need to set the following repository secrets:

- `GCP_PROJECT_ID`: Your Google Cloud Project ID
- `GCP_SA_KEY`: The JSON key of your Google Cloud service account
- `REDIS_URL`: Your Upstash Redis URL (the same one used in production)
- `SLACK_WEBHOOK` (optional): For deployment notifications

## Monitoring and Logging

After deployment:

- View logs in the Google Cloud Console under Cloud Run > Services > morsaas > Logs
- Set up Cloud Monitoring alerts for CPU usage, memory, and error rates
- Configure uptime checks to monitor service availability
- Monitor Redis usage in the Upstash console

## Troubleshooting

If you encounter issues:

1. **Container fails to start**:
   - Check Cloud Run logs for startup errors
   - Verify that environment variables are set correctly
   - Ensure the Upstash Redis connection string is valid

2. **Performance issues**:
   - Consider increasing memory/CPU allocation
   - Check for memory leaks in the application
   - Optimize database queries and Redis usage

3. **Upstash connection issues**:
   - Verify your Upstash Redis URL format
   - Check that your IP is not being blocked by Upstash
   - Ensure your Upstash database is active and not paused

## Support

For additional help:

- Google Cloud Run documentation: https://cloud.google.com/run/docs
- Upstash Redis documentation: https://docs.upstash.com/redis
- Open an issue in the project repository
- Consult the Google Cloud community: https://cloud.google.com/community 