#!/usr/bin/env node

// Script to add a test API key to the local storage for development testing

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Create a directory for localStorage if it doesn't exist
const localStorageDir = path.join(rootDir, '.localStorage');
if (!fs.existsSync(localStorageDir)) {
  console.log('Creating .localStorage directory...');
  fs.mkdirSync(localStorageDir, { recursive: true });
}

// Generate a test API key if not provided
const testApiKey = process.argv[2] || `sk-${crypto.randomBytes(16).toString('hex')}`;

// Create a localStorage file for API keys
const apiKeysFile = path.join(localStorageDir, 'apiKeys.json');

// Create or load existing API keys
let apiKeys = [];
if (fs.existsSync(apiKeysFile)) {
  try {
    apiKeys = JSON.parse(fs.readFileSync(apiKeysFile, 'utf8'));
    console.log(`Loaded ${apiKeys.length} existing API keys`);
  } catch (error) {
    console.error('Error loading existing API keys:', error);
    // Continue with empty array if there was an error
  }
}

// Check if the key already exists
const existingKey = apiKeys.find(key => key.token === testApiKey);
if (existingKey) {
  console.log(`API key already exists: ${testApiKey.substring(0, 8)}...`);
  console.log('Updating status to active...');
  existingKey.status = 'active';
  existingKey.lastUpdated = new Date().toISOString();
} else {
  // Create a new API key
  const newKey = {
    id: crypto.randomBytes(8).toString('hex'),
    token: testApiKey,
    name: 'Test API Key',
    status: 'active',
    userId: 'local-user',
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    permissions: ['all']
  };
  
  // Add the new key to the array
  apiKeys.push(newKey);
  console.log(`Created new API key: ${testApiKey.substring(0, 8)}...`);
}

// Save the API keys to the file
fs.writeFileSync(apiKeysFile, JSON.stringify(apiKeys, null, 2));
console.log(`Saved ${apiKeys.length} API keys to ${apiKeysFile}`);
console.log('');
console.log('You can now use this API key for testing:');
console.log(`Bearer ${testApiKey}`);
console.log('');
console.log('Run the application with the start-dev.sh script to use it with Redis:');
console.log('chmod +x scripts/start-dev.sh && ./scripts/start-dev.sh'); 