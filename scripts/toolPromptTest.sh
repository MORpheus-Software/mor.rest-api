#!/bin/bash

# Test OpenRouter API for tool calling capabilities
MODEL_NAME="${1:-anthropic/claude-3-opus-20240229}"

echo "Testing model: $MODEL_NAME"

curl https://nfa-proxy-101868473812.us-west1.run.app/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "HTTP-Referer: https://morsaas.com" \
  -H "X-Title: MorSaaS" \
  -H "User-Agent: MorSaaS/1.0.0" \
  -H "Accept: text/event-stream" \
  -d "{
  \"model\": \"$MODEL_NAME\",
  \"messages\": [
    {\"role\": \"system\", \"content\": \"You are a helpful assistant with access to tools.\"},
    {\"role\": \"user\", \"content\": \"What is the weather in San Francisco right now?\"}
  ],
  \"tools\": [
    {
      \"type\": \"function\",
      \"function\": {
        \"name\": \"get_weather\",
        \"description\": \"Get the current weather in a given location\",
        \"parameters\": {
          \"type\": \"object\",
          \"properties\": {
            \"location\": {
              \"type\": \"string\",
              \"description\": \"The city and state, e.g. San Francisco, CA\"
            },
            \"unit\": {
              \"type\": \"string\",
              \"enum\": [\"celsius\", \"fahrenheit\"],
              \"description\": \"The temperature unit to use\"
            }
          },
          \"required\": [\"location\"]
        }
      }
    }
  ],
  \"tool_choice\": \"auto\",
  \"stream\": true
}"

# Note: The "Accept: text/event-stream" header is required for streaming responses

# If you want to see streaming response, add:
# "stream": true,
# to the JSON payload and add:
# -H "Accept: text/event-stream" \
# to the headers 