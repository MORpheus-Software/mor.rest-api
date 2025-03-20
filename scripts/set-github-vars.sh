#!/bin/bash

# Script to set GitHub repository variables from .env file

# Set repository name
REPO="srt0422/api-token-navigator"

# Check if GitHub CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI is not installed. Please install it first."
    exit 1
fi

# Extract variables from .env file
MODEL_NAME=$(grep -v "^#" .env | grep "REACT_APP_DEFAULT_MODEL_NAME" | cut -d '=' -f2)
MODEL_ID=$(grep -v "^#" .env | grep "REACT_APP_DEFAULT_MODEL_ID" | cut -d '=' -f2)

# Trim whitespace
MODEL_NAME=$(echo "$MODEL_NAME" | xargs)
MODEL_ID=$(echo "$MODEL_ID" | xargs)

echo "Found variables in .env:"
echo "MODEL_NAME: $MODEL_NAME"
echo "MODEL_ID: $MODEL_ID"

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
done

echo "Repository variables have been set successfully!" 