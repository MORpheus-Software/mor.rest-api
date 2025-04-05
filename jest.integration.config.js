import baseConfig from './jest.config.js';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  testTimeout: 120000, // 2 minute timeout for blockchain transactions
  testMatch: ['**/tests/**/*.integration.test.ts'],
  setupFiles: ['dotenv/config'],
};

export default config; 