#!/bin/bash

# Test cases for Redis URLs
TEST_URLS=(
  "redis://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379"
  "rediss://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379"
  "rediss://default:complex/password+with@special:chars@some-host.upstash.io:6379"
)

echo "Testing Redis URL parsing - Final Version"
echo "========================================="

function parse_redis_url() {
  local url="$1"
  
  # Check if URL starts with redis:// or rediss://
  if [[ "$url" =~ ^redis(s)?:// ]]; then
    # Extract just the hostname using grep and perl regex
    local host_part=$(echo "$url" | perl -ne 'print "$1" if /(\w+[.-]\w+\.\w+):\d+$/')
    
    # Find the last @ in the URL to extract everything up to it
    local auth_part=$(echo "$url" | perl -ne 'print "$1" if /^redis(?:s)?:\/\/(.*)@/')
    
    # Extract password (everything after default:)
    local password=${auth_part#default:}
    
    echo "Host: $host_part"
    echo "Password: ${password:0:6}...${password: -6} (${#password} chars)"
    
    # Test that sed command works
    echo "Testing sed command:"
    echo "REDIS_PASSWORD" | sed "s|REDIS_PASSWORD|$password|g"
    echo "REDIS_HOST" | sed "s|REDIS_HOST|$host_part|g"
  else
    echo "Invalid Redis URL format"
  fi
}

for url in "${TEST_URLS[@]}"; do
  echo
  echo "Parsing URL: ${url/default:*@/default:***@}"
  parse_redis_url "$url"
  echo "------------------------------------------------"
done 