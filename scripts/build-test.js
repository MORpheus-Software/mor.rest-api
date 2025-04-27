#!/usr/bin/env node

/**
 * Simplified build script for testing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting diagnostic build test...');

try {
  // Set environment variables
  process.env.VITE_DISABLE_TRANSFORM_CACHE = 'true';
  process.env.SKIP_TYPESCRIPT = 'true';
  
  console.log('Current directory:', process.cwd());
  console.log('Files in directory:', fs.readdirSync('.').join(', '));
  
  // Try to run vite build with verbose logging
  console.log('Running Vite build...');
  execSync('npx vite build --mode production', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DISABLE_TRANSFORM_CACHE: 'true',
      SKIP_TYPESCRIPT: 'true',
      DEBUG: 'vite:*'
    } 
  });
  
  console.log('Build completed successfully!');
  
} catch (error) {
  console.error('Build failed with error:', error.message);
  console.error('Stack trace:', error.stack);
  
  // Extra diagnostics
  try {
    console.log('Checking Vite config...');
    const viteConfig = fs.readFileSync('./vite.config.ts', 'utf8');
    console.log('Vite config exists with length:', viteConfig.length);
    
    console.log('Node.js version:', process.version);
    console.log('NPM version:', execSync('npm --version').toString().trim());
    
  } catch (diagError) {
    console.error('Diagnostic error:', diagError.message);
  }
  
  process.exit(1);
} 