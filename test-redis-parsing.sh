#!/bin/bash

# Test cases for Redis URLs
TEST_URLS=(
  "redis://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379"
  "rediss://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379"
  "rediss://default:complex/password+with@special:chars@some-host.upstash.io:6379"
)

echo "Testing Redis URL parsing logic from GitHub Actions workflow"
echo "============================================================"

for REDIS_URL in "${TEST_URLS[@]}"; do
  echo ""
  echo "Testing URL: ${REDIS_URL/default:*@/default:[PASSWORD_HIDDEN]@}"
  
  # Extract Redis credentials for alternative formats
  if [[ "${REDIS_URL}" == redis://* || "${REDIS_URL}" == rediss://* ]]; then
    # Store the full URL for parsing
    FULL_URL="$REDIS_URL"
    
    # First, remove the protocol part (redis:// or rediss://)
    URL_WITHOUT_PROTOCOL=${FULL_URL#*//}
    
    # Find the position of the last @ character - this separates credentials from hostname
    AT_POS=$(echo "$URL_WITHOUT_PROTOCOL" | rev | awk -F '@' '{print length($0) - length($1)}' | rev)
    
    if [[ $AT_POS -gt 0 ]]; then
      # Extract username:password part (everything before the last @)
      CREDENTIALS=${URL_WITHOUT_PROTOCOL:0:$AT_POS}
      
      # Extract host:port part (everything after the last @)
      SERVER_PART=${URL_WITHOUT_PROTOCOL:$AT_POS+1}
      
      # Extract hostname (everything up to the colon before port)
      REDIS_HOST=${SERVER_PART%%:*}
      
      # Extract password (everything after 'default:' in the credentials)
      if [[ "$CREDENTIALS" == default:* ]]; then
        REDIS_PASSWORD=${CREDENTIALS#default:}
      else
        REDIS_PASSWORD=$CREDENTIALS
      fi
      
      echo "✅ URL format check: Valid Redis URL format"
      echo "Extracted Redis host: ${REDIS_HOST}"
      echo "Extracted Redis password length: ${#REDIS_PASSWORD} characters"
      
      echo "Testing sed command for template substitution:"
      
      # Try with sed (original double-quotes preserved for variable expansion)
      echo "REDIS_PASSWORD_ONLY" > test-template.txt
      OUTPUT=$(sed "s|REDIS_PASSWORD_ONLY|${REDIS_PASSWORD}|g" test-template.txt)
      echo "Password substitution result: $OUTPUT"
      
      echo "REDIS_HOSTNAME_ONLY" > test-template.txt
      OUTPUT=$(sed "s|REDIS_HOSTNAME_ONLY|${REDIS_HOST}|g" test-template.txt)
      echo "Hostname substitution result: $OUTPUT"
      
      rm test-template.txt
    else
      echo "❌ URL format check: Could not find @ separator in Redis URL"
    fi
  else
    echo "❌ URL format check: Invalid Redis URL format"
  fi
done

echo ""
echo "All tests completed!" 