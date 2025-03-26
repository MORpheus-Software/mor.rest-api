#!/bin/bash

# Script to set GitHub repository variables from .env file

# Set repository name
REPO="srt0422/api-token-navigator"

# Check if GitHub CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI is not installed. Please install it first."
    exit 1
fi

# Test if authenticated
gh auth status >/dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Not authenticated with GitHub. Please run 'gh auth login' first."
  exit 1
fi

# Extract variables from .env file
MODEL_NAME=$(grep -v "^#" .env | grep "REACT_APP_DEFAULT_MODEL_NAME" | cut -d '=' -f2)
MODEL_ID=$(grep -v "^#" .env | grep "REACT_APP_DEFAULT_MODEL_ID" | cut -d '=' -f2)
SECONDARY_URL=$(grep -v "^#" .env | grep "SECONDARY_ENDPOINT_URL" | cut -d '=' -f2)
CONSUMER_URL=$(grep -v "^#" .env | grep "CONSUMER_API_URL" | cut -d '=' -f2)
USE_FALLBACK=$(grep -v "^#" .env | grep "USE_FALLBACK_AS_PRIMARY" | cut -d '=' -f2)

# Trim whitespace
MODEL_NAME=$(echo "$MODEL_NAME" | xargs)
MODEL_ID=$(echo "$MODEL_ID" | xargs)
SECONDARY_URL=$(echo "$SECONDARY_URL" | xargs)
CONSUMER_URL=$(echo "$CONSUMER_URL" | xargs)
USE_FALLBACK=$(echo "$USE_FALLBACK" | xargs)

# Set default value if not found
if [ -z "$USE_FALLBACK" ]; then
    USE_FALLBACK="false"
fi

echo "Found variables in .env:"
echo "MODEL_NAME: $MODEL_NAME"
echo "MODEL_ID: $MODEL_ID"
echo "SECONDARY_ENDPOINT_URL: $SECONDARY_URL"
echo "CONSUMER_API_URL: $CONSUMER_URL"
echo "USE_FALLBACK_AS_PRIMARY: $USE_FALLBACK"

# Set the variables for all environments
for ENV in DEV STAGING PROD; do
    # Set model name
    if gh variable set "${ENV}_MODEL_NAME" -b "$MODEL_NAME" -R "$REPO"; then
        echo "✅ Set ${ENV}_MODEL_NAME to $MODEL_NAME"
    else
        echo "❌ Failed to set ${ENV}_MODEL_NAME"
    fi
    
    # Set model ID
    if gh variable set "${ENV}_MODEL_ID" -b "$MODEL_ID" -R "$REPO"; then
        echo "✅ Set ${ENV}_MODEL_ID to $MODEL_ID"
    else
        echo "❌ Failed to set ${ENV}_MODEL_ID"
    fi
    
    # Set secondary endpoint URL
    if gh variable set "${ENV}_SECONDARY_ENDPOINT_URL" -b "$SECONDARY_URL" -R "$REPO"; then
        echo "✅ Set ${ENV}_SECONDARY_ENDPOINT_URL to $SECONDARY_URL"
    else
        echo "❌ Failed to set ${ENV}_SECONDARY_ENDPOINT_URL"
    fi
    
    # Set consumer API URL
    if gh variable set "${ENV}_CONSUMER_API_URL" -b "$CONSUMER_URL" -R "$REPO"; then
        echo "✅ Set ${ENV}_CONSUMER_API_URL to $CONSUMER_URL"
    else
        echo "❌ Failed to set ${ENV}_CONSUMER_API_URL"
    fi
    
    # Set USE_FALLBACK_AS_PRIMARY
    if gh variable set "${ENV}_USE_FALLBACK_AS_PRIMARY" -b "$USE_FALLBACK" -R "$REPO"; then
        echo "✅ Set ${ENV}_USE_FALLBACK_AS_PRIMARY to $USE_FALLBACK"
    else
        echo "❌ Failed to set ${ENV}_USE_FALLBACK_AS_PRIMARY"
    fi
done

# Set the OpenRouter-specific variables for each environment
for ENV in DEV STAGING PROD; do
    # Set OpenRouter endpoint URL for all environments
    gh variable set "${ENV}_SECONDARY_ENDPOINT_URL" -b "https://openrouter.ai/api/" -R "$REPO"
    echo "✅ Set ${ENV}_SECONDARY_ENDPOINT_URL to 'https://openrouter.ai/api/'"
    
    # Set the token key reference
    gh variable set "${ENV}_SECONDARY_ENDPOINT_TOKEN_KEY" -b "openai-api-key" -R "$REPO"
    echo "✅ Set ${ENV}_SECONDARY_ENDPOINT_TOKEN_KEY to 'openai-api-key'"
    
    # Set OpenRouter HTTP referer
    if [ "$ENV" == "PROD" ]; then
        gh variable set "${ENV}_OPENROUTER_HTTP_REFERER" -b "https://morsaas.com" -R "$REPO"
        gh variable set "${ENV}_OPENROUTER_APP_TITLE" -b "MorSaaS" -R "$REPO"
        gh variable set "${ENV}_OPENROUTER_APP_VERSION" -b "1.0.0" -R "$REPO"
    elif [ "$ENV" == "STAGING" ]; then
        gh variable set "${ENV}_OPENROUTER_HTTP_REFERER" -b "https://staging.morsaas.com" -R "$REPO"
        gh variable set "${ENV}_OPENROUTER_APP_TITLE" -b "MorSaaS-Staging" -R "$REPO"
        gh variable set "${ENV}_OPENROUTER_APP_VERSION" -b "1.0.0-staging" -R "$REPO"
    else
        gh variable set "${ENV}_OPENROUTER_HTTP_REFERER" -b "https://dev.morsaas.com" -R "$REPO"
        gh variable set "${ENV}_OPENROUTER_APP_TITLE" -b "MorSaaS-Dev" -R "$REPO"
        gh variable set "${ENV}_OPENROUTER_APP_VERSION" -b "1.0.0-dev" -R "$REPO"
    fi
    echo "✅ Set ${ENV}_OPENROUTER_HTTP_REFERER, ${ENV}_OPENROUTER_APP_TITLE, and ${ENV}_OPENROUTER_APP_VERSION"
done

# Verify that the variables were set correctly
echo -e "\nVerifying variables were set correctly..."
for ENV in DEV STAGING PROD; do
    echo -e "\n${ENV} Environment Variables:"
    gh variable list -R "$REPO" | grep "^${ENV}_"
done

echo -e "\nRepository variables have been set successfully!"
echo "Note: The OpenRouter API key should be stored in Google Cloud Secret Manager as 'openai-api-key'" 