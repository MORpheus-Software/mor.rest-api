#!/bin/bash
set -e

# MorSaaS Development Deployment Script for Google Cloud Run
# This is a modified version of deploy-to-cloud-run-noninteractive.sh
# specifically for development deployments with appropriate Redis URL and secret handling

# Load environment variables from .env at the project root if present
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from $ENV_FILE"
  set -o allexport
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +o allexport
fi

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration Variables
PROJECT_NAME="morsaas"
IMAGE_NAME="morsaas-app"
REGION="${REGION:-us-west1}"  # Use env var or default to us-west1
MEMORY="2Gi"
CPU="1"
CONCURRENCY="80"
MIN_INSTANCES="1"  # Changed from 0 to 1 to ensure an instance is always ready
MAX_INSTANCES="10"
TIMEOUT="600s"

# Fixed to dev environment
ENVIRONMENT="dev"
SERVICE_NAME="${SERVICE_NAME:-morsaas-dev}"
IS_PROD="false"

# Default Development model config & endpoints 
REACT_APP_AVAILABLE_MODELS="${DEV_AVAILABLE_MODELS:-mistralai/mistral-small-3.1-24b-instruct|Mistral Small 3.1 24B,deepseek/deepseek-r1-zero|Deepseek R1 Zero,meta-llama/llama-3.3-70b-instruct|Llama 3.3 70B}"
SECONDARY_ENDPOINT_URL="${DEV_SECONDARY_ENDPOINT_URL:-https://openrouter.ai/api/v1/chat/completions}"
CONSUMER_API_URL="${DEV_CONSUMER_API_URL:-https://consumer-node-1081887913409.us-west1.run.app}"
USE_FALLBACK_AS_PRIMARY="${DEV_USE_FALLBACK_AS_PRIMARY:-false}"
OPENROUTER_HTTP_REFERER="${DEV_OPENROUTER_HTTP_REFERER:-https://dev.morsaas.com}"
OPENROUTER_APP_TITLE="${DEV_OPENROUTER_APP_TITLE:-MorSaaS-Dev}"
OPENROUTER_APP_VERSION="${DEV_OPENROUTER_APP_VERSION:-1.0.0-dev}"
ETHEREUM_CHAIN_ID="${DEV_ETHEREUM_CHAIN_ID:-5}"
ETHEREUM_RPC_URL="${DEV_ETHEREUM_RPC_URL:-https://eth-goerli.g.alchemy.com/v2/demo}"

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

# Function to fetch GitHub environment variables (specifically for dev environment)
fetch_github_env_vars() {
  section "Fetching GitHub Environment Variables"
  
  # Check if GitHub CLI is installed
  if ! command_exists gh; then
    echo -e "${YELLOW}GitHub CLI (gh) not installed. Using environment variables or defaults.${NC}"
    return 0
  fi
  
  # Check if authenticated with GitHub
  if ! gh auth status &>/dev/null; then
    echo -e "${YELLOW}Not authenticated with GitHub. Using environment variables or defaults.${NC}"
    return 0
  fi
  
  # Determine which repository to use
  if [ -z "$GITHUB_REPO" ]; then
    # Try to get the repository from git remote
    GITHUB_REPO=$(git remote -v | grep -m 1 origin | awk '{print $2}' | sed 's/.*github.com[:\/]\(.*\)\.git.*/\1/' 2>/dev/null)
    if [ -z "$GITHUB_REPO" ]; then
      echo -e "${YELLOW}Could not determine GitHub repository. Using environment variables or defaults.${NC}"
      return 0
    fi
  fi
  
  echo -e "${GREEN}Fetching variables for dev environment from GitHub repository: $GITHUB_REPO${NC}"
  
  # Set environment prefix for dev
  ENV_PREFIX="DEV_"
  
  # Fetch variables from GitHub
  echo -e "${YELLOW}Fetching environment variables from GitHub...${NC}"
  
  # Fetch available models
  FETCHED_AVAILABLE_MODELS=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}AVAILABLE_MODELS" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_AVAILABLE_MODELS" ]; then
    REACT_APP_AVAILABLE_MODELS="$FETCHED_AVAILABLE_MODELS"
    echo -e "${GREEN}✓ Fetched available models from GitHub${NC}"
  fi
  
  # Fetch secondary endpoint URL
  FETCHED_SECONDARY_ENDPOINT_URL=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}SECONDARY_ENDPOINT_URL" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_SECONDARY_ENDPOINT_URL" ]; then
    SECONDARY_ENDPOINT_URL="$FETCHED_SECONDARY_ENDPOINT_URL"
    echo -e "${GREEN}✓ Fetched secondary endpoint URL from GitHub${NC}"
  fi
  
  # Fetch consumer API URL
  FETCHED_CONSUMER_API_URL=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}CONSUMER_API_URL" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_CONSUMER_API_URL" ]; then
    CONSUMER_API_URL="$FETCHED_CONSUMER_API_URL"
    echo -e "${GREEN}✓ Fetched consumer API URL from GitHub${NC}"
  fi
  
  # Fetch use fallback as primary
  FETCHED_USE_FALLBACK_AS_PRIMARY=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}USE_FALLBACK_AS_PRIMARY" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_USE_FALLBACK_AS_PRIMARY" ]; then
    USE_FALLBACK_AS_PRIMARY="$FETCHED_USE_FALLBACK_AS_PRIMARY"
    echo -e "${GREEN}✓ Fetched use fallback as primary from GitHub${NC}"
  fi
  
  # Fetch OpenRouter HTTP referer
  FETCHED_OPENROUTER_HTTP_REFERER=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}OPENROUTER_HTTP_REFERER" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_OPENROUTER_HTTP_REFERER" ]; then
    OPENROUTER_HTTP_REFERER="$FETCHED_OPENROUTER_HTTP_REFERER"
    echo -e "${GREEN}✓ Fetched OpenRouter HTTP referer from GitHub${NC}"
  fi
  
  # Fetch OpenRouter app title
  FETCHED_OPENROUTER_APP_TITLE=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}OPENROUTER_APP_TITLE" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_OPENROUTER_APP_TITLE" ]; then
    OPENROUTER_APP_TITLE="$FETCHED_OPENROUTER_APP_TITLE"
    echo -e "${GREEN}✓ Fetched OpenRouter app title from GitHub${NC}"
  fi
  
  # Fetch OpenRouter app version
  FETCHED_OPENROUTER_APP_VERSION=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}OPENROUTER_APP_VERSION" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_OPENROUTER_APP_VERSION" ]; then
    OPENROUTER_APP_VERSION="$FETCHED_OPENROUTER_APP_VERSION"
    echo -e "${GREEN}✓ Fetched OpenRouter app version from GitHub${NC}"
  fi
  
  # Fetch Ethereum Chain ID
  FETCHED_ETHEREUM_CHAIN_ID=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}ETHEREUM_CHAIN_ID" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_ETHEREUM_CHAIN_ID" ]; then
    ETHEREUM_CHAIN_ID="$FETCHED_ETHEREUM_CHAIN_ID"
    echo -e "${GREEN}✓ Fetched Ethereum Chain ID from GitHub${NC}"
  fi
  
  # Fetch Ethereum RPC URL
  FETCHED_ETHEREUM_RPC_URL=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}ETHEREUM_RPC_URL" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_ETHEREUM_RPC_URL" ]; then
    ETHEREUM_RPC_URL="$FETCHED_ETHEREUM_RPC_URL"
    echo -e "${GREEN}✓ Fetched Ethereum RPC URL from GitHub${NC}"
  fi
  
  # Try to fetch secrets indirectly - GitHub doesn't allow direct secret access
  # Check for Redis URL secret existence
  if [ -z "$UPSTASH_URL" ] && [ -z "$REDIS_URL" ] || [[ "${REDIS_URL}" == *"localhost"* ]]; then
    if gh secret list -R "$GITHUB_REPO" | grep -q "${ENV_PREFIX}REDIS_URL" >/dev/null 2>&1; then
      echo -e "${YELLOW}Redis URL secret found in GitHub but cannot access value directly.${NC}"
      echo -e "${YELLOW}Please set ${ENV_PREFIX}REDIS_URL as an environment variable or provide it when prompted.${NC}"
    else
      echo -e "${YELLOW}Could not find Redis URL secret in GitHub.${NC}"
    fi
  fi
  
  # Check for Secondary Endpoint Token secret existence
  if [ -z "$SECONDARY_ENDPOINT_TOKEN" ]; then
    if gh secret list -R "$GITHUB_REPO" | grep -q "${ENV_PREFIX}SECONDARY_ENDPOINT_TOKEN" >/dev/null 2>&1; then
      echo -e "${YELLOW}Secondary Endpoint Token secret found in GitHub but cannot access value directly.${NC}"
      echo -e "${YELLOW}Please set ${ENV_PREFIX}SECONDARY_ENDPOINT_TOKEN as an environment variable or provide it when prompted.${NC}"
    else
      echo -e "${YELLOW}Could not find Secondary Endpoint Token secret in GitHub.${NC}"
    fi
  fi
  
  # Fetch Google Cloud Project ID
  FETCHED_PROJECT_ID=$(gh variable list -R "$GITHUB_REPO" | grep "GCP_PROJECT_ID" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_PROJECT_ID" ]; then
    PROJECT_ID="$FETCHED_PROJECT_ID"
    echo -e "${GREEN}✓ Fetched Google Cloud Project ID from GitHub${NC}"
  fi
  
  echo -e "${GREEN}✓ Completed GitHub configuration fetch${NC}"
  return 0
}

# Function to sanitize model names (equivalent to simplify-model-names.sh)
simplify_model_names() {
  local input="$1"
  # Remove all numbers with decimal points and special characters
  echo "$input" | sed 's/[0-9]\+\.[0-9]\+//g' | sed 's/[0-9]\+B//g' | sed 's/ /_/g' | sed 's/,/__/g' | sed 's/|/--/g' | sed 's/[:;]/_/g'
}

# Function to escape special characters for sed (like escape-sed-value.sh)
escape_sed_value() {
  local value="$1"
  echo "$value" | sed -e 's/[\/&]/\\&/g'
}

# Check if user is authenticated with Google Cloud
is_authenticated() {
  # Check if user is authenticated
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
  
  if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    echo "Please install Node.js and npm from: https://nodejs.org/"
    missing_requirements=1
  else
    echo -e "${GREEN}✓ npm is installed${NC}"
  fi
  
  if ! command_exists sed; then
    echo -e "${RED}Error: sed is not installed.${NC}"
    missing_requirements=1
  else
    echo -e "${GREEN}✓ sed is installed${NC}"
  fi
  
  # Check for gh CLI as well
  if ! command_exists gh; then
    echo -e "${YELLOW}Warning: GitHub CLI (gh) is not installed. GitHub variable fetching will be skipped.${NC}"
    echo "Consider installing it from: https://cli.github.com/"
  else
    echo -e "${GREEN}✓ GitHub CLI is installed${NC}"
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
  gcloud services enable cloudbuild.googleapis.com
  gcloud services enable run.googleapis.com
  gcloud services enable artifactregistry.googleapis.com
  gcloud services enable secretmanager.googleapis.com
  
  # Configure Docker to use Google Cloud credential helper
  echo -e "${YELLOW}Configuring Docker authentication...${NC}"
  gcloud auth configure-docker --quiet
}

# Check for required secrets and prompt if needed
check_and_prompt_for_secrets() {
  section "Checking Required Secrets"
  
  # Check if we have a cloud Redis URL set, if not, prompt for it
  if [[ "${REDIS_URL}" == *"localhost"* ]] || [[ -z "${REDIS_URL}" ]]; then
    echo -e "${YELLOW}Warning: You are using a localhost Redis URL which won't work in Cloud Run.${NC}"
    echo -e "${YELLOW}Please enter a cloud-based Redis URL (e.g., from Upstash):${NC}"
    read -p "Redis URL (leave empty to use default Upstash dev URL): " UPSTASH_URL
    
    # If empty, use a default Upstash dev URL
    if [ -z "$UPSTASH_URL" ]; then
      UPSTASH_URL="redis://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379"
      echo -e "${YELLOW}Using default Upstash dev URL.${NC}"
    fi
  else
    UPSTASH_URL="${REDIS_URL}"
  fi
  
  # Check if we have an OpenAI API key
  if [ -z "$SECONDARY_ENDPOINT_TOKEN" ]; then
    echo -e "${YELLOW}Warning: No SECONDARY_ENDPOINT_TOKEN found in environment.${NC}"
    echo -e "${YELLOW}Please enter your OpenRouter API key:${NC}"
    read -p "OpenRouter API key: " SECONDARY_ENDPOINT_TOKEN
    
    if [ -z "$SECONDARY_ENDPOINT_TOKEN" ]; then
      echo -e "${RED}Error: No OpenRouter API key provided. This is required for deployment.${NC}"
      exit 1
    fi
  fi
}

# Create or update secrets in Secret Manager
setup_secrets() {
  section "Setting up Secrets"
  
  # Check if the OpenAI API key secret exists
  if ! gcloud secrets describe openai-api-key >/dev/null 2>&1; then
    echo -e "${YELLOW}Creating OpenAI API key secret...${NC}"
    echo -n "$SECONDARY_ENDPOINT_TOKEN" | gcloud secrets create openai-api-key --data-file=-
  else
    echo -e "${YELLOW}Updating OpenAI API key secret...${NC}"
    echo -n "$SECONDARY_ENDPOINT_TOKEN" | gcloud secrets versions add openai-api-key --data-file=-
  fi
  
  # Grant access to the Cloud Run service account
  echo -e "${YELLOW}Granting Secret Manager access to Cloud Run service account...${NC}"
  PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
  SERVICE_ACCOUNT="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
  
  gcloud secrets add-iam-policy-binding openai-api-key \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
  
  echo -e "${GREEN}✓ Secrets configured successfully${NC}"
}

# Build and tag the Docker image
build_image() {
  section "Building Docker Image"
  
  # Use proper path for index.html check
  local current_dir=$(pwd)
  local index_path=""
  
  if [[ "$current_dir" == *"/scripts" ]]; then
    # If we're in the scripts directory, check one level up
    index_path="../index.html"
  else
    # If we're already at the root
    index_path="./index.html"
  fi
  
  # Verify index.html exists
  echo "Verifying index.html for build..."
  echo "Looking for index.html at: $index_path"
  if [ ! -f "$index_path" ]; then
    echo -e "${RED}❌ ERROR: index.html not found!${NC}"
    exit 1
  fi
  
  echo "✅ Found index.html, contents:"
  grep -n "<meta" "$index_path" || echo "No meta tags found in index.html"
  
  # Clean build cache
  echo "Cleaning build cache..."
  if [[ "$current_dir" == *"/scripts" ]]; then
    # If in scripts directory, clean up one level up
    rm -rf ../dist ../node_modules/.vite
  else
    # If at root
    rm -rf dist node_modules/.vite
  fi
  
  # Generate unique build ID
  BUILD_ID="$(date +%s)-$(git rev-parse --short HEAD 2>/dev/null || echo 'local')"
  echo "Using BUILD_ID: $BUILD_ID for cache control"
  
  # Sanitize model names to prevent shell script errors
  SIMPLIFIED_MODELS=$(simplify_model_names "$REACT_APP_AVAILABLE_MODELS")
  SIMPLIFIED_SECONDARY_MODEL=$(simplify_model_names "$SECONDARY_ENDPOINT_MODEL")
  
  echo "Simplified model names for Docker build: $SIMPLIFIED_MODELS"
  echo "Simplified secondary model for Docker build: $SIMPLIFIED_SECONDARY_MODEL"
  
  echo -e "${YELLOW}Building Docker image with model configuration...${NC}"
  # If we're in the scripts directory, we need to go up one level for the docker build
  if [[ "$current_dir" == *"/scripts" ]]; then
    cd ..
  fi
  
  docker build \
    --build-arg BUILD_ID="$BUILD_ID" \
    --build-arg REACT_APP_AVAILABLE_MODELS="$SIMPLIFIED_MODELS" \
    --build-arg VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://nfa-proxy-1081887913409.us-west1.run.app}" \
    --build-arg SECONDARY_ENDPOINT_URL="${SECONDARY_ENDPOINT_URL}" \
    --build-arg SECONDARY_ENDPOINT_MODEL="$SIMPLIFIED_SECONDARY_MODEL" \
    --build-arg USE_FALLBACK_AS_PRIMARY="${USE_FALLBACK_AS_PRIMARY}" \
    --build-arg CONSUMER_API_URL="${CONSUMER_API_URL}" \
    -t "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" .
  
  # If we changed directory, go back to the original directory
  if [[ "$current_dir" == *"/scripts" ]]; then
    cd scripts
  fi
  
  echo -e "${GREEN}✓ Docker image built successfully with model: $SIMPLIFIED_MODELS${NC}"
}

# Push the Docker image to Google Container Registry
push_image() {
  section "Pushing to Google Container Registry"
  
  echo -e "${YELLOW}Pushing Docker image to GCR...${NC}"
  docker push "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"
  
  echo -e "${GREEN}✓ Docker image pushed successfully${NC}"
}

# Configure the Cloud Run YAML
configure_yaml() {
  section "Configuring Cloud Run YAML"
  
  # Copy the template YAML - handle different directory positions
  local current_dir=$(pwd)
  if [[ "$current_dir" == *"/scripts" ]]; then
    cp ./cloud-run-config-template.yaml ../cloud-run-deploy-config.yaml
    cd ..
  else
    cp ./scripts/cloud-run-config-template.yaml ./cloud-run-deploy-config.yaml
  fi
  
  # Update service name in the YAML
  sed -i.bak "s|morsaas|$SERVICE_NAME|g" cloud-run-deploy-config.yaml
  
  # Update namespace to use project ID
  sed -i.bak "s|namespace: default|namespace: $PROJECT_ID|g" cloud-run-deploy-config.yaml
  
  # Update environment labels
  sed -i.bak "s|ENVIRONMENT_NAME|$ENVIRONMENT|g" cloud-run-deploy-config.yaml
  
  # Update image reference
  sed -i.bak "s|PROJECT_ID|$PROJECT_ID|g" cloud-run-deploy-config.yaml
  sed -i.bak "s|COMMIT_SHA|latest|g" cloud-run-deploy-config.yaml
  
  # Verify the Redis URL
  echo "Redis URL format check:"
  if [[ "${UPSTASH_URL}" == redis://* ]]; then
    echo "WARNING: Standard Redis format detected (redis://). For Upstash connections, secure protocol (rediss://) is recommended."
  elif [[ "${UPSTASH_URL}" == rediss://* ]]; then
    echo "Secure Redis format detected (rediss://). This is the correct format for Upstash connections."
  else
    echo "Unknown Redis format, please verify the URL"
    echo "RECOMMENDED FORMAT: rediss://default:TOKEN@HOSTNAME.upstash.io:6379"
  fi
  
  # Update Redis URL in the YAML
  # We need to handle escaping for sed
  ESCAPED_REDIS_URL=$(escape_sed_value "$UPSTASH_URL")
  sed -i.bak "s|YOUR_REDIS_URL|$ESCAPED_REDIS_URL|g" cloud-run-deploy-config.yaml
  
  # Update model configuration
  SIMPLIFIED_MODELS=$(simplify_model_names "$REACT_APP_AVAILABLE_MODELS")
  ESCAPED_MODELS=$(escape_sed_value "$SIMPLIFIED_MODELS")
  sed -i.bak "s|REACT_APP_AVAILABLE_MODELS_VALUE|$ESCAPED_MODELS|g" cloud-run-deploy-config.yaml
  
  # Update secondary endpoint URL
  ESCAPED_ENDPOINT_URL=$(escape_sed_value "$SECONDARY_ENDPOINT_URL")
  sed -i.bak "s|SECONDARY_ENDPOINT_URL_VALUE|$ESCAPED_ENDPOINT_URL|g" cloud-run-deploy-config.yaml
  
  # Update secondary endpoint model
  SIMPLIFIED_ENDPOINT_MODEL=$(simplify_model_names "$SECONDARY_ENDPOINT_MODEL")
  ESCAPED_ENDPOINT_MODEL=$(escape_sed_value "$SIMPLIFIED_ENDPOINT_MODEL")
  sed -i.bak "s|SECONDARY_ENDPOINT_MODEL_VALUE|$ESCAPED_ENDPOINT_MODEL|g" cloud-run-deploy-config.yaml
  
  # Update consumer API URL
  ESCAPED_CONSUMER_API_URL=$(escape_sed_value "$CONSUMER_API_URL")
  sed -i.bak "s|CONSUMER_API_URL_VALUE|$ESCAPED_CONSUMER_API_URL|g" cloud-run-deploy-config.yaml
  
  # Update USE_FALLBACK_AS_PRIMARY
  if [[ "$USE_FALLBACK_AS_PRIMARY" == "true" ]]; then
    sed -i.bak "s|\"USE_FALLBACK_AS_PRIMARY_VALUE\"|\"true\"|g" cloud-run-deploy-config.yaml
  else
    sed -i.bak "s|\"USE_FALLBACK_AS_PRIMARY_VALUE\"|\"false\"|g" cloud-run-deploy-config.yaml
  fi
  
  # Update OpenRouter configuration
  ESCAPED_URL=$(escape_sed_value "$OPENROUTER_HTTP_REFERER")
  sed -i.bak "s|OPENROUTER_HTTP_REFERER_VALUE|$ESCAPED_URL|g" cloud-run-deploy-config.yaml
  
  sed -i.bak "s|OPENROUTER_APP_TITLE_VALUE|$OPENROUTER_APP_TITLE|g" cloud-run-deploy-config.yaml
  sed -i.bak "s|OPENROUTER_APP_VERSION_VALUE|$OPENROUTER_APP_VERSION|g" cloud-run-deploy-config.yaml
  
  # Update Ethereum configuration
  ESCAPED_ETH_RPC_URL=$(escape_sed_value "$ETHEREUM_RPC_URL")
  sed -i.bak "s|ETHEREUM_RPC_URL_VALUE|$ESCAPED_ETH_RPC_URL|g" cloud-run-deploy-config.yaml
  
  # Clean up backup files
  rm -f cloud-run-deploy-config.yaml.bak
  
  # Return to scripts directory if we were there
  if [[ "$current_dir" == *"/scripts" ]]; then
    cd scripts
  fi
  
  echo -e "${GREEN}✓ Cloud Run YAML configured for $ENVIRONMENT environment${NC}"
}

# Deploy to Cloud Run using YAML
deploy_to_cloud_run() {
  section "Deploying to Cloud Run using YAML"
  
  echo -e "${YELLOW}Deploying to Cloud Run with extended startup time...${NC}"
  echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
  echo -e "${YELLOW}Service: $SERVICE_NAME${NC}"
  
  # Make sure we're in the right directory
  local current_dir=$(pwd)
  local yaml_path=""
  
  if [[ "$current_dir" == *"/scripts" ]]; then
    yaml_path="../cloud-run-deploy-config.yaml"
  else
    yaml_path="./cloud-run-deploy-config.yaml"
  fi
  
  # Deploy using the YAML configuration for extended startup timeout
  if gcloud run services replace "$yaml_path" --region="$REGION"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    
    # Get the deployed service URL
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)')
    echo -e "${GREEN}Service URL: $SERVICE_URL${NC}"
  else
    echo -e "${RED}❌ Deployment failed!${NC}"
    
    # Get basic information about the failed deployment
    echo "Fetching basic information about the failed deployment..."
    
    # Attempt to get the service status
    echo "Service status:"
    gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status)' || echo "Unable to retrieve service status"
    
    # Get information about the latest revision
    echo "Latest revision information:"
    gcloud run revisions list --service="$SERVICE_NAME" --region="$REGION" --limit=1 --format="table(name, active, traffic_percent, service_account, ready)" || echo "Unable to retrieve revision information"
    
    exit 1
  fi
}

# Configure IAM for public access
configure_iam() {
  section "Configuring IAM Policy"
  
  echo -e "${YELLOW}Setting IAM policy to allow unauthenticated access...${NC}"
  
  # Create a temporary policy file
  cat > policy.yaml << EOF
bindings:
- members:
  - allUsers
  role: roles/run.invoker
EOF
  
  # Apply the policy to allow unauthenticated access
  if gcloud run services set-iam-policy "$SERVICE_NAME" policy.yaml --region="$REGION" --quiet; then
    echo -e "${GREEN}✅ IAM policy updated to allow public access${NC}"
  else
    echo -e "${YELLOW}Warning: Could not set IAM policy. You may need to set it manually.${NC}"
  fi
  
  # Clean up temporary policy file
  rm -f policy.yaml
}

# Check deployment health
check_health() {
  section "Checking Deployment Health"
  
  echo "Waiting for deployment to stabilize..."
  # Wait time to ensure service is fully initialized
  sleep 30
  
  # Get the service URL
  SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)')
  
  echo "Checking basic service health..."
  
  # First check if the service is responding at all
  echo "Checking if the service is responding..."
  HTTP_STATUS=$(curl -s --head -o /dev/null -w "%{http_code}" "${SERVICE_URL}" || echo "Failed")
  
  if [[ "$HTTP_STATUS" =~ ^(2|3)[0-9][0-9]$ ]]; then
    echo -e "${GREEN}✅ Service base URL is responding with $HTTP_STATUS${NC}"
  else
    echo -e "${YELLOW}⚠️ Service base URL is not responding with a 2xx or 3xx status code.${NC}"
    echo "Status code: $HTTP_STATUS"
  fi
  
  # Check the HTML response for metatags
  echo "Verifying metatags are present in the deployed HTML..."
  HTML_CONTENT=$(curl -s "${SERVICE_URL}")
  if echo "${HTML_CONTENT}" | grep -q "<meta"; then
    echo -e "${GREEN}✅ Metatags found in the deployed HTML${NC}"
    echo "Found metatags:"
    echo "${HTML_CONTENT}" | grep -n "<meta" | head -5
  else
    echo -e "${YELLOW}⚠️ Warning: No metatags found in the deployed HTML!${NC}"
    echo "This indicates the index.html may not have been properly included in the build."
  fi
  
  # Check API accessibility
  echo "Checking API accessibility..."
  API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/api/health" || echo "Failed")
  echo "API health endpoint status: $API_STATUS"
  
  if [[ "$API_STATUS" =~ ^(2|3|4)[0-9][0-9]$ ]]; then
    echo -e "${GREEN}✅ Service appears to be running (got a valid HTTP response)${NC}"
  else
    echo -e "${YELLOW}⚠️ Service may not be fully initialized yet (status code: $API_STATUS)${NC}"
  fi
  
  echo -e "${GREEN}Deployment health check completed${NC}"
  echo "You can visit your deployed app at: $SERVICE_URL"
}

# Show configured environment variables
show_config() {
  # Print the final configuration after GitHub fetching
  echo -e "${BLUE}Deployment Configuration:${NC}"
  echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
  echo -e "${YELLOW}Service Name: $SERVICE_NAME${NC}"
  echo -e "${YELLOW}Project ID: $PROJECT_ID${NC}"
  echo -e "${YELLOW}Available Models: $REACT_APP_AVAILABLE_MODELS${NC}"
  echo -e "${YELLOW}Secondary Endpoint URL: $SECONDARY_ENDPOINT_URL${NC}"
  echo -e "${YELLOW}Ethereum Chain ID: $ETHEREUM_CHAIN_ID${NC}"
  echo -e "${YELLOW}Ethereum RPC URL: $ETHEREUM_RPC_URL${NC}"
  echo -e "${YELLOW}Consumer API URL: $CONSUMER_API_URL${NC}"
  echo -e "${YELLOW}Use Fallback as Primary: $USE_FALLBACK_AS_PRIMARY${NC}"
  echo -e "${YELLOW}OpenRouter HTTP Referer: $OPENROUTER_HTTP_REFERER${NC}"
  echo -e "${YELLOW}OpenRouter App Title: $OPENROUTER_APP_TITLE${NC}"
  echo -e "${YELLOW}OpenRouter App Version: $OPENROUTER_APP_VERSION${NC}"
}

# Main execution
main() {
  # Show all environment variables that would be used
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${GREEN}   MorSaaS Development Deployment to Google Cloud Run   ${NC}"
  echo -e "${GREEN}==================================================${NC}"
  
  check_requirements
  
  # First fetch variables from GitHub
  fetch_github_env_vars
  
  # Check for and prompt for any missing secrets
  check_and_prompt_for_secrets
  
  # Show final configuration after fetching from GitHub and environment
  show_config
  
  initialize_gcloud
  setup_secrets
  build_image
  push_image
  configure_yaml
  deploy_to_cloud_run
  configure_iam
  check_health
  
  section "Next Steps"
  echo -e "${YELLOW}1. Set up a custom domain for your Cloud Run service if needed${NC}"
  echo -e "${YELLOW}2. Verify your Upstash Redis connection is working properly${NC}"
  echo -e "${YELLOW}3. Test your application functionality${NC}"
  
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${GREEN}   Deployment process completed successfully!   ${NC}"
  echo -e "${GREEN}   The app deployed to: $SERVICE_NAME   ${NC}"
  echo -e "${GREEN}==================================================${NC}"
}

# Run the script
main 