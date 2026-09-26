import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome', // Use natively installed Google Chrome
    headless: true,
    screenshot: 'off',
    trace: 'off',
  },
  projects: [
    {
      name: 'Mobile-375x667',
      use: { viewport: { width: 375, height: 667 } },
    },
    {
      name: 'Tablet-768x1024',
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'Tablet-Landscape-1024x768',
      use: { viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'Desktop-1280x800',
      use: { viewport: { width: 1280, height: 800 } },
    },
  ],
});
