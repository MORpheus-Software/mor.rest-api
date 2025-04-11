#!/bin/bash
# Script to simplify model names to avoid shell script errors with version numbers
# Usage: ./simplify-model-names.sh "mistralai/mistral-small-3.1-24b-instruct|Mistral Small 3.1 24B,deepseek/deepseek-r1-zero|Deepseek R1 Zero"

# Get value from first argument
MODEL_STRING="$1"

# Replace problematic versions with simplified names in the model IDs - remove all version numbers completely
SIMPLIFIED_MODELS=$(echo "$MODEL_STRING" | 
  sed 's/mistralai\/mistral-small-[0-9.]*-[0-9]*b-instruct/mistral-small/g' | 
  sed 's/deepseek\/deepseek-r[0-9]-zero/deepseek-zero/g' | 
  sed 's/meta-llama\/llama-[0-9.]*-[0-9]*b-instruct/llama-model/g')

# Remove ALL version numbers and sizes from the display names (after the |)
SIMPLIFIED_MODELS=$(echo "$SIMPLIFIED_MODELS" | 
  sed 's/|Mistral Small [0-9.]* [0-9]*B/|Mistral Small/g' | 
  sed 's/|Deepseek R[0-9] Zero/|Deepseek Zero/g' | 
  sed 's/|Llama [0-9.]* [0-9]*B/|Llama Model/g')

# Additional cleanup to catch any remaining version numbers anywhere in the string
SIMPLIFIED_MODELS=$(echo "$SIMPLIFIED_MODELS" | 
  sed 's/[0-9]\+\.[0-9]\+//g' |  # Remove any remaining decimal numbers like 3.1
  sed 's/[0-9]\+B//g' |          # Remove any remaining size indicators like 24B
  sed 's/-[0-9]\+-/-/g')         # Replace patterns like -24- with just -

# Output the simplified value
echo "$SIMPLIFIED_MODELS" 