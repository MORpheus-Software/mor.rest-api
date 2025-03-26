#!/bin/bash
# Script to update the Cloud Run configuration files with the new environment variables

# Set default project ID
PROJECT_ID=$(gcloud config get-value project)

if [ -z "$PROJECT_ID" ]; then
  echo "No default project set. Please run 'gcloud config set project YOUR_PROJECT_ID' first."
  exit 1
fi

# Check if required environment variables are set
if [ -z "$SECONDARY_ENDPOINT_URL" ] || [ -z "$CONSUMER_API_URL" ]; then
  # Try to load from .env file if it exists
  if [ -f ".env" ]; then
    echo "Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
  else
    echo "Error: SECONDARY_ENDPOINT_URL and CONSUMER_API_URL environment variables are required."
    echo "Please set them or create a .env file with these variables."
    exit 1
  fi
fi

# Set default value for USE_FALLBACK_AS_PRIMARY if not set
if [ -z "$USE_FALLBACK_AS_PRIMARY" ]; then
  USE_FALLBACK_AS_PRIMARY="false"
  echo "USE_FALLBACK_AS_PRIMARY not set, defaulting to 'false'"
fi

echo "Updating Cloud Run configuration files..."

# Update production configuration
echo "Updating production configuration (morsaas-service.yaml)..."
cp morsaas-service.yaml morsaas-service.yaml.bak

# Update the environment variables in the production config
sed -i.bak 's|value: https://api\.openai\.com/v1/chat/completions|value: '"$SECONDARY_ENDPOINT_URL"'|g' morsaas-service.yaml
sed -i.bak 's|value: https://consumer-node-1081887913409\.us-west1\.run\.app|value: '"$CONSUMER_API_URL"'|g' morsaas-service.yaml

# Add USE_FALLBACK_AS_PRIMARY if it doesn't exist
if ! grep -q "USE_FALLBACK_AS_PRIMARY" morsaas-service.yaml; then
  echo "Adding USE_FALLBACK_AS_PRIMARY to production configuration..."
  sed -i.bak '/SECONDARY_ENDPOINT_TOKEN/a\        - name: USE_FALLBACK_AS_PRIMARY\n          value: "'"$USE_FALLBACK_AS_PRIMARY"'"' morsaas-service.yaml
fi

# If USE_FALLBACK_AS_PRIMARY exists, update its value
if grep -q "USE_FALLBACK_AS_PRIMARY" morsaas-service.yaml; then
  echo "Updating USE_FALLBACK_AS_PRIMARY in production configuration..."
  sed -i.bak 's|value: "true"|value: "'"$USE_FALLBACK_AS_PRIMARY"'"|g' morsaas-service.yaml
  sed -i.bak 's|value: "false"|value: "'"$USE_FALLBACK_AS_PRIMARY"'"|g' morsaas-service.yaml
fi

# Ensure the secret references are correct
if ! grep -q "secretKeyRef" morsaas-service.yaml; then
  echo "Adding secretKeyRef for tokens..."
  sed -i.bak 's|- name: SECONDARY_ENDPOINT_TOKEN|- name: SECONDARY_ENDPOINT_TOKEN\n          valueFrom:\n            secretKeyRef:\n              key: latest\n              name: secondary-endpoint-token|g' morsaas-service.yaml
fi

# Verify the changes
if diff morsaas-service.yaml morsaas-service.yaml.bak > /dev/null; then
  echo "❌ No changes were made to the production configuration."
else
  echo "✅ Production configuration updated successfully."
fi

# Update development configuration
echo "Updating development configuration (morsaas-dev-config.yaml)..."
cp morsaas-dev-config.yaml morsaas-dev-config.yaml.bak

# Add the new environment variables to the dev config if they don't exist
if ! grep -q "SECONDARY_ENDPOINT_URL" morsaas-dev-config.yaml; then
  echo "Adding SECONDARY_ENDPOINT_URL to dev configuration..."
  sed -i.bak '/NODE_ENV/a\        - name: SECONDARY_ENDPOINT_URL\n          value: '"$SECONDARY_ENDPOINT_URL"'' morsaas-dev-config.yaml
fi

if ! grep -q "SECONDARY_ENDPOINT_TOKEN" morsaas-dev-config.yaml; then
  echo "Adding SECONDARY_ENDPOINT_TOKEN to dev configuration..."
  sed -i.bak '/SECONDARY_ENDPOINT_URL/a\        - name: SECONDARY_ENDPOINT_TOKEN\n          valueFrom:\n            secretKeyRef:\n              key: latest\n              name: secondary-endpoint-token' morsaas-dev-config.yaml
fi

if ! grep -q "CONSUMER_API_URL" morsaas-dev-config.yaml; then
  echo "Adding CONSUMER_API_URL to dev configuration..."
  sed -i.bak '/SECONDARY_ENDPOINT_TOKEN/a\        - name: CONSUMER_API_URL\n          value: '"$CONSUMER_API_URL"'' morsaas-dev-config.yaml
fi

# Add USE_FALLBACK_AS_PRIMARY to dev config if it doesn't exist
if ! grep -q "USE_FALLBACK_AS_PRIMARY" morsaas-dev-config.yaml; then
  echo "Adding USE_FALLBACK_AS_PRIMARY to dev configuration..."
  sed -i.bak '/SECONDARY_ENDPOINT_TOKEN/a\        - name: USE_FALLBACK_AS_PRIMARY\n          value: "'"$USE_FALLBACK_AS_PRIMARY"'"' morsaas-dev-config.yaml
fi

# If USE_FALLBACK_AS_PRIMARY exists, update its value
if grep -q "USE_FALLBACK_AS_PRIMARY" morsaas-dev-config.yaml; then
  echo "Updating USE_FALLBACK_AS_PRIMARY in dev configuration..."
  sed -i.bak 's|value: "true"|value: "'"$USE_FALLBACK_AS_PRIMARY"'"|g' morsaas-dev-config.yaml
  sed -i.bak 's|value: "false"|value: "'"$USE_FALLBACK_AS_PRIMARY"'"|g' morsaas-dev-config.yaml
fi

# Verify the changes
if diff morsaas-dev-config.yaml morsaas-dev-config.yaml.bak > /dev/null; then
  echo "❌ No changes were made to the development configuration."
else
  echo "✅ Development configuration updated successfully."
fi

# Clean up backup files
rm -f morsaas-service.yaml.bak morsaas-dev-config.yaml.bak

echo "Cloud Run configuration files have been updated."
echo "You can now review the changes and deploy the updated configurations." 