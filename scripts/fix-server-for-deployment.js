#!/usr/bin/env node

/**
 * This script fixes the server.js file for deployment by properly converting
 * ES module syntax to CommonJS to prevent duplicate __filename declarations.
 */

const fs = require('fs');
const path = require('path');

// Path to the server file
const serverPath = path.join(process.cwd(), 'dist', 'src', 'server', 'server.js');

if (!fs.existsSync(serverPath)) {
  console.error(`Server file not found at ${serverPath}`);
  process.exit(1);
}

// Read the server file
console.log(`Reading server file at ${serverPath}`);
let content = fs.readFileSync(serverPath, 'utf8');

// Create a backup
const backupPath = `${serverPath}.bak`;
fs.writeFileSync(backupPath, content);
console.log(`Created backup at ${backupPath}`);

// Replace import statements with requires
content = content.replace(/import\s+([\w\s{},*]+)\s+from\s+['"]([^'"]+)['"];/g, (match, imports, source) => {
  // Handle different import formats
  if (imports.includes('{')) {
    // Destructuring import: import { a, b } from 'module';
    const destructuredImports = imports.match(/{([^}]+)}/)[1].trim();
    return `const { ${destructuredImports} } = require('${source}');`;
  } else if (imports.includes('*')) {
    // Namespace import: import * as name from 'module';
    const name = imports.match(/\*\s+as\s+(\w+)/)[1];
    return `const ${name} = require('${source}');`;
  } else {
    // Default import: import name from 'module';
    return `const ${imports.trim()} = require('${source}');`;
  }
});

// Handle the fileURLToPath and __filename/__dirname definitions
console.log('Fixing __filename and __dirname definitions');

// Replace import.meta.url instances
content = content.replace(/import\.meta\.url/g, "'file://' + __dirname");

// Fix the ES Module specific __filename/__dirname code
content = content.replace(
  /const\s+__filename\s*=\s*fileURLToPath\((?:import\.meta\.url|['"]file:\/\/['"]\s*\+\s*__dirname)\);/g, 
  '// __filename is already defined in CommonJS'
);
content = content.replace(
  /const\s+__dirname\s*=\s*path\.dirname\(__filename\);/g,
  '// __dirname is already defined in CommonJS'
);

// Write the fixed file
fs.writeFileSync(serverPath, content);
console.log('Successfully fixed server.js file for deployment');

// Display a sample of the file for verification
const verificationContent = content.split('\n').slice(0, 50).join('\n');
console.log('\nVerification (first 50 lines):\n');
console.log(verificationContent); 