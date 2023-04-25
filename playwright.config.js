const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  // Use the grep option to filter tests by title and file extension
  // grep: /.*\.pw\.js$/,
  testMatch: /.*\.pw\.e2e\.js/,
  // Set the timeout for each test
  timeout: 30000,
  // (3 hours) Maximum time in milliseconds the whole test suite can run. Useful on CI to prevent broken setup from running too long and wasting resources.
  globalTimeout: process.env.CI ? 3 * 60 * 60 * 1000 : undefined,
  ignoreSnapshots: !process.env.CI,
  // The maximum number of test failures for the whole test suite run. After reaching this number, testing will stop and exit with an error
  maxFailures: process.env.CI ? 3 : 0,
  globalSetup: './tests/global-setup.js',
  globalTeardown: './tests/global-teardown.js',
  reporter: 'list'
});
