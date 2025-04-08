#!/bin/bash
# Docker test script to verify environment variable escaping for sed commands

set -e  # Exit on error

echo "Starting Docker test for environment variable escaping..."

# Create a temporary directory for testing
mkdir -p docker-test/scripts

# Copy our escape script
cp scripts/escape-sed-value.sh docker-test/scripts/
echo "✅ Copied escape script to test directory"

# Create a test YAML file with placeholders
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
        - name: REACT_APP_AVAILABLE_MODELS
          value: REACT_APP_AVAILABLE_MODELS_VALUE
        - name: SECONDARY_ENDPOINT_URL
          value: SECONDARY_ENDPOINT_URL_VALUE
EOL
echo "✅ Created test YAML config file"

# Create a Docker test script
cat > docker-test/run-test.sh << 'EOL'
#!/bin/bash
set -e

echo "=== Testing environment variable escaping in Docker container ==="
echo "This mimics the GitHub Actions environment"
echo

# Make sure the script is executable
chmod +x ./scripts/escape-sed-value.sh

# Test with complex model string
echo "🧪 Test: Complex model string with special characters"
MODEL_STRING="mistralai/mistral-small-3.1-24b-instruct|Mistral Small 3.1 24B,deepseek/deepseek-r1-zero|Deepseek R1 Zero,meta-llama/llama-3.3-70b-instruct|Llama 3.3 70B"
ENDPOINT_URL="https://openrouter.ai/api/v1/chat/completions"

echo "Original model string: $MODEL_STRING"

# Use our escape script
ESCAPED_MODELS=$(./scripts/escape-sed-value.sh "$MODEL_STRING")
echo "Escaped model string: $ESCAPED_MODELS"

# Use sed to replace the placeholder
sed -i "s|REACT_APP_AVAILABLE_MODELS_VALUE|${ESCAPED_MODELS}|g" test-config.yaml
sed -i "s|SECONDARY_ENDPOINT_URL_VALUE|${ENDPOINT_URL}|g" test-config.yaml

echo "Result YAML:"
cat test-config.yaml

echo "✅ Test completed successfully!"
EOL

# Make the test script executable
chmod +x docker-test/run-test.sh
echo "✅ Created test script"

# Create a Dockerfile
cat > docker-test/Dockerfile << EOL
FROM ubuntu:20.04

# Set noninteractive mode for apt
ENV DEBIAN_FRONTEND=noninteractive

# Install necessary tools
RUN apt-get update && apt-get install -y bash sed grep && apt-get clean

# Set up the working directory
WORKDIR /app

# Copy files
COPY scripts/ /app/scripts/
COPY test-config.yaml /app/
COPY run-test.sh /app/

# Run the test
CMD ["bash", "./run-test.sh"]
EOL
echo "✅ Created Dockerfile"

# Build and run the Docker container
echo "🔄 Building Docker container..."
docker build -t env-escape-test docker-test/

echo "🚀 Running tests in Docker container..."
docker run --rm env-escape-test

# Clean up
echo "🧹 Cleaning up test files..."
rm -rf docker-test
echo "✅ Test completed" 