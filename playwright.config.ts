import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './config/environment';

// Web tests (tests/web) and integration tests (tests/integration) both run with Playwright.
// REPORT names the report folder: reports/web or reports/integration (CI sets it per job).
const report = process.env.REPORT || 'web';

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.(web|integration)\.spec\.ts/,
  fullyParallel: false,   // shared training site: one test at a time
  workers: 1,
  retries: 0,             // a failure is information; don't retry it away
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: `reports/${report}/html` }],
    ['json', { outputFile: `reports/${report}/results.json` }],   // read by scripts/summary.js
  ],
  use: {
    baseURL: BASE_URL,    // from config/environment.js
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
