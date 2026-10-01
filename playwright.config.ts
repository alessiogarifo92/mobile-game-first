import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Gameplay tests play whole levels in real time; 100 levels made some of them longer.
  timeout: 180_000,
  // CI needs files to upload on failure: html report + traces/screenshots, one retry for runner hiccups.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173', ...devices['Pixel 7'], screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
