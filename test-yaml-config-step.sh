#!/bin/bash
# This script tests the "Create Cloud Run YAML configuration" step from the workflow

set -e # Exit on error
set -x # Print commands for debugging

echo "Testing YAML configuration step"

# Create a mock environment for testing
REDIS_URL="rediss://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379"
SERVICE_NAME="morsaas-test"
PROJECT_ID="test-project-id"
GITHUB_SHA="abc123"
REACT_APP_AVAILABLE_MODELS="model1,model2"
SECONDARY_ENDPOINT_URL="https://test-endpoint.com"
SECONDARY_ENDPOINT_TOKEN_KEY="openrouter-api-key"
SECONDARY_ENDPOINT_MODEL="test-model"
CONSUMER_API_URL="https://test-consumer.com"
USE_FALLBACK_AS_PRIMARY="false"

# Create a sample template file
mkdir -p ./scripts
cat > ./scripts/cloud-run-config-template.yaml << EOF
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: morsaas
  namespace: default
  labels:
    environment: ENVIRONMENT_NAME
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/startup-cpu-boost: 'true'
        autoscaling.knative.dev/maxScale: '10'
        run.googleapis.com/client-name: github-actions
        run.googleapis.com/client-version: GITHUB_SHA
    spec:
      containerConcurrency: 80
      containers:
      - image: gcr.io/PROJECT_ID/morsaas:COMMIT_SHA
        env:
        - name: NODE_ENV
          value: production
        - name: REDIS_URL
          value: YOUR_REDIS_URL
        - name: REACT_APP_AVAILABLE_MODELS
          value: REACT_APP_AVAILABLE_MODELS_VALUE
        - name: SECONDARY_ENDPOINT_URL
          value: SECONDARY_ENDPOINT_URL_VALUE
        - name: SECONDARY_ENDPOINT_TOKEN_KEY
          value: SECONDARY_ENDPOINT_TOKEN_KEY
        - name: SECONDARY_ENDPOINT_MODEL
          value: SECONDARY_ENDPOINT_MODEL_VALUE
        - name: CONSUMER_API_URL
          value: CONSUMER_API_URL_VALUE
        - name: USE_FALLBACK_AS_PRIMARY
          value: "USE_FALLBACK_AS_PRIMARY_VALUE"
        - name: OPENROUTER_HTTP_REFERER
          value: OPENROUTER_HTTP_REFERER_VALUE
        - name: OPENROUTER_APP_TITLE
          value: OPENROUTER_APP_TITLE_VALUE
        - name: OPENROUTER_APP_VERSION
          value: OPENROUTER_APP_VERSION_VALUE
EOF

# Create a copy of the template YAML file
cp ./scripts/cloud-run-config-template.yaml cloud-run-deploy-config.yaml

# For macOS, we need to use '' after -i
# But for Linux (GitHub Actions), this is not needed
# Check if we're on macOS
if [[ "$(uname)" == "Darwin" ]]; then
  SED_CMD="sed -i ''"
else
  SED_CMD="sed -i"
fi

# Update service name in the YAML
echo "Updating service name..."
$SED_CMD "s|morsaas|${SERVICE_NAME}|g" cloud-run-deploy-config.yaml

# Update environment labels
echo "Updating environment labels..."
$SED_CMD "s|ENVIRONMENT_NAME|test|g" cloud-run-deploy-config.yaml

# Update image references
echo "Updating image references..."
$SED_CMD "s|PROJECT_ID|${PROJECT_ID}|g" cloud-run-deploy-config.yaml
$SED_CMD "s|COMMIT_SHA|${GITHUB_SHA}|g" cloud-run-deploy-config.yaml

# Debug Redis URL format
echo "Redis URL format check:"
if [[ "${REDIS_URL}" == redis://* ]]; then
  echo "WARNING: Standard Redis format detected (redis://)"
elif [[ "${REDIS_URL}" == rediss://* ]]; then
  echo "Secure Redis format detected (rediss://)"
else
  echo "Unknown Redis format, please verify the URL"
fi

# Redis credential extraction
echo "Extracting Redis credentials..."
if [[ "${REDIS_URL}" == redis://* || "${REDIS_URL}" == rediss://* ]]; then
  # Test each part of the extraction separately
  echo "Testing Perl hostname extraction..."
  REDIS_HOST=$(echo "${REDIS_URL}" | perl -ne 'print "$1" if /(\w+[.-]\w+\.\w+):\d+$/')
  echo "Extracted host: ${REDIS_HOST}"
  
  echo "Testing Perl auth part extraction..."
  AUTH_PART=$(echo "${REDIS_URL}" | perl -ne 'print "$1" if /^redis(?:s)?:\/\/(.*)@/')
  echo "Extracted auth part: ${AUTH_PART}"
  
  echo "Testing password extraction..."
  REDIS_PASSWORD=${AUTH_PART#default:}
  echo "Extracted password length: ${#REDIS_PASSWORD} characters"
fi

# Test Redis URL insertion with awk
echo "Testing Redis URL insertion with awk..."
awk -v redis_url="${REDIS_URL}" '
  /YOUR_REDIS_URL/ { print "          value: " redis_url; next }
  { print }
' cloud-run-deploy-config.yaml > temp.yaml && mv temp.yaml cloud-run-deploy-config.yaml

# Update all environment variables
echo "Updating environment variables..."
$SED_CMD "s|REACT_APP_AVAILABLE_MODELS_VALUE|${REACT_APP_AVAILABLE_MODELS}|g" cloud-run-deploy-config.yaml
$SED_CMD "s|SECONDARY_ENDPOINT_URL_VALUE|${SECONDARY_ENDPOINT_URL}|g" cloud-run-deploy-config.yaml
$SED_CMD "s|SECONDARY_ENDPOINT_TOKEN_KEY|${SECONDARY_ENDPOINT_TOKEN_KEY}|g" cloud-run-deploy-config.yaml
$SED_CMD "s|SECONDARY_ENDPOINT_MODEL_VALUE|${SECONDARY_ENDPOINT_MODEL}|g" cloud-run-deploy-config.yaml
$SED_CMD "s|CONSUMER_API_URL_VALUE|${CONSUMER_API_URL}|g" cloud-run-deploy-config.yaml

# Handle boolean values
echo "Handling boolean values..."
if [[ "${USE_FALLBACK_AS_PRIMARY}" == "\"true\"" ]]; then
  $SED_CMD "s|\"USE_FALLBACK_AS_PRIMARY_VALUE\"|\"true\"|g" cloud-run-deploy-config.yaml
else
  $SED_CMD "s|\"USE_FALLBACK_AS_PRIMARY_VALUE\"|\"false\"|g" cloud-run-deploy-config.yaml
fi

# Test OpenRouter configuration updates
echo "Testing OpenRouter configuration updates..."
$SED_CMD "s|OPENROUTER_HTTP_REFERER_VALUE|https://test.morsaas.com|g" cloud-run-deploy-config.yaml
$SED_CMD "s|OPENROUTER_APP_TITLE_VALUE|MorSaaS-Test|g" cloud-run-deploy-config.yaml
$SED_CMD "s|OPENROUTER_APP_VERSION_VALUE|1.0.0-test|g" cloud-run-deploy-config.yaml

# Update secret name
echo "Updating secret name..."
$SED_CMD "s|SECRETS_NAME|${SERVICE_NAME}|g" cloud-run-deploy-config.yaml

# Update Redis credentials if available
echo "Updating Redis credentials..."
if [[ -n "${REDIS_PASSWORD}" ]]; then
  echo "Testing password substitution with awk..."
  # Add a placeholder in the file for testing
  echo "REDIS_PASSWORD_ONLY" >> cloud-run-deploy-config.yaml
  awk -v pass="${REDIS_PASSWORD}" '{gsub(/REDIS_PASSWORD_ONLY/, pass); print}' cloud-run-deploy-config.yaml > temp.yaml && mv temp.yaml cloud-run-deploy-config.yaml
fi

if [[ -n "${REDIS_HOST}" ]]; then
  echo "Testing host substitution with awk..."
  # Add a placeholder in the file for testing
  echo "REDIS_HOSTNAME_ONLY" >> cloud-run-deploy-config.yaml
  awk -v host="${REDIS_HOST}" '{gsub(/REDIS_HOSTNAME_ONLY/, host); print}' cloud-run-deploy-config.yaml > temp.yaml && mv temp.yaml cloud-run-deploy-config.yaml
fi

echo "Final verification of configuration..."
head -n 20 cloud-run-deploy-config.yaml
echo "..."
tail -n 20 cloud-run-deploy-config.yaml

echo "Test completed successfully!" 