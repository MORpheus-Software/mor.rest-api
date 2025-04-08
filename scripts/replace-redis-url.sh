#!/bin/bash
# Script to safely replace Redis URL in YAML file

# Get arguments
YAML_FILE=$1
REDIS_URL=$2

if [[ -z "$YAML_FILE" || -z "$REDIS_URL" ]]; then
  echo "Usage: $0 <yaml_file> <redis_url>"
  exit 1
fi

# Create a temporary file for the replacement
TEMP_FILE=$(mktemp)

# Read the YAML file line by line
while IFS= read -r line; do
  if [[ "$line" == *"YOUR_REDIS_URL"* ]]; then
    # This is the Redis URL line, replace it with the actual URL
    echo "          value: $REDIS_URL" >> "$TEMP_FILE"
  else
    # Pass through all other lines unchanged
    echo "$line" >> "$TEMP_FILE"
  fi
done < "$YAML_FILE"

# Replace the original file with the modified one
mv "$TEMP_FILE" "$YAML_FILE"

echo "Redis URL successfully updated in $YAML_FILE" 