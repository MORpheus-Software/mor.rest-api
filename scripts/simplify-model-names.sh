#!/bin/bash
# Script to simplify model names to avoid shell script errors with version numbers
# Usage: ./simplify-model-names.sh "mistralai/mistral-small-3.1-24b-instruct|Mistral Small 3.1 24B,deepseek/deepseek-r1-zero|Deepseek R1 Zero"

# Get value from first argument
MODEL_STRING="$1"

# Replace problematic versions with simplified names
SIMPLIFIED_MODELS=$(echo "$MODEL_STRING" | sed 's/mistralai\/mistral-small-[0-9.]*-[0-9]*b-instruct/mistral-small/g' | sed 's/deepseek\/deepseek-r[0-9]-zero/deepseek-zero/g' | sed 's/meta-llama\/llama-[0-9.]*-[0-9]*b-instruct/llama-model/g')

# Output the simplified value
echo "$SIMPLIFIED_MODELS" 