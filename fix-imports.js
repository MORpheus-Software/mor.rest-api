import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to recursively find all .js files in a directory
function findJsFiles(dir, fileList = []) {
  console.log(`Searching directory: ${dir}`);
  
  try {
    if (!fs.existsSync(dir)) {
      console.error(`Directory not found: ${dir}`);
      return fileList;
    }
    
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          findJsFiles(filePath, fileList);
        } else if (file.endsWith('.js')) {
          fileList.push(filePath);
        }
      } catch (err) {
        console.error(`Error processing file ${filePath}: ${err.message}`);
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dir}: ${err.message}`);
  }
  
  return fileList;
}

// Function to fix imports in a file
function fixImports(filePath) {
  console.log(`Processing ${filePath}`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // First, clean up any .js.js that might have been added previously
    content = content.replace(/\.js\.js/g, '.js');
    
    // Then only fix relative imports (starting with ./ or ../) that don't already have .js extension
    // This regex is specifically designed to not match if the path already ends with .js
    const importRegex = /from\s+(['"])(\.\.?\/[^'"]+)(?!\.js['"])(['"])/g;
    
    // Replace with the same import but add .js extension before the closing quote
    content = content.replace(importRegex, 'from $1$2.js$3');
    
    fs.writeFileSync(filePath, content);
    console.log(`Successfully processed ${filePath}`);
  } catch (err) {
    console.error(`Error processing file ${filePath}: ${err.message}`);
  }
}

// Main function
function main() {
  try {
    // List current directory to debug Docker environment
    console.log('Current directory:', process.cwd());
    console.log('Directory contents:', fs.readdirSync('.'));
    
    // Check if dist directory exists
    const distDir = path.resolve(process.cwd(), 'dist');
    console.log(`Looking for dist directory at: ${distDir}`);
    
    if (!fs.existsSync(distDir)) {
      console.error(`Dist directory not found at ${distDir}`);
      process.exit(1);
    }
    
    console.log(`Finding .js files in ${distDir}`);
    const jsFiles = findJsFiles(distDir);
    console.log(`Found ${jsFiles.length} .js files`);
    
    if (jsFiles.length === 0) {
      console.warn('No JavaScript files found in dist directory.');
    } else {
      jsFiles.forEach(fixImports);
      console.log('Done fixing imports');
    }
  } catch (err) {
    console.error(`Error in main function: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

main(); 