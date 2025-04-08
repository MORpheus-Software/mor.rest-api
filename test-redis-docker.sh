#!/bin/bash
# Test Redis URL handling in a Docker container to mimic GitHub Actions environment

set -e  # Exit on error

echo "Starting Docker test for Redis URL handling..."

# Create a temporary directory for testing
mkdir -p docker-test/scripts

# Copy our replacement script
cp scripts/replace-redis-url.sh docker-test/scripts/
echo "✅ Copied Redis replacement script to test directory"

# Create a test YAML file with the Redis URL placeholder
cat > docker-test/test-config.yaml << EOL
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: morsaas-test
  namespace: default
spec:
  template:
    spec:
      containers:
      - env:
        - name: REDIS_URL
          value: YOUR_REDIS_URL
EOL
echo "✅ Created test YAML config file"

# Create a Docker test script
cat > docker-test/run-test.sh << 'EOL'
#!/bin/sh
set -e

echo "=== Starting Redis URL replacement tests in Docker container ==="
echo "This mimics the GitHub Actions environment"
echo

# Make sure the script is executable
chmod +x ./scripts/replace-redis-url.sh

# Test with a simple Redis URL
echo "🧪 Test 1: Simple Redis URL"
cp test-config.yaml test-config-original.yaml
./scripts/replace-redis-url.sh test-config.yaml "redis://localhost:6379"
echo "Result:"
cat test-config.yaml
echo "------------------------"

# Reset the test file
cp test-config-original.yaml test-config.yaml

# Test with a complex Upstash Redis URL with special characters
echo "🧪 Test 2: Complex Upstash Redis URL with special characters"
./scripts/replace-redis-url.sh test-config.yaml "rediss://default:AbexAAIjcDE1M2Q4MWMxZTU5N2Q0MzEzYjQ0ZmM0NjIzZGUyYjQxMXAxMA@learning-goblin-47025.upstash.io:6379"
echo "Result:"
cat test-config.yaml
echo "------------------------"

# Reset the test file
cp test-config-original.yaml test-config.yaml

# Test with a Redis URL containing even more special characters
echo "🧪 Test 3: Redis URL with more special characters"
./scripts/replace-redis-url.sh test-config.yaml "rediss://default:complex/password+with@special:chars@some-host.upstash.io:6379"
echo "Result:"
cat test-config.yaml
echo "------------------------"

echo "✅ All tests completed successfully!"
EOL

# Make the test script executable
chmod +x docker-test/run-test.sh
echo "✅ Created test script"

# Create a Dockerfile with a smaller image
cat > docker-test/Dockerfile << EOL
FROM alpine:3.18

# Install necessary tools
RUN apk add --no-cache bash sed grep

# Set up the working directory
WORKDIR /app

# Copy files
COPY scripts/ /app/scripts/
COPY test-config.yaml /app/test-config-original.yaml
COPY test-config.yaml /app/test-config.yaml
COPY run-test.sh /app/

# Run the test
CMD ["bash", "./run-test.sh"]
EOL
echo "✅ Created Dockerfile"

# Build and run the Docker container
echo "🔄 Building Docker container..."
docker build -t redis-url-test docker-test/

echo "🚀 Running tests in Docker container..."
docker run --rm redis-url-test

# Clean up
echo "🧹 Cleaning up test files..."
rm -rf docker-test
echo "✅ Test completed" 