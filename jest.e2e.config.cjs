const integrationConfig = require('./jest.integration.config.cjs');

/** @type {import('jest').Config} */
const config = {
  ...integrationConfig,
  displayName: 'E2E Tests',
  testTimeout: 180000, // 3 minute timeout for blockchain E2E tests
  testMatch: ['**/tests/**/BuildersClient.integration.test.ts'],
  setupFiles: ['dotenv/config'],
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setupE2E.ts',
  ],
  verbose: true,
};

module.exports = config; 