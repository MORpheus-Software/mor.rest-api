module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/stakeAuthorization.e2e.test.ts'],
  testTimeout: 30000,
  // Global setup script
  globalSetup: './.jest/globalSetup.js',
  // Global teardown script
  globalTeardown: './.jest/globalTeardown.js',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(chalk)/)'
  ]
}; 