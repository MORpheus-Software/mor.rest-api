#!/bin/bash
set -e

# Simple MorSaaS Deployment Script for Google Cloud Run

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration Variables
PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-west1}"
SERVICE_NAME="${SERVICE_NAME:-morsaas-dev}"
ENVIRONMENT="dev"

# Set other required environment variables with defaults
REACT_APP_AVAILABLE_MODELS="mistralai/mistral-small-3.1-24b-instruct|Mistral Small 3.1 24B,deepseek/deepseek-r1-zero|Deepseek R1 Zero,meta-llama/llama-3.3-70b-instruct|Llama 3.3 70B"
SECONDARY_ENDPOINT_URL="https://openrouter.ai/api/v1/chat/completions"
CONSUMER_API_URL="https://consumer-node-1081887913409.us-west1.run.app"
USE_FALLBACK_AS_PRIMARY="true"
SECONDARY_ENDPOINT_MODEL="openrouter/auto"
ETHEREUM_CHAIN_ID="421614"
ETHEREUM_RPC_URL="https://arb-sepolia.g.alchemy.com/v2/demo"
REDIS_URL="redis://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379"

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
    missing_requirements=1
  else
    echo -e "${GREEN}✓ Google Cloud SDK is installed${NC}"
  fi
  
  if ! command_exists docker; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    missing_requirements=1
  else
    echo -e "${GREEN}✓ Docker is installed${NC}"
  fi
  
  if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    missing_requirements=1
  else
    echo -e "${GREEN}✓ Node.js is installed${NC}"
  fi
  
  if [ $missing_requirements -ne 0 ]; then
    echo -e "${RED}Please install the missing requirements and try again.${NC}"
    exit 1
  fi
}

# Initialize Google Cloud project
initialize_gcloud() {
  section "Initializing Google Cloud"
  
  # Check if authenticated with Google Cloud
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
    echo -e "${YELLOW}Not authenticated with Google Cloud. Logging in...${NC}"
    gcloud auth login
  else
    echo -e "${GREEN}✓ Already authenticated with Google Cloud${NC}"
  fi
  
  echo -e "${YELLOW}Setting Google Cloud project to: $PROJECT_ID${NC}"
  gcloud config set project "$PROJECT_ID"
  
  # Enable required APIs
  echo -e "${YELLOW}Enabling required Google Cloud APIs...${NC}"
  gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
  
  # Configure Docker to use Google Cloud credential helper
  echo -e "${YELLOW}Configuring Docker authentication...${NC}"
  gcloud auth configure-docker --quiet
}

# Build and deploy the application
build_and_deploy() {
  section "Building and Deploying"

  # Clean build cache
  echo "Cleaning build cache..."
  rm -rf dist node_modules/.vite
  
  # Run custom build script that bypasses TypeScript errors
  echo "Running custom build script to bypass TypeScript errors..."
  node scripts/build-for-deploy.js
  
  # Generate unique build ID
  BUILD_ID="$(date +%s)-$(git rev-parse --short HEAD 2>/dev/null || echo 'local')"
  echo "Using BUILD_ID: $BUILD_ID for cache control"
  
  echo -e "${YELLOW}Building Docker image...${NC}"
  docker build \
    --build-arg BUILD_ID="$BUILD_ID" \
    --build-arg REACT_APP_AVAILABLE_MODELS="$REACT_APP_AVAILABLE_MODELS" \
    --build-arg VITE_API_BASE_URL="https://nfa-proxy-1081887913409.us-west1.run.app" \
    --build-arg SECONDARY_ENDPOINT_URL="$SECONDARY_ENDPOINT_URL" \
    --build-arg SECONDARY_ENDPOINT_MODEL="$SECONDARY_ENDPOINT_MODEL" \
    --build-arg USE_FALLBACK_AS_PRIMARY="$USE_FALLBACK_AS_PRIMARY" \
    --build-arg CONSUMER_API_URL="$CONSUMER_API_URL" \
    -t "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" .
  
  echo -e "${GREEN}✓ Docker image built successfully${NC}"
  
  echo -e "${YELLOW}Pushing Docker image to GCR...${NC}"
  docker push "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"
  
  echo -e "${GREEN}✓ Docker image pushed successfully${NC}"
  
  echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
  gcloud run deploy "$SERVICE_NAME" \
    --image="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --cpu=1 \
    --memory=2Gi \
    --concurrency=80 \
    --min-instances=1 \
    --max-instances=10 \
    --timeout=600s \
    --set-env-vars="REDIS_URL=$REDIS_URL,USE_FALLBACK_AS_PRIMARY=$USE_FALLBACK_AS_PRIMARY,ETHEREUM_CHAIN_ID=$ETHEREUM_CHAIN_ID,ETHEREUM_RPC_URL=$ETHEREUM_RPC_URL"
  
  # Get the deployed service URL
  SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)')
  echo -e "${GREEN}✓ Deployment successful!${NC}"
  echo -e "${GREEN}Service URL: $SERVICE_URL${NC}"
}

# Main execution
main() {
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${GREEN}   Simple MorSaaS Deployment to Google Cloud Run   ${NC}"
  echo -e "${GREEN}==================================================${NC}"
  
  check_requirements
  initialize_gcloud
  build_and_deploy
  
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${GREEN}   Deployment process completed successfully!   ${NC}"
  echo -e "${GREEN}==================================================${NC}"
}

# Run the script
main 