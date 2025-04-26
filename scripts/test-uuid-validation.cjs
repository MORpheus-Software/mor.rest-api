// Script to test the new UUID validation with error messages
const { execSync } = require('child_process');
const fs = require('fs');

// Create a temporary TypeScript script to test UUID validation
const tempFile = 'temp-uuid-validation-test.ts';

// Write the test code to a temporary TypeScript file
fs.writeFileSync(tempFile, `
import { normalizeUserId, isValidUuid } from './src/lib/utils/userId';

// Test IDs in different formats
const testIds = [
  // Valid UUIDs
  'abf631bc-4a56-4870-a6e8-90761d51f116',
  'b31d67a9-2613-4d30-844c-34e0cbfb9776',
  '8543eb17-06c1-40e0-87dc-ba65786eea59',
  
  // Invalid formats
  '87fceff2', // Shortened ID
  'abf631bc', // Shortened ID
  'invalid-uuid',
  '12345',
  ''
];

// Test the isValidUuid function
console.log('Testing isValidUuid function:');
console.log('-----------------------------');
testIds.forEach(id => {
  const isValid = isValidUuid(id);
  console.log(\`ID: \${id.padEnd(40)} => \${isValid ? 'VALID' : 'INVALID'}\`);
});

// Test the normalizeUserId function (which should now throw errors)
console.log('\\nTesting normalizeUserId function:');
console.log('--------------------------------');
testIds.forEach(id => {
  try {
    const normalized = normalizeUserId(id);
    console.log(\`ID: \${id.padEnd(40)} => SUCCESS: \${normalized}\`);
  } catch (error) {
    console.log(\`ID: \${id.padEnd(40)} => ERROR: \${error.message}\`);
  }
});

console.log('\\nTest complete!');
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