// Script to test the normalizeUserId function with different ID formats
// Need to use TypeScript runner since the code is in TypeScript
const { execSync } = require('child_process');
const fs = require('fs');

// Create a temporary TypeScript script to test normalizeUserId
const tempFile = 'temp-normalize-test.ts';

// Write the test code to a temporary TypeScript file
fs.writeFileSync(tempFile, `
import { normalizeUserId } from './src/lib/utils/userId';

// Test IDs in different formats
const testIds = [
  // Full UUIDs
  'abf631bc-4a56-4870-a6e8-90761d51f116',
  'b31d67a9-2613-4d30-844c-34e0cbfb9776',
  '8543eb17-06c1-40e0-87dc-ba65786eea59',
  '20ba5139-ec6e-4335-b47a-9f22836924e7',
  'f93a96a7-1c41-4ec1-86e1-380f9f5e0813',
  
  // Shortened formats - prefixes
  '87fceff2',
  'abf631bc',
  'b31d67a9',
  '8543eb17',
  '20ba5139',
  'f93a96a7',
  
  // Unknown ID
  'unknown123'
];

// Test each ID with the normalizeUserId function
console.log('Testing normalizeUserId function with different ID formats:');
console.log('--------------------------------------------------------------');

testIds.forEach(id => {
  const normalized = normalizeUserId(id);
  const result = id === normalized ? 'UNCHANGED' : \`NORMALIZED TO \${normalized}\`;
  console.log(\`ID: \${id.padEnd(40)} => \${result}\`);
});

console.log('--------------------------------------------------------------');
console.log('Test complete!');
`);

// Run the TypeScript script with tsx
try {
  const output = execSync('npx tsx ' + tempFile).toString();
  console.log(output);
} catch (error) {
  console.error('Error running test:', error.message);
  console.error(error.stdout?.toString() || '');
} finally {
  // Clean up the temporary file
  fs.unlinkSync(tempFile);
} 