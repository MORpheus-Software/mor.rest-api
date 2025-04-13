#!/bin/bash

# Script to set GitHub repository variables from .env file

# Set repository name - update this to your actual repository
REPO="scottterry/morsaas"

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

# Extract variables from .env file if it exists
if [ -f .env ]; then
    echo "Found .env file, extracting variables..."
    SECONDARY_URL=$(grep -v "^#" .env | grep "SECONDARY_ENDPOINT_URL" | cut -d '=' -f2)
    CONSUMER_URL=$(grep -v "^#" .env | grep "CONSUMER_API_URL" | cut -d '=' -f2)
    USE_FALLBACK=$(grep -v "^#" .env | grep "USE_FALLBACK_AS_PRIMARY" | cut -d '=' -f2)
    AVAILABLE_MODELS=$(grep -v "^#" .env | grep "REACT_APP_AVAILABLE_MODELS" | cut -d '=' -f2)
    
    # Trim whitespace
    SECONDARY_URL=$(echo "$SECONDARY_URL" | xargs)
    CONSUMER_URL=$(echo "$CONSUMER_URL" | xargs)
    USE_FALLBACK=$(echo "$USE_FALLBACK" | xargs)
    AVAILABLE_MODELS=$(echo "$AVAILABLE_MODELS" | xargs)
    
    echo "Found variables in .env:"
    echo "SECONDARY_ENDPOINT_URL: $SECONDARY_URL"
    echo "CONSUMER_API_URL: $CONSUMER_URL"
    echo "USE_FALLBACK_AS_PRIMARY: $USE_FALLBACK"
    echo "AVAILABLE_MODELS: $AVAILABLE_MODELS"
else
    echo "No .env file found, using default values..."
    # Set default values
    AVAILABLE_MODELS="mistralai/mistral-small-3.1-24b-instruct|Mistral Small 3.1 24B,deepseek/deepseek-r1-zero|Deepseek R1 Zero,meta-llama/llama-3.3-70b-instruct|Llama 3.3 70B"
fi

# Set the variables for all environments
for ENV in DEV STAGING PROD; do
    echo -e "\nSetting variables for ${ENV} environment..."
    
    # Set available models list
    if gh variable set "${ENV}_AVAILABLE_MODELS" -b "$AVAILABLE_MODELS" -R "$REPO"; then
        echo "✅ Set ${ENV}_AVAILABLE_MODELS to $AVAILABLE_MODELS"
    else
        echo "❌ Failed to set ${ENV}_AVAILABLE_MODELS"
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
    
    # Set OpenRouter HTTP referer and app info based on environment
    if [ "$ENV" == "PROD" ]; then
        if gh variable set "${ENV}_OPENROUTER_HTTP_REFERER" -b "https://morsaas.com" -R "$REPO"; then
            echo "✅ Set ${ENV}_OPENROUTER_HTTP_REFERER to 'https://morsaas.com'"
        else
            echo "❌ Failed to set ${ENV}_OPENROUTER_HTTP_REFERER"
        fi
        
        if gh variable set "${ENV}_OPENROUTER_APP_TITLE" -b "MorSaaS" -R "$REPO"; then
            echo "✅ Set ${ENV}_OPENROUTER_APP_TITLE to 'MorSaaS'"
        else
            echo "❌ Failed to set ${ENV}_OPENROUTER_APP_TITLE"
        fi
        
        if gh variable set "${ENV}_OPENROUTER_APP_VERSION" -b "1.0.0" -R "$REPO"; then
            echo "✅ Set ${ENV}_OPENROUTER_APP_VERSION to '1.0.0'"
        else
            echo "❌ Failed to set ${ENV}_OPENROUTER_APP_VERSION"
        fi
    elif [ "$ENV" == "STAGING" ]; then
        if gh variable set "${ENV}_OPENROUTER_HTTP_REFERER" -b "https://staging.morsaas.com" -R "$REPO"; then
            echo "✅ Set ${ENV}_OPENROUTER_HTTP_REFERER to 'https://staging.morsaas.com'"
        else
            echo "❌ Failed to set ${ENV}_OPENROUTER_HTTP_REFERER"
        fi
        
        if gh variable set "${ENV}_OPENROUTER_APP_TITLE" -b "MorSaaS-Staging" -R "$REPO"; then
            echo "✅ Set ${ENV}_OPENROUTER_APP_TITLE to 'MorSaaS-Staging'"
        else
            echo "❌ Failed to set ${ENV}_OPENROUTER_APP_TITLE"
        fi
        
        if gh variable set "${ENV}_OPENROUTER_APP_VERSION" -b "1.0.0-staging" -R "$REPO"; then
            echo "✅ Set ${ENV}_OPENROUTER_APP_VERSION to '1.0.0-staging'"
        else
            echo "❌ Failed to set ${ENV}_OPENROUTER_APP_VERSION"
        fi
    else
        if gh variable set "${ENV}_OPENROUTER_HTTP_REFERER" -b "https://dev.morsaas.com" -R "$REPO"; then
            echo "✅ Set ${ENV}_OPENROUTER_HTTP_REFERER to 'https://dev.morsaas.com'"
        else
            echo "❌ Failed to set ${ENV}_OPENROUTER_HTTP_REFERER"
        fi
        
        if gh variable set "${ENV}_OPENROUTER_APP_TITLE" -b "MorSaaS-Dev" -R "$REPO"; then
            echo "✅ Set ${ENV}_OPENROUTER_APP_TITLE to 'MorSaaS-Dev'"
        else
            echo "❌ Failed to set ${ENV}_OPENROUTER_APP_TITLE"
        fi
        
        if gh variable set "${ENV}_OPENROUTER_APP_VERSION" -b "1.0.0-dev" -R "$REPO"; then
            echo "✅ Set ${ENV}_OPENROUTER_APP_VERSION to '1.0.0-dev'"
        else
            echo "❌ Failed to set ${ENV}_OPENROUTER_APP_VERSION"
        fi
    fi
done

# Verify that the variables were set correctly
echo -e "\nVerifying variables were set correctly..."
for ENV in DEV STAGING PROD; do
    echo -e "\n${ENV} Environment Variables:"
    gh variable list -R "$REPO" | grep "^${ENV}_"
done

echo -e "\nRepository variables have been set successfully!"
echo "Note: The OpenRouter API key should be stored in Google Cloud Secret Manager as 'openai-api-key'" 