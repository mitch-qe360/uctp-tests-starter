import { defineConfig, devices } from '@playwright/test';
import { ME } from './me';

export default defineConfig({
  testDir: '.',
  fullyParallel: false,   // shared training site: one test at a time
  workers: 1,
  retries: 0,             // a failure is information; don't retry it away
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://city-treasurer-staging.aiqe.pro',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      // API tests: every request carries the two UCTP headers.
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: { extraHTTPHeaders: { 'X-Tenant-ID': 'TAGAYTAY', 'X-User-ID': ME } },
    },
    {
      // Web tests: no extra headers. The web app must send them itself.
      name: 'web',
      testMatch: /.*\.web\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
