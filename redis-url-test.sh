#!/bin/bash
# Test script focusing specifically on Redis URL extraction

set -e  # Exit on error

# Test Redis URLs
TEST_URLS=(
  "redis://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379"
  "rediss://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379"
  "rediss://default:complex/password+with@special:chars@some-host.upstash.io:6379"
)

echo "Testing Redis URL extraction with different approaches"
echo "===================================================="

for REDIS_URL in "${TEST_URLS[@]}"; do
  echo
  echo "Testing URL: ${REDIS_URL/default:*@/default:***@}"
  
  # Create a test template file
  echo "REDIS_URL_PLACEHOLDER" > test-template.txt
  
  echo "1. Testing awk substitution approach"
  awk -v redis_url="${REDIS_URL}" '{gsub(/REDIS_URL_PLACEHOLDER/, redis_url); print}' test-template.txt
  
  echo "2. Testing Perl regex extraction"
  # Extract hostname using Perl
  REDIS_HOST=$(echo "${REDIS_URL}" | perl -ne 'print "$1" if /(\w+[.-]\w+\.\w+):\d+$/')
  echo "Extracted host: ${REDIS_HOST}"
  
  # Extract auth part using Perl
  AUTH_PART=$(echo "${REDIS_URL}" | perl -ne 'print "$1" if /^redis(?:s)?:\/\/(.*)@/')
  echo "Extracted auth part: ${AUTH_PART}"
  
  # Extract password
  REDIS_PASSWORD=${AUTH_PART#default:}
  echo "Extracted password: ${REDIS_PASSWORD:0:5}...${REDIS_PASSWORD: -5} (${#REDIS_PASSWORD} chars)"
  
  echo "3. Testing credential substitution"
  echo "REDIS_PASSWORD_ONLY" > test-pw.txt
  echo "REDIS_HOST_ONLY" > test-host.txt
  
  # Test if these work with special characters
  awk -v pass="${REDIS_PASSWORD}" '{gsub(/REDIS_PASSWORD_ONLY/, pass); print}' test-pw.txt
  awk -v host="${REDIS_HOST}" '{gsub(/REDIS_HOST_ONLY/, host); print}' test-host.txt
  
  echo "----------------------------------------------------"
done

rm -f test-template.txt test-pw.txt test-host.txt
echo "All tests completed" 