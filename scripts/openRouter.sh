curl https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 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" \
  -H "HTTP-Referer: https://morsaas.com" \
  -H "X-Title: MorSaaS" \
  -H "User-Agent: MorSaaS/1.0.0" \
  -H "Accept: text/event-stream" \
  -d '{
  "model": "openrouter/auto",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true
}'
