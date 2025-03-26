#!/bin/bash

# Script to test tool calls with various models
echo "Testing tool calls with multiple models..."

# Create a temporary file for the models list
MODELS_FILE=$(mktemp)

# Add all the model names to the temporary file
cat > "$MODELS_FILE" << 'EOL'
Hermes-3-Llama-3.1-8B
Hermes-2-Theta-Llama-3-8B
Prodia-Image-SD
Prodia-Image-SDX
TinyLLama
Qwen2.5-Coder-32B
Qwen2.5-Coder-32B
Llama 2.0
Llama 3.1 - 8B
Llama 2.0
Llama 2.0
ARCX Tinyllama
Hermes-3-Llama-3.1-8B(2)
Llama-3.1-8B
Llama 3.2 3B Instruct
Hermes 2 Pro Llama 3 Instruct
NousResearch/Hermes-2-Theta-Llama-3-8B
cognitivecomputations/dolphin-2.9.2-qwen2-72b
meta-llama/Llama-3.2-3B-Instruct
nvidia/Llama-3.1-Nemotron-70B-Instruct-HF
mlabonne/Hermes-3-Llama-3.1-8B-lorablated
Qwen/Qwen2.5-Coder-32B-Instruct
Llama-3.1-405B
Hermes-3-Llama-3.1-8B(2)
Akash Test
CYGNUS Llama 2.0
OpenAI-GPT-4o
Prodia-Mochi-Video
ClaudeAI-Sonnet
Hyperbolic-SD
DeepSeek-R1-Distill-Llama-70B
DeepSeek-V3
itrl-meta-llama-3-3-70b-instruct-awq-int4-1tp-1pp
nrlmgc-deepseek-r1-distill-llama-70b-w4a16-1tp-1pp
nrlmgc-deepseek-r1-distill-qwen-32b-w4a16-1tp-1pp
qwen-qwen2-5-coder-32b-instruct-gptq-int4-1tp-1pp
EOL

# Directory to store results
RESULTS_DIR="model_test_results"
mkdir -p "$RESULTS_DIR"

# Log file for the test run
LOG_FILE="$RESULTS_DIR/test_run_$(date +%Y%m%d_%H%M%S).log"
echo "Starting test run at $(date)" > "$LOG_FILE"

# Process each model
while IFS= read -r model_name; do
  echo "-------------------------" | tee -a "$LOG_FILE"
  echo "Testing model: $model_name" | tee -a "$LOG_FILE"
  
  # Create a filename-safe version of the model name
  safe_name=$(echo "$model_name" | tr '/' '_' | tr ' ' '_')
  
  # Run the test and capture output
  output_file="$RESULTS_DIR/${safe_name}_$(date +%Y%m%d_%H%M%S).json"
  
  # Run with timeout to prevent hanging
  timeout 30s ./scripts/toolPromptTest.sh "$model_name" > "$output_file" 2>&1
  
  # Check exit status
  if [ $? -eq 124 ]; then
    echo "Test TIMED OUT" | tee -a "$LOG_FILE"
  else 
    echo "Test completed" | tee -a "$LOG_FILE"
  fi
  
  # Add a delay between requests to avoid rate limiting
  echo "Waiting 2 seconds before next test..." | tee -a "$LOG_FILE"
  sleep 2
done < "$MODELS_FILE"

# Cleanup
rm "$MODELS_FILE"

echo "All tests completed. Results saved in $RESULTS_DIR"
echo "See summary in $LOG_FILE" 