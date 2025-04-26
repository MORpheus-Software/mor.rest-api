#!/bin/bash
set -e

# MorSaaS Deployment Script for Google Cloud Run
# This script automates the deployment of the application to Google Cloud Run
# and fetches configuration from GitHub

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration Variables
PROJECT_NAME="morsaas"
IMAGE_NAME="morsaas-app"
REGION="${REGION:-us-west1}"
MEMORY="2Gi"
CPU="1"
CONCURRENCY="80"
MIN_INSTANCES="1"
MAX_INSTANCES="10"
TIMEOUT="600s"

# DEFAULT ENVIRONMENT SETTINGS
# When running locally, default to the dev environment
ENVIRONMENT="${DEPLOY_ENVIRONMENT:-dev}"
if [[ "$ENVIRONMENT" == "master" ]]; then
  ENVIRONMENT="prod"
  SERVICE_NAME="${SERVICE_NAME:-morsaas}"
  IS_PROD="true"
elif [[ "$ENVIRONMENT" == "staging" ]]; then
  ENVIRONMENT="staging"
  SERVICE_NAME="${SERVICE_NAME:-morsaas-staging}"
  IS_PROD="false"
else
  # Default to dev environment
  ENVIRONMENT="dev"
  SERVICE_NAME="${SERVICE_NAME:-morsaas-dev}"
  IS_PROD="false"
fi

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

# Function to fetch GitHub environment variables
fetch_github_env_vars() {
  section "Fetching GitHub Environment Variables"
  
  # Check if GitHub CLI is installed
  if ! command_exists gh; then
    echo -e "${YELLOW}GitHub CLI (gh) not installed. Will use local environment variables or defaults.${NC}"
    echo -e "${YELLOW}To fetch values from GitHub, install GitHub CLI from: https://cli.github.com/${NC}"
    return 1
  fi
  
  # Check if authenticated with GitHub
  if ! gh auth status &>/dev/null; then
    echo -e "${YELLOW}Not authenticated with GitHub. Please run 'gh auth login' first.${NC}"
    echo -e "${YELLOW}Will use local environment variables or defaults.${NC}"
    return 1
  fi
  
  # Determine which repository to use
  if [ -z "$GITHUB_REPO" ]; then
    # Try to get the repository from git remote
    GITHUB_REPO=$(git remote -v | grep -m 1 origin | awk '{print $2}' | sed 's/.*github.com[:\/]\(.*\)\.git.*/\1/')
    if [ -z "$GITHUB_REPO" ]; then
      echo -e "${YELLOW}Could not determine GitHub repository. Please set GITHUB_REPO environment variable.${NC}"
      echo -e "${YELLOW}Will use local environment variables or defaults.${NC}"
      return 1
    fi
  fi
  
  echo -e "${GREEN}Fetching variables for $ENVIRONMENT environment from GitHub repository: $GITHUB_REPO${NC}"
  
  # Fetch environment variables from GitHub
  ENV_PREFIX=""
  if [[ "$ENVIRONMENT" == "prod" ]]; then
    ENV_PREFIX="PROD_"
  elif [[ "$ENVIRONMENT" == "staging" ]]; then
    ENV_PREFIX="STAGING_"
  else
    ENV_PREFIX="DEV_"
  fi
  
  # Try to fetch variables and secrets from GitHub
  echo -e "${YELLOW}Fetching environment variables from GitHub...${NC}"
  
  # Fetch available models
  FETCHED_AVAILABLE_MODELS=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}AVAILABLE_MODELS" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_AVAILABLE_MODELS" ]; then
    REACT_APP_AVAILABLE_MODELS="$FETCHED_AVAILABLE_MODELS"
    echo -e "${GREEN}✓ Fetched available models from GitHub${NC}"
  else
    REACT_APP_AVAILABLE_MODELS="${REACT_APP_AVAILABLE_MODELS:-mistralai/mistral-small-3.1-24b-instruct|Mistral Small 3.1 24B,deepseek/deepseek-r1-zero|Deepseek R1 Zero,meta-llama/llama-3.3-70b-instruct|Llama 3.3 70B}"
    echo -e "${YELLOW}Could not fetch available models from GitHub. Using default.${NC}"
  fi
  
  # Fetch secondary endpoint URL
  FETCHED_SECONDARY_ENDPOINT_URL=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}SECONDARY_ENDPOINT_URL" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_SECONDARY_ENDPOINT_URL" ]; then
    SECONDARY_ENDPOINT_URL="$FETCHED_SECONDARY_ENDPOINT_URL"
    echo -e "${GREEN}✓ Fetched secondary endpoint URL from GitHub${NC}"
  else
    SECONDARY_ENDPOINT_URL="${SECONDARY_ENDPOINT_URL:-https://openrouter.ai/api/v1/chat/completions}"
    echo -e "${YELLOW}Could not fetch secondary endpoint URL from GitHub. Using default.${NC}"
  fi
  
  # Fetch consumer API URL
  FETCHED_CONSUMER_API_URL=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}CONSUMER_API_URL" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_CONSUMER_API_URL" ]; then
    CONSUMER_API_URL="$FETCHED_CONSUMER_API_URL"
    echo -e "${GREEN}✓ Fetched consumer API URL from GitHub${NC}"
  else
    CONSUMER_API_URL="${CONSUMER_API_URL:-https://consumer-node-1081887913409.us-west1.run.app}"
    echo -e "${YELLOW}Could not fetch consumer API URL from GitHub. Using default.${NC}"
  fi
  
  # Fetch use fallback as primary
  FETCHED_USE_FALLBACK_AS_PRIMARY=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}USE_FALLBACK_AS_PRIMARY" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_USE_FALLBACK_AS_PRIMARY" ]; then
    USE_FALLBACK_AS_PRIMARY="$FETCHED_USE_FALLBACK_AS_PRIMARY"
    echo -e "${GREEN}✓ Fetched use fallback as primary from GitHub${NC}"
  else
    USE_FALLBACK_AS_PRIMARY="${USE_FALLBACK_AS_PRIMARY:-false}"
    echo -e "${YELLOW}Could not fetch use fallback as primary from GitHub. Using default.${NC}"
  fi
  
  # Fetch OpenRouter HTTP referer
  FETCHED_OPENROUTER_HTTP_REFERER=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}OPENROUTER_HTTP_REFERER" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_OPENROUTER_HTTP_REFERER" ]; then
    OPENROUTER_HTTP_REFERER="$FETCHED_OPENROUTER_HTTP_REFERER"
    echo -e "${GREEN}✓ Fetched OpenRouter HTTP referer from GitHub${NC}"
  else
    if [[ "$ENVIRONMENT" == "prod" ]]; then
      OPENROUTER_HTTP_REFERER="${OPENROUTER_HTTP_REFERER:-https://morsaas.com}"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
      OPENROUTER_HTTP_REFERER="${OPENROUTER_HTTP_REFERER:-https://staging.morsaas.com}"
    else
      OPENROUTER_HTTP_REFERER="${OPENROUTER_HTTP_REFERER:-https://dev.morsaas.com}"
    fi
    echo -e "${YELLOW}Could not fetch OpenRouter HTTP referer from GitHub. Using default.${NC}"
  fi
  
  # Fetch OpenRouter app title
  FETCHED_OPENROUTER_APP_TITLE=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}OPENROUTER_APP_TITLE" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_OPENROUTER_APP_TITLE" ]; then
    OPENROUTER_APP_TITLE="$FETCHED_OPENROUTER_APP_TITLE"
    echo -e "${GREEN}✓ Fetched OpenRouter app title from GitHub${NC}"
  else
    if [[ "$ENVIRONMENT" == "prod" ]]; then
      OPENROUTER_APP_TITLE="${OPENROUTER_APP_TITLE:-MorSaaS}"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
      OPENROUTER_APP_TITLE="${OPENROUTER_APP_TITLE:-MorSaaS-Staging}"
    else
      OPENROUTER_APP_TITLE="${OPENROUTER_APP_TITLE:-MorSaaS-Dev}"
    fi
    echo -e "${YELLOW}Could not fetch OpenRouter app title from GitHub. Using default.${NC}"
  fi
  
  # Fetch OpenRouter app version
  FETCHED_OPENROUTER_APP_VERSION=$(gh variable list -R "$GITHUB_REPO" | grep "${ENV_PREFIX}OPENROUTER_APP_VERSION" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_OPENROUTER_APP_VERSION" ]; then
    OPENROUTER_APP_VERSION="$FETCHED_OPENROUTER_APP_VERSION"
    echo -e "${GREEN}✓ Fetched OpenRouter app version from GitHub${NC}"
  else
    if [[ "$ENVIRONMENT" == "prod" ]]; then
      OPENROUTER_APP_VERSION="${OPENROUTER_APP_VERSION:-1.0.0}"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
      OPENROUTER_APP_VERSION="${OPENROUTER_APP_VERSION:-1.0.0-staging}"
    else
      OPENROUTER_APP_VERSION="${OPENROUTER_APP_VERSION:-1.0.0-dev}"
    fi
    echo -e "${YELLOW}Could not fetch OpenRouter app version from GitHub. Using default.${NC}"
  fi
  
  # Try to fetch secrets (this may not work depending on GitHub permissions)
  echo -e "${YELLOW}Fetching secrets from GitHub...${NC}"
  
  # Fetch Redis URL (as secret)
  if [ -z "$UPSTASH_URL" ]; then
    # Note: This will only work with proper permissions and may not be possible for all users
    echo -e "${YELLOW}Attempting to fetch Redis URL secret from GitHub...${NC}"
    
    # Attempt to fetch the secret (may not work due to GitHub security)
    if gh secret list -R "$GITHUB_REPO" | grep -q "${ENV_PREFIX}REDIS_URL" >/dev/null 2>&1; then
      echo -e "${GREEN}Redis URL secret found in GitHub. Note that GitHub doesn't allow direct access to secret values.${NC}"
      echo -e "${YELLOW}Please set REDIS_URL or ${ENV_PREFIX}REDIS_URL as an environment variable before running this script.${NC}"
    else
      echo -e "${YELLOW}Could not find Redis URL secret in GitHub. Please provide it manually.${NC}"
    fi
    
    # Since we can't fetch the value directly, prompt user if it's not already set
    if [ -z "$REDIS_URL" ]; then
      echo -ne "${YELLOW}Enter Redis URL for $ENVIRONMENT environment: ${NC}"
      read -r UPSTASH_URL
      
      if [ -z "$UPSTASH_URL" ]; then
        echo -e "${RED}Error: Redis URL cannot be empty.${NC}"
        echo -e "${YELLOW}Using default value, but this might not work in production.${NC}"
        UPSTASH_URL="redis://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379"
      fi
    else
      UPSTASH_URL="$REDIS_URL"
    fi
  fi
  
  # Fetch Google Cloud Project ID
  FETCHED_PROJECT_ID=$(gh variable list -R "$GITHUB_REPO" | grep "GCP_PROJECT_ID" | awk '{print $2}' 2>/dev/null)
  if [ ! -z "$FETCHED_PROJECT_ID" ]; then
    PROJECT_ID="$FETCHED_PROJECT_ID"
    echo -e "${GREEN}✓ Fetched Google Cloud Project ID from GitHub${NC}"
  else
    # Get project ID from gcloud if possible, otherwise use environment variable
    PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo "")}"
    echo -e "${YELLOW}Could not fetch Google Cloud Project ID from GitHub. Using local configuration.${NC}"
  fi
  
  # Direct variable overrides
  # These direct variables take precedence over environment-specific ones
  if [ ! -z "$REACT_APP_AVAILABLE_MODELS" ]; then
    echo -e "${YELLOW}Using explicitly provided REACT_APP_AVAILABLE_MODELS environment variable.${NC}"
  fi
  
  if [ ! -z "$SECONDARY_ENDPOINT_URL" ]; then
    echo -e "${YELLOW}Using explicitly provided SECONDARY_ENDPOINT_URL environment variable.${NC}"
  fi
  
  if [ ! -z "$CONSUMER_API_URL" ]; then
    echo -e "${YELLOW}Using explicitly provided CONSUMER_API_URL environment variable.${NC}"
  fi
  
  if [ ! -z "$USE_FALLBACK_AS_PRIMARY" ]; then
    echo -e "${YELLOW}Using explicitly provided USE_FALLBACK_AS_PRIMARY environment variable.${NC}"
  fi
  
  if [ ! -z "$OPENROUTER_HTTP_REFERER" ]; then
    echo -e "${YELLOW}Using explicitly provided OPENROUTER_HTTP_REFERER environment variable.${NC}"
  fi
  
  if [ ! -z "$OPENROUTER_APP_TITLE" ]; then
    echo -e "${YELLOW}Using explicitly provided OPENROUTER_APP_TITLE environment variable.${NC}"
  fi
  
  if [ ! -z "$OPENROUTER_APP_VERSION" ]; then
    echo -e "${YELLOW}Using explicitly provided OPENROUTER_APP_VERSION environment variable.${NC}"
  fi
  
  echo -e "${GREEN}✓ Completed GitHub configuration fetch${NC}"
  return 0
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
  
  # Configure Docker to use Google Cloud credential helper
  echo -e "${YELLOW}Configuring Docker authentication...${NC}"
  gcloud auth configure-docker --quiet
}

# Build and tag the Docker image
build_image() {
  section "Building Docker Image"
  
  # Verify index.html exists
  echo "Verifying index.html for build..."
  if [ ! -f "index.html" ]; then
    echo -e "${RED}❌ ERROR: index.html not found in the root directory!${NC}"
    exit 1
  fi
  
  echo "✅ Found index.html, contents:"
  grep -n "<meta" index.html || echo "No meta tags found in index.html"
  
  # Clean build cache
  echo "Cleaning build cache..."
  rm -rf dist node_modules/.vite
  
  # Generate unique build ID
  BUILD_ID="$(date +%s)-$(git rev-parse --short HEAD)"
  echo "Using BUILD_ID: $BUILD_ID for cache control"
  
  # Sanitize model names to prevent shell script errors
  SIMPLIFIED_MODELS=$(simplify_model_names "$REACT_APP_AVAILABLE_MODELS")
  SIMPLIFIED_SECONDARY_MODEL=$(simplify_model_names "$SECONDARY_ENDPOINT_MODEL")
  
  echo "Simplified model names for Docker build: $SIMPLIFIED_MODELS"
  echo "Simplified secondary model for Docker build: $SIMPLIFIED_SECONDARY_MODEL"
  
  echo -e "${YELLOW}Building Docker image with model configuration...${NC}"
  docker build \
    --build-arg BUILD_ID="$BUILD_ID" \
    --build-arg REACT_APP_AVAILABLE_MODELS="$SIMPLIFIED_MODELS" \
    --build-arg VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://nfa-proxy-1081887913409.us-west1.run.app}" \
    --build-arg SECONDARY_ENDPOINT_URL="${SECONDARY_ENDPOINT_URL}" \
    --build-arg SECONDARY_ENDPOINT_MODEL="$SIMPLIFIED_SECONDARY_MODEL" \
    --build-arg USE_FALLBACK_AS_PRIMARY="${USE_FALLBACK_AS_PRIMARY}" \
    --build-arg CONSUMER_API_URL="${CONSUMER_API_URL}" \
    -t "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" .
  
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
  
  # Copy the template YAML
  cp ./scripts/cloud-run-config-template.yaml cloud-run-deploy-config.yaml
  
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
  
  # Clean up backup files
  rm -f cloud-run-deploy-config.yaml.bak
  
  echo -e "${GREEN}✓ Cloud Run YAML configured for $ENVIRONMENT environment${NC}"
}

# Deploy to Cloud Run using YAML
deploy_to_cloud_run() {
  section "Deploying to Cloud Run using YAML"
  
  echo -e "${YELLOW}Deploying to Cloud Run with extended startup time...${NC}"
  echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
  echo -e "${YELLOW}Service: $SERVICE_NAME${NC}"
  
  # Deploy using the YAML configuration for extended startup timeout
  if gcloud run services replace cloud-run-deploy-config.yaml --region="$REGION"; then
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

# Main execution
main() {
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${GREEN}   MorSaaS Deployment to Google Cloud Run ($ENVIRONMENT)   ${NC}"
  echo -e "${GREEN}==================================================${NC}"
  
  # First fetch variables from GitHub
  fetch_github_env_vars
  
  # Print the final configuration
  echo -e "\n${BLUE}Final Deployment Configuration:${NC}"
  echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
  echo -e "${YELLOW}Service Name: $SERVICE_NAME${NC}"
  echo -e "${YELLOW}Project ID: $PROJECT_ID${NC}"
  echo -e "${YELLOW}Available Models: $REACT_APP_AVAILABLE_MODELS${NC}"
  echo -e "${YELLOW}Secondary Endpoint URL: $SECONDARY_ENDPOINT_URL${NC}"
  echo -e "${YELLOW}Consumer API URL: $CONSUMER_API_URL${NC}"
  echo -e "${YELLOW}Use Fallback as Primary: $USE_FALLBACK_AS_PRIMARY${NC}"
  echo -e "${YELLOW}OpenRouter HTTP Referer: $OPENROUTER_HTTP_REFERER${NC}"
  echo -e "${YELLOW}OpenRouter App Title: $OPENROUTER_APP_TITLE${NC}"
  echo -e "${YELLOW}OpenRouter App Version: $OPENROUTER_APP_VERSION${NC}"
  
  check_requirements
  initialize_gcloud
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
  echo -e "${GREEN}==================================================${NC}"
}

# Run the script
main 