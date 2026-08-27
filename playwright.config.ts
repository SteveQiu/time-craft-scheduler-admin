import { config as loadEnv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

loadEnv({ path: '.secret' });
loadEnv();

/**
 * Playwright Test Configuration
 * 
 * Optimizations applied:
 * - Parallel execution with 8 workers (local) / 4 workers (CI)
 * - Shared baseURL to avoid hardcoded localhost URLs
 * - Screenshot only on failure (not in every test)
 * - Auto web server startup
 */
export default defineConfig({
  testDir: './tests',
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in source
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 4 : 8,
  
  // Reporter to use
  reporter: 'html',
  
  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot only on failure
    screenshot: 'only-on-failure',
    
    // Maximum time for page.goto() navigation
    navigationTimeout: 30000,
    
    // Maximum time for action (click, fill, etc.)
    actionTimeout: 10000,
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  // Global timeout for each test
  timeout: 30000,
  
  // Global setup timeout
  globalTimeout: 600000, // 10 minutes for entire test suite
  
  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },
});
