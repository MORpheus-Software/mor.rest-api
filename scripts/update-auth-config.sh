#!/bin/bash
set -e

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration Variables
REGION="us-west1"  # Change this to your preferred region
SERVICES=("morsaas-dev" "morsaas-staging")

# Function to display a section header
section() {
  echo ""
  echo -e "${BLUE}=== $1 ===${NC}"
  echo ""
}

# Check for required tools
section "Checking Requirements"
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}Error: Google Cloud SDK (gcloud) is not installed.${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Google Cloud SDK is installed${NC}"
fi

# Process each service using both methods for better chances of success
for SERVICE_NAME in "${SERVICES[@]}"; do
  section "Updating authentication settings for ${SERVICE_NAME}"
  
  # Method 1: Add IAM policy binding to allow allUsers
  echo -e "${YELLOW}Method 1: Adding IAM policy binding for ${SERVICE_NAME}...${NC}"
  if gcloud run services add-iam-policy-binding ${SERVICE_NAME} \
      --region=${REGION} \
      --member="allUsers" \
      --role="roles/run.invoker"; then
    echo -e "${GREEN}✓ IAM policy binding added successfully${NC}"
  else
    echo -e "${RED}Failed to add IAM policy binding${NC}"
  fi
  
  # Method 2: Set the --allow-unauthenticated flag
  echo -e "${YELLOW}Method 2: Updating service with --allow-unauthenticated flag...${NC}"
  if gcloud run services update ${SERVICE_NAME} \
      --region=${REGION} \
      --no-invoker-iam-check; then
    echo -e "${GREEN}✓ Service updated to disable invoker IAM check${NC}"
  else
    echo -e "${RED}Failed to update service IAM check settings${NC}"
  fi
done

section "All services updated"
echo -e "${GREEN}The authentication settings have been updated to allow unauthenticated access.${NC}"
echo -e "${YELLOW}Note: It may take a few minutes for the changes to propagate.${NC}"
