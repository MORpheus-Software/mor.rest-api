#!/bin/bash
set -e

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}       MorSaaS Upstash Redis Configuration        ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""

# Read the default Upstash URL from deployment script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="${SCRIPT_DIR}/deploy-to-cloud-run.sh"
DEFAULT_UPSTASH_URL=$(grep "UPSTASH_PRODUCTION_URL" "${DEPLOY_SCRIPT}" | cut -d'"' -f2)

echo -e "${BLUE}This script will configure your development environment to use Upstash Redis.${NC}"
echo -e "${BLUE}This ensures consistency between your local development and production environments.${NC}"
echo ""

# Choose configuration method
echo -e "${YELLOW}Please choose how to configure Upstash Redis:${NC}"
echo -e "1. Use production Upstash Redis URL (${DEFAULT_UPSTASH_URL})"
echo -e "2. Enter a custom Upstash Redis URL"
echo -ne "${YELLOW}Enter your choice (1-2): ${NC}"
read -r upstash_choice

UPSTASH_URL=""

case $upstash_choice in
  1)
    echo -e "${YELLOW}Using production Upstash Redis URL${NC}"
    UPSTASH_URL="${DEFAULT_UPSTASH_URL}"
    ;;
  2)
    echo -e "${YELLOW}Enter your custom Upstash Redis URL.${NC}"
    echo -e "${YELLOW}Format: redis://username:password@hostname:port${NC}"
    echo -ne "${YELLOW}URL: ${NC}"
    read -r custom_url
    if [ -z "$custom_url" ]; then
      echo -e "${RED}Error: Upstash URL cannot be empty. Using production URL as fallback.${NC}"
      UPSTASH_URL="${DEFAULT_UPSTASH_URL}"
    else
      UPSTASH_URL="$custom_url"
    fi
    ;;
  *)
    echo -e "${RED}Invalid choice. Using production Upstash Redis URL as default.${NC}"
    UPSTASH_URL="${DEFAULT_UPSTASH_URL}"
    ;;
esac

# Update .env file
ENV_FILE="../.env"
if [ -f "$ENV_FILE" ]; then
  # Check if REDIS_URL already exists and update it
  if grep -q "REDIS_URL=" "$ENV_FILE"; then
    sed -i '' "s|REDIS_URL=.*|REDIS_URL=${UPSTASH_URL}|g" "$ENV_FILE"
  else
    # If REDIS_URL doesn't exist, add it
    echo "REDIS_URL=${UPSTASH_URL}" >> "$ENV_FILE"
  fi
  echo -e "${GREEN}✓ Updated .env file with Upstash Redis URL${NC}"
else
  echo -e "${RED}Error: .env file not found. Creating a new one.${NC}"
  echo "REDIS_URL=${UPSTASH_URL}" > "$ENV_FILE"
  echo -e "${GREEN}✓ Created new .env file with Upstash Redis URL${NC}"
fi

# Update docker-compose.yml
DOCKER_COMPOSE_FILE="../docker-compose.yml"
if [ -f "$DOCKER_COMPOSE_FILE" ]; then
  # Use a more robust sed command that works with various formatting
  sed -i '' 's|- REDIS_URL=.*|- REDIS_URL='"${UPSTASH_URL}"'|g' "$DOCKER_COMPOSE_FILE"
  echo -e "${GREEN}✓ Updated docker-compose.yml with Upstash Redis URL${NC}"
else
  echo -e "${RED}Error: docker-compose.yml file not found.${NC}"
  echo -e "${YELLOW}Please manually set REDIS_URL in your docker-compose file.${NC}"
fi

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}     Upstash Redis Configuration Complete!        ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo -e "${BLUE}Your development environment is now set up to use Upstash Redis:${NC}"
echo -e "${BLUE}${UPSTASH_URL}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Restart your development server to apply the changes"
echo -e "2. Verify the connection by checking server logs for Redis connection success messages"
echo -e "3. Test your app to ensure data is correctly persisted"
echo "" 