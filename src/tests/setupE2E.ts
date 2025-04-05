/**
 * E2E Test Setup for BuildersClient Integration Tests
 * This file runs before all E2E tests to set up the testing environment
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Make console output more visible for E2E tests
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
  originalLog('\x1b[34m[E2E LOG]\x1b[0m', ...args);
};

console.warn = (...args) => {
  originalWarn('\x1b[33m[E2E WARN]\x1b[0m', ...args);
};

console.error = (...args) => {
  originalError('\x1b[31m[E2E ERROR]\x1b[0m', ...args);
};

// Configure test environment
const setupE2EEnvironment = () => {
  // Load .env.integration if it exists, otherwise create a warning
  const envPath = path.resolve(process.cwd(), '.env.integration');
  if (!fs.existsSync(envPath)) {
    console.warn(`
⚠️ No .env.integration file found at ${envPath}
For E2E tests to run correctly, you need to create an .env.integration file with:

PRIVATE_KEY=your_private_key_here
TESTNET_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
VITE_TESTNET_BUILDERS_CONTRACT_ADDRESS=0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a
VITE_TESTNET_MOR_TOKEN_ADDRESS=0x34a285A1B1C166420Df5b6630132542923B5b27E

Continuing with default environment...
`);
  } else {
    // Load the environment from .env.integration
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error(`Error loading .env.integration file: ${result.error.message}`);
    } else {
      console.log(`Successfully loaded environment from ${envPath}`);
    }
  }

  // Validate required environment variables
  const requiredVars = ['PRIVATE_KEY', 'TESTNET_RPC_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing required environment variables: ${missingVars.join(', ')}`);
    console.warn('Some tests may be skipped or fail due to missing configuration.');
  } else {
    console.log('E2E test environment configured successfully.');
  }
};

// Run the setup
setupE2EEnvironment();

// Default Jest timeout for all tests in ms
jest.setTimeout(180000); // 3 minutes

// Global before all hook for E2E tests
beforeAll(() => {
  console.log('\n🚀 Starting BuildersClient E2E test suite...\n');
});

// Global after all hook for E2E tests
afterAll(() => {
  console.log('\n✅ E2E test suite complete.\n');
}); 