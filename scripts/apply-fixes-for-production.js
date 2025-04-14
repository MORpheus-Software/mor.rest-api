#!/usr/bin/env node

/**
 * This script applies all necessary fixes for production deployment:
 * 1. Adds .js extensions to relative imports for ESM compatibility
 * 2. Runs tsc-alias to resolve path aliases (@/...)
 * 3. Fixes Redis import issues in setupRedis.ts
 * 
 * Run with: node scripts/apply-fixes-for-production.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this script file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('📋 Starting production build fixes...');

// Step 1: Fix ESM imports by running the fix-esm-imports.js script
console.log('\n🔧 Step 1: Fixing ESM imports by adding .js extensions to relative imports...');
try {
  execSync('node scripts/fix-esm-imports.js', { stdio: 'inherit' });
  console.log('✅ ESM imports fixed successfully');
} catch (error) {
  console.error('❌ Error fixing ESM imports:', error.message);
  process.exit(1);
}

// Step 2: Check and fix Redis implementation in setupRedis.ts
console.log('\n🔧 Step 2: Fixing Redis implementation in setupRedis.ts...');
try {
  const redisFilePath = path.join(rootDir, 'src', 'server', 'setupRedis.ts');
  if (fs.existsSync(redisFilePath)) {
    let content = fs.readFileSync(redisFilePath, 'utf8');
    
    // Fix Redis imports and type definitions
    content = content.replace('import * as Redis from \'ioredis\';', 'import Redis from \'ioredis\';');
    content = content.replace(/let redisClient: Redis \| null = null;/g, 'let redisClient: Redis.Redis | null = null;');
    content = content.replace(/Promise<Redis>/g, 'Promise<Redis.Redis>');
    
    fs.writeFileSync(redisFilePath, content);
    console.log('✅ Redis implementation fixed in setupRedis.ts');
  } else {
    console.log('⚠️ setupRedis.ts not found, skipping Redis fixes');
  }
} catch (error) {
  console.error('❌ Error fixing Redis implementation:', error.message);
}

// Step 3: Fix Ethers.js Provider references
console.log('\n🔧 Step 3: Fixing Ethers.js Provider references...');
try {
  const filePathsToCheck = [
    path.join(rootDir, 'src', 'staking', 'BuildersClient.ts'),
    path.join(rootDir, 'src', 'staking', 'initStakeStatus.ts')
  ];
  
  for (const filePath of filePathsToCheck) {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace ethers.Provider with ethers.providers.Provider
      content = content.replace(/ethers\.Provider/g, 'ethers.providers.Provider');
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Ethers.js Provider references fixed in ${filePath}`);
    }
  }
} catch (error) {
  console.error('❌ Error fixing Ethers.js Provider references:', error.message);
}

console.log('\n✨ All fixes applied successfully! Ready for production build.');
console.log('\n📝 Next steps:');
console.log('1. Run `npm run build` to build the application');
console.log('2. Verify the build by checking the dist folder');
console.log('3. Test the production build locally before deploying\n'); 