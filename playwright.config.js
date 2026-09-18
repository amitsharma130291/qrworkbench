import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 30000, workers: 1,
  use: { baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:4321', headless: true, launchOptions: { channel: 'msedge' } },
  reporter: 'list'
});
