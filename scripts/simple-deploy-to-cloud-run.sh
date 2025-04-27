#!/bin/bash
set -e

# Simple MorSaaS Deployment Script for Google Cloud Run
# This is a simplified version that skips TypeScript checking

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration Variables
REGION="${REGION:-us-west1}"
SERVICE_NAME="${SERVICE_NAME:-morsaas-dev}"
ENVIRONMENT="dev"

# Get project ID from gcloud if possible, otherwise use environment variable
PROJECT_ID="${PROJECT_ID:-${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "")}}"

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

# Check if user is authenticated with Google Cloud
is_authenticated() {
  if gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
    return 0  # Authenticated
  else
    return 1  # Not authenticated
  fi
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
  
  if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js from: https://nodejs.org/"
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
  
  # Only prompt for login if not already authenticated
  if ! is_authenticated; then
    echo -e "${YELLOW}Not authenticated with Google Cloud. Logging in...${NC}"
    gcloud auth login
  else
    echo -e "${GREEN}✓ Already authenticated with Google Cloud${NC}"
  fi
  
  # Check if we have a project ID, if not, prompt for it
  if [ -z "$PROJECT_ID" ]; then
    echo -ne "${YELLOW}Enter your Google Cloud Project ID: ${NC}"
    read -r PROJECT_ID
    
    if [ -z "$PROJECT_ID" ]; then
      echo -e "${RED}Error: Project ID cannot be empty.${NC}"
      exit 1
    fi
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

# Build and tag the Docker image
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
    --timeout=600s
  
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