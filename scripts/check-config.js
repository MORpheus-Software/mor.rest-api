#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Setup dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

console.log(chalk.cyan('===== Configuration Checker ====='));

// Check backend port configuration
const backendPort = process.env.PORT || '4000';
console.log(chalk.cyan(`Backend port: ${backendPort}`));

// Read Vite config file to check proxy target
const viteConfigPath = path.join(rootDir, 'vite.config.ts');
try {
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
  
  // Parse proxy target from vite.config.ts
  const proxyTargetMatch = viteConfig.match(/proxyTarget\s*=\s*isDevelopment\s*\?\s*['"]([^'"]+)['"]/);
  const devProxyTarget = proxyTargetMatch ? proxyTargetMatch[1] : null;
  
  console.log(chalk.cyan(`Frontend proxy target: ${devProxyTarget}`));
  
  // Check if ports match
  if (devProxyTarget && devProxyTarget.includes(`:${backendPort}`)) {
    console.log(chalk.green('✓ Frontend proxy configuration matches backend port!'));
  } else {
    console.log(chalk.red('⨯ WARNING: Frontend proxy target does not match backend port!'));
    console.log(chalk.yellow(`  - Backend port: ${backendPort}`));
    console.log(chalk.yellow(`  - Frontend proxy target: ${devProxyTarget}`));
  }
} catch (error) {
  console.error(chalk.red('Error reading Vite config:'), error.message);
}

console.log(chalk.cyan('================================')); 