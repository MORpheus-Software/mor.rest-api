#!/bin/bash
# Script to safely escape a value for use in sed commands
# This ensures special characters like |, /, and & don't break sed substitution

# Get value from first argument
VALUE="$1"

# Escape special characters for sed
# Escape backslashes first, then other special characters
ESCAPED_VALUE=$(echo "$VALUE" | sed 's/\\/\\\\/g' | sed 's/|/\\|/g' | sed 's/\//\\\//g' | sed 's/&/\\&/g')

# Output the escaped value
echo "$ESCAPED_VALUE" 