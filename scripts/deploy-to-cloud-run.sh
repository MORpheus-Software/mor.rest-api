#!/bin/bash
set -e

# MorSaaS Deployment Script for Google Cloud Run
# This script automates the deployment of the application to Google Cloud Run

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration Variables
PROJECT_NAME="morsaas"
IMAGE_NAME="morsaas-app"
REGION="us-west1"  # Change this to your preferred region
SERVICE_NAME="morsaas"
MEMORY="2Gi"
CPU="1"
CONCURRENCY="80"
MIN_INSTANCES="1"  # Changed from 0 to 1 to ensure an instance is always ready
MAX_INSTANCES="10"
TIMEOUT="600s"
UPSTASH_PRODUCTION_URL=redis://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379

# React Environment Variables - Get from environment variables or use defaults
# This allows GitHub Actions to pass model configuration to the deployment script
REACT_APP_DEFAULT_MODEL_NAME="${REACT_APP_DEFAULT_MODEL_NAME:-Hermes-3-Llama-3.1-8B}"
REACT_APP_DEFAULT_MODEL_ID="${REACT_APP_DEFAULT_MODEL_ID:-llama-3.1-8b-instant}"

# Print the model configuration
echo "Using model configuration:"
echo "- Model Name: $REACT_APP_DEFAULT_MODEL_NAME"
echo "- Model ID: $REACT_APP_DEFAULT_MODEL_ID"

# NOTE: Cloud Run has a maximum startup probe timeout of 240 seconds (4 minutes).
# If your container takes longer than that to start, you'll need to:
# 1. Optimize your container to start faster
# 2. Create a YAML configuration with startup probe settings
# 3. Deploy using `gcloud run services replace config.yaml`
# See: https://cloud.google.com/run/docs/configuring/healthchecks

# Function to display a section header
section() {
  echo ""
  echo -e "${BLUE}=== $1 ===${NC}"
  echo ""
}

# Function to check if a command exists
command_exists() {
  command -v "$1" &> /dev/null
}

# Check for required tools
check_requirements() {
  section "Checking Requirements"
  
  local missing_requirements=0
  
  if ! command_exists gcloud; then
    echo -e "${RED}Error: Google Cloud SDK (gcloud) is not installed.${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    missing_requirements=1
  else
    echo -e "${GREEN}✓ Google Cloud SDK is installed${NC}"
  fi
  
  if ! command_exists docker; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please install it from: https://docs.docker.com/get-docker/"
    missing_requirements=1
  else
    echo -e "${GREEN}✓ Docker is installed${NC}"
  fi
  
  if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    echo "Please install Node.js and npm from: https://nodejs.org/"
    missing_requirements=1
  else
    echo -e "${GREEN}✓ npm is installed${NC}"
  fi
  
  if [ $missing_requirements -ne 0 ]; then
    echo -e "${RED}Please install the missing requirements and try again.${NC}"
    exit 1
  fi
}

# Initialize Google Cloud project
initialize_gcloud() {
  section "Initializing Google Cloud"
  
  echo -e "${YELLOW}Authenticating with Google Cloud...${NC}"
  gcloud auth login
  
  echo -ne "${YELLOW}Enter your Google Cloud Project ID: ${NC}"
  read -r project_id
  
  if [ -z "$project_id" ]; then
    echo -e "${RED}Error: Project ID cannot be empty.${NC}"
    exit 1
  fi
  
  echo -e "${YELLOW}Setting Google Cloud project to: $project_id${NC}"
  gcloud config set project "$project_id"
  
  # Enable required APIs
  echo -e "${YELLOW}Enabling required Google Cloud APIs...${NC}"
  gcloud services enable cloudbuild.googleapis.com
  gcloud services enable run.googleapis.com
  gcloud services enable artifactregistry.googleapis.com
  
  # Configure Docker to use Google Cloud credential helper
  echo -e "${YELLOW}Configuring Docker authentication...${NC}"
  gcloud auth configure-docker
}

# Build and tag the Docker image
build_image() {
  section "Building Docker Image"
  
  # Get the project ID from gcloud config
  local project_id=$(gcloud config get-value project)
  
  echo -e "${YELLOW}Building Docker image with model configuration...${NC}"
  docker build \
    --build-arg REACT_APP_DEFAULT_MODEL_NAME="$REACT_APP_DEFAULT_MODEL_NAME" \
    --build-arg REACT_APP_DEFAULT_MODEL_ID="$REACT_APP_DEFAULT_MODEL_ID" \
    -t "gcr.io/${project_id}/${IMAGE_NAME}:latest" .
  
  echo -e "${GREEN}✓ Docker image built successfully with model: $REACT_APP_DEFAULT_MODEL_NAME${NC}"
}

# Push the Docker image to Google Container Registry
push_image() {
  section "Pushing to Google Container Registry"
  
  # Get the project ID from gcloud config
  local project_id=$(gcloud config get-value project)
  
  echo -e "${YELLOW}Pushing Docker image to GCR...${NC}"
  docker push "gcr.io/${project_id}/${IMAGE_NAME}:latest"
  
  echo -e "${GREEN}✓ Docker image pushed successfully${NC}"
}

# Configure the Upstash Redis URL
configure_upstash() {
  section "Configuring Upstash Redis Connection"
  
  echo -e "${YELLOW}MorSaaS uses Upstash Redis for persistence.${NC}"
  echo -e "${YELLOW}Please choose an option:${NC}"
  echo -e "1. Use production Upstash Redis endpoint"
  echo -e "2. Use a custom Upstash Redis endpoint"
  echo -ne "${YELLOW}Enter your choice (1-2): ${NC}"
  read -r upstash_choice
  
  local upstash_url=""
  
  case $upstash_choice in
    1)
      echo -e "${YELLOW}Using production Upstash Redis endpoint${NC}"
      upstash_url="${UPSTASH_PRODUCTION_URL}"
      ;;
    2)
      echo -ne "${YELLOW}Enter your custom Upstash Redis URL: ${NC}"
      read -r custom_url
      if [ -z "$custom_url" ]; then
        echo -e "${RED}Error: Upstash URL cannot be empty. Using production URL as fallback.${NC}"
        upstash_url="${UPSTASH_PRODUCTION_URL}"
      else
        upstash_url="$custom_url"
      fi
      ;;
    *)
      echo -e "${RED}Invalid choice. Using production Upstash Redis endpoint as default.${NC}"
      upstash_url="${UPSTASH_PRODUCTION_URL}"
      ;;
  esac
  
  echo -e "${GREEN}✓ Upstash Redis configured${NC}"
  
  # Return the URL
  echo "$upstash_url"
}

# Deploy to Cloud Run
deploy_to_cloud_run() {
  section "Deploying to Cloud Run"
  
  # Get the project ID from gcloud config
  local project_id=$(gcloud config get-value project)
  
  # Configure Upstash Redis
  local redis_url=$(configure_upstash)
  
  echo -e "${YELLOW}Deploying to Cloud Run using Upstash Redis and model configuration...${NC}"
  echo -e "${YELLOW}Model: $REACT_APP_DEFAULT_MODEL_NAME ($REACT_APP_DEFAULT_MODEL_ID)${NC}"
  
  gcloud run deploy "$SERVICE_NAME" \
    --image="gcr.io/${project_id}/${IMAGE_NAME}:latest" \
    --platform=managed \
    --region="$REGION" \
    --memory="$MEMORY" \
    --cpu="$CPU" \
    --concurrency="$CONCURRENCY" \
    --min-instances="$MIN_INSTANCES" \
    --max-instances="$MAX_INSTANCES" \
    --timeout="$TIMEOUT" \
    --cpu-boost \
    --execution-environment=gen2 \
    --no-cpu-throttling \
    --set-env-vars="REDIS_URL=${redis_url},NODE_ENV=production,REACT_APP_DEFAULT_MODEL_NAME=${REACT_APP_DEFAULT_MODEL_NAME},REACT_APP_DEFAULT_MODEL_ID=${REACT_APP_DEFAULT_MODEL_ID}" \
    --allow-unauthenticated
  
  # Get the deployed service URL
  local service_url=$(gcloud run services describe "$SERVICE_NAME" \
    --platform=managed \
    --region="$REGION" \
    --format='value(status.url)')
  
  # Set IAM policy to allow public access
  echo -e "${YELLOW}Setting IAM policy to allow unauthenticated access...${NC}"
  # Create a temporary policy file
  cat > policy.yaml << EOF
bindings:
- members:
  - allUsers
  role: roles/run.invoker
EOF
  
  # Apply the policy to allow unauthenticated access
  gcloud run services set-iam-policy "$SERVICE_NAME" policy.yaml --region="$REGION" --quiet || \
    echo -e "${YELLOW}Warning: Could not set IAM policy. You may need to set it manually.${NC}"
  
  # Clean up temporary policy file
  rm -f policy.yaml
  
  echo -e "${GREEN}Service deployed successfully at: ${service_url}${NC}"
}

# Deploy to Cloud Run using YAML configuration (for slow-starting containers)
deploy_to_cloud_run_with_yaml() {
  section "Deploying to Cloud Run using YAML (Extended Startup Time)"
  
  # Get the project ID from gcloud config
  local project_id=$(gcloud config get-value project)
  
  # Configure Upstash Redis
  local redis_url=$(configure_upstash)
  
  echo -e "${YELLOW}Creating YAML configuration for extended startup time...${NC}"
  
  # Create a temporary YAML file from the template
  local yaml_file="cloud-run-deploy-config.yaml"
  cp "$(dirname "$0")/cloud-run-config-template.yaml" "$yaml_file"
  
  # Replace placeholder values
  sed -i.bak "s|PROJECT_ID|$project_id|g" "$yaml_file"
  sed -i.bak "s|COMMIT_SHA|latest|g" "$yaml_file"
  sed -i.bak "s|YOUR_REDIS_URL|$redis_url|g" "$yaml_file"
  sed -i.bak "s|REACT_APP_DEFAULT_MODEL_NAME_VALUE|$REACT_APP_DEFAULT_MODEL_NAME|g" "$yaml_file"
  sed -i.bak "s|REACT_APP_DEFAULT_MODEL_ID_VALUE|$REACT_APP_DEFAULT_MODEL_ID|g" "$yaml_file"
  
  echo -e "${YELLOW}Deploying to Cloud Run using YAML configuration...${NC}"
  echo -e "${YELLOW}Model: $REACT_APP_DEFAULT_MODEL_NAME ($REACT_APP_DEFAULT_MODEL_ID)${NC}"
  gcloud run services replace "$yaml_file"
  
  # Clean up temporary files
  rm -f "$yaml_file" "$yaml_file.bak"
  
  # Get the deployed service URL
  local service_url=$(gcloud run services describe "$SERVICE_NAME" \
    --platform=managed \
    --region="$REGION" \
    --format='value(status.url)')
  
  # Set IAM policy to allow public access
  echo -e "${YELLOW}Setting IAM policy to allow unauthenticated access...${NC}"
  # Create a temporary policy file
  cat > policy.yaml << EOF
bindings:
- members:
  - allUsers
  role: roles/run.invoker
EOF
  
  # Apply the policy to allow unauthenticated access
  gcloud run services set-iam-policy "$SERVICE_NAME" policy.yaml --region="$REGION" --quiet || \
    echo -e "${YELLOW}Warning: Could not set IAM policy. You may need to set it manually.${NC}"
  
  # Clean up temporary policy file
  rm -f policy.yaml
  
  echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
  echo -e "${GREEN}Your application is now available at: ${service_url}${NC}"
}

# Add Upstash guidance
setup_upstash_guidance() {
  section "Upstash Redis Information"
  
  echo -e "${YELLOW}MorSaaS is configured to use Upstash Redis for data persistence.${NC}"
  echo -e "${YELLOW}Important things to know about Upstash:${NC}"
  echo -e "1. ${BLUE}Upstash provides serverless Redis with a generous free tier${NC}"
  echo -e "   - Global replications for low latency across regions"
  echo -e "   - Pay-per-use pricing model"
  echo -e ""
  echo -e "2. ${BLUE}Monitoring Upstash Redis${NC}"
  echo -e "   - Monitor your database through the Upstash console: https://console.upstash.com/"
  echo -e "   - Check usage metrics and connection logs"
  echo -e ""
  echo -e "${YELLOW}To update the Upstash Redis URL for your Cloud Run service:${NC}"
  echo -e "gcloud run services update $SERVICE_NAME \\"
  echo -e "  --region=$REGION \\"
  echo -e "  --set-env-vars=REDIS_URL=your-upstash-redis-url"
  echo -e ""
  echo -e "${YELLOW}To update the model configuration for your Cloud Run service:${NC}"
  echo -e "gcloud run services update $SERVICE_NAME \\"
  echo -e "  --region=$REGION \\"
  echo -e "  --set-env-vars=REACT_APP_DEFAULT_MODEL_NAME=your-model-name,REACT_APP_DEFAULT_MODEL_ID=your-model-id"
}

# Main execution
main() {
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${GREEN}   MorSaaS Deployment to Google Cloud Run   ${NC}"
  echo -e "${GREEN}==================================================${NC}"
  
  check_requirements
  initialize_gcloud
  build_image
  push_image
  
  # Ask which deployment method to use
  echo -e "${YELLOW}Choose deployment method:${NC}"
  echo -e "1. Standard deployment (for containers that start within 60 seconds)"
  echo -e "2. Extended startup time deployment (for containers that take longer to start)"
  echo -ne "${YELLOW}Enter your choice (1-2): ${NC}"
  read -r deploy_choice
  
  case $deploy_choice in
    1)
      deploy_to_cloud_run
      ;;
    2)
      deploy_to_cloud_run_with_yaml
      ;;
    *)
      echo -e "${RED}Invalid choice. Using standard deployment.${NC}"
      deploy_to_cloud_run
      ;;
  esac
  
  setup_upstash_guidance
  
  section "Next Steps"
  echo -e "${YELLOW}1. Set up a custom domain for your Cloud Run service if needed${NC}"
  echo -e "${YELLOW}2. Verify your Upstash Redis connection is working properly${NC}"
  echo -e "${YELLOW}3. Set up CI/CD pipelines for automated deployments${NC}"
  
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${GREEN}   Deployment process completed successfully!   ${NC}"
  echo -e "${GREEN}==================================================${NC}"
}

# Run the script
main 