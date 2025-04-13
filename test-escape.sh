#!/bin/bash
# Test script for escaping special characters for sed

# Test values
TEST_VALUES=(
  "mistralai/mistral-small-3.1-24b-instruct|Mistral Small 3.1 24B"
  "deepseek/deepseek-r1-zero|Deepseek R1 Zero,meta-llama/llama-3.3-70b-instruct|Llama 3.3 70B"
  "http://example.com/path?param=value&other=value2"
  "path/with/slashes/and|pipes/and&ampersands"
)

# Function to escape values for sed
escape_for_sed() {
  # Escape backslashes first, then other special characters
  echo "$1" | sed 's/\\/\\\\/g' | sed 's/|/\\|/g' | sed 's/\//\\\//g' | sed 's/&/\\&/g'
}

echo "Testing string escaping for sed commands:"
echo "----------------------------------------"

for val in "${TEST_VALUES[@]}"; do
  echo "Original: $val"
  escaped=$(escape_for_sed "$val")
  echo "Escaped:  $escaped"
  
  # Create test files for sed substitution
  echo "PLACEHOLDER" > test_original.txt
  sed "s|PLACEHOLDER|$escaped|g" test_original.txt > test_result.txt
  
  echo "Result:   $(cat test_result.txt)"
  echo "----------------------------------------"
done

# Clean up
rm -f test_original.txt test_result.txt

echo "All tests completed successfully!" 