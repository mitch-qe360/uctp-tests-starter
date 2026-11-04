import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './config/environment';

export default defineConfig({
  testDir: 'tests/web',
  testMatch: /.*\.web\.spec\.ts/,
  fullyParallel: false,   // shared training site: one test at a time
  workers: 1,
  retries: 0,             // a failure is information; don't retry it away
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'reports/web' }]],
  use: {
    baseURL: BASE_URL,    // from config/environment.js
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
