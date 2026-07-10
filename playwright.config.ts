import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright E2E testing configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // GitHub automation requires sequential executions
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Setup project to authenticate with GitHub once
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Main testing project
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use cached authentication state
        storageState: path.join(__dirname, 'playwright/.auth/user.json'),
      },
      dependencies: ['setup'],
    },
  ],
});
