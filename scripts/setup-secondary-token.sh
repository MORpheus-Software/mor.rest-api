#!/bin/bash
# Script to add secondary endpoint token to Google Cloud Secret Manager
# This ensures the token is available for the morsaas service in Cloud Run

# Set default project ID
PROJECT_ID=$(gcloud config get-value project)

if [ -z "$PROJECT_ID" ]; then
  echo "No default project set. Please run 'gcloud config set project YOUR_PROJECT_ID' first."
  exit 1
fi

# Check if token is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <secondary-endpoint-token>"
  echo "Please provide your secondary endpoint token as an argument."
  exit 1
fi

TOKEN="$1"

echo "Using project: $PROJECT_ID"
echo "Adding secondary endpoint token to Secret Manager..."

# Check if the secret already exists
if gcloud secrets describe secondary-endpoint-token --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Secret 'secondary-endpoint-token' already exists. Adding a new version..."
  echo -n "$TOKEN" | gcloud secrets versions add secondary-endpoint-token --data-file=- --project="$PROJECT_ID"
else
  echo "Creating new secret 'secondary-endpoint-token'..."
  echo -n "$TOKEN" | gcloud secrets create secondary-endpoint-token --data-file=- --project="$PROJECT_ID"
fi

# Grant the Cloud Run service account access to the secret
SERVICE_ACCOUNT="101868473812-compute@developer.gserviceaccount.com"
echo "Granting access to service account: $SERVICE_ACCOUNT"

gcloud secrets add-iam-policy-binding secondary-endpoint-token \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor" \
  --project="$PROJECT_ID"

echo "✅ Secret 'secondary-endpoint-token' has been configured successfully!"
echo "This secret is now available for the morsaas service in Cloud Run."
echo "The deployment will automatically reference this secret using the secretKeyRef configuration." 