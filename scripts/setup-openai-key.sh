#!/bin/bash
# Script to add OpenAI API key to Google Cloud Secret Manager
# This ensures the secret is available for the morsaas service in Cloud Run

# Set default project ID
PROJECT_ID=$(gcloud config get-value project)

if [ -z "$PROJECT_ID" ]; then
  echo "No default project set. Please run 'gcloud config set project YOUR_PROJECT_ID' first."
  exit 1
fi

# Check if OpenAI API key is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <openai-api-key>"
  echo "Please provide your OpenAI API key as an argument."
  exit 1
fi

OPENAI_API_KEY="$1"

echo "Using project: $PROJECT_ID"
echo "Adding OpenAI API key to Secret Manager..."

# Check if the secret already exists
if gcloud secrets describe openai-api-key --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Secret 'openai-api-key' already exists. Adding a new version..."
  echo -n "$OPENAI_API_KEY" | gcloud secrets versions add openai-api-key --data-file=- --project="$PROJECT_ID"
else
  echo "Creating new secret 'openai-api-key'..."
  echo -n "$OPENAI_API_KEY" | gcloud secrets create openai-api-key --data-file=- --project="$PROJECT_ID"
fi

# Grant the Cloud Run service account access to the secret
SERVICE_ACCOUNT="101868473812-compute@developer.gserviceaccount.com"
echo "Granting access to service account: $SERVICE_ACCOUNT"

gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor" \
  --project="$PROJECT_ID"

echo "✅ Secret 'openai-api-key' has been configured successfully!"
echo "This secret is now available for the morsaas service in Cloud Run."
echo "The deployment will automatically reference this secret using the secretKeyRef configuration." 