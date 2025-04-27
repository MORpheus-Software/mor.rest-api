#!/bin/bash

echo "Starting diagnosis at $(date)" > diagnosis.log
echo "Current directory: $(pwd)" >> diagnosis.log
echo "Node version: $(node -v)" >> diagnosis.log
echo "NPM version: $(npm -v)" >> diagnosis.log

echo "Checking for ESM modules:" >> diagnosis.log
npm ls lovable-tagger >> diagnosis.log 2>&1

echo "Checking package.json:" >> diagnosis.log
cat package.json >> diagnosis.log

echo "Checking vite.config.ts:" >> diagnosis.log
cat vite.config.ts >> diagnosis.log

echo "Attempting build with diagnostic output..." >> diagnosis.log
VITE_DISABLE_TRANSFORM_CACHE=true SKIP_TYPESCRIPT=true npx vite build --mode production >> diagnosis.log 2>&1

echo "Checking build results:" >> diagnosis.log
if [ -d "dist" ]; then
  echo "dist directory exists" >> diagnosis.log
  ls -la dist >> diagnosis.log
else
  echo "dist directory does not exist" >> diagnosis.log
fi

echo "Diagnosis complete at $(date)" >> diagnosis.log
echo "Diagnostic log written to diagnosis.log" 