import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  outputDir: 'test-results/browser-e2e',
  fullyParallel: false,
  // Desktop and mobile projects share one local API/Vite pair and one disposable
  // database. Keep the browser matrix deterministic instead of starting both
  // projects against the same development ports at once.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], browserName: 'chromium' } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  webServer: [
    {
      command: 'npm --prefix ../../api run start',
      url: 'http://localhost:4100/v1/health',
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      command: 'npm --prefix .. run dev -- --host localhost',
      url: 'http://localhost:3000',
      timeout: 60_000,
      reuseExistingServer: false,
    },
  ],
});
