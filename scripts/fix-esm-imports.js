#!/usr/bin/env node

/**
 * This script fixes ESM imports by adding .js extensions to relative imports.
 * Run with: node scripts/fix-esm-imports.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this script file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

// Regular expression to match relative imports without extensions
const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+[^,]+|[^,{}\s*]+)\s+from\s+['"](\.[^'"]*)['"]/g;
const exportRegex = /export\s+(?:{[^}]*}|\*\s+as\s+[^,]+|[^,{}\s*]+)?\s*from\s+['"](\.[^'"]*)['"]/g;

// Function to add .js extension to relative imports, but not to path aliases like @/
function addJsExtension(match, importPath) {
  // Skip path aliases or imports with file extensions already
  if (importPath.startsWith('@/') || importPath.endsWith('.js') || importPath.endsWith('.ts') || 
      importPath.endsWith('.json') || importPath.endsWith('.jsx') || importPath.endsWith('.tsx')) {
    return match;
  }
  
  // Add .js extension
  return match.replace(importPath, `${importPath}.js`);
}

// Function to process a file
function processFile(filePath) {
  try {
    // Only process TypeScript files
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Replace import statements
    let newContent = content.replace(importRegex, (match, importPath) => {
      return addJsExtension(match, importPath);
    });
    
    // Replace export statements
    newContent = newContent.replace(exportRegex, (match, importPath) => {
      return addJsExtension(match, importPath);
    });
    
    // Only write to file if changes were made
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Fixed imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
  }
}

// Function to recursively process files in a directory
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and dist directories
      if (file !== 'node_modules' && file !== 'dist') {
        processDirectory(fullPath);
      }
    } else {
      processFile(fullPath);
    }
  }
}

// Start processing from the src directory
console.log('Fixing ESM imports...');
processDirectory(srcDir);
console.log('Done!'); 