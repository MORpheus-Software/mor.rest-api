// @ts-check

/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/*.test.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  collectCoverage: false,
  // Individual test timeout
  testTimeout: 30000,
  // Global setup script
  globalSetup: './.jest/globalSetup.js',
  // Global teardown script
  globalTeardown: './.jest/globalTeardown.js',
};

export default config; 