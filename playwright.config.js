// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Tests run against a real WordPress — the foundation's disposable harness
// (PHP + SQLite, no Docker), which CI provisions on 127.0.0.1:8881 and which you
// boot locally with `npm run wp:up`. There is no staging URL: a dead or
// placeholder host is how a suite comes to skip itself while reporting green.
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:8881';

module.exports = defineConfig({
  testDir: './tests',
  // Publishes the page the shortcode spec asserts on, straight through
  // WordPress — see tests/global-setup.js.
  globalSetup: require.resolve('./tests/global-setup.js'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  // PHP's built-in server is single-threaded, so parallel workers against it
  // produce spurious timeouts.
  workers: 1,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'wordpress',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
