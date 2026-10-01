import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Gameplay tests play whole levels in real time; 100 levels made some of them longer.
  timeout: 180_000,
  use: { baseURL: 'http://localhost:4173', ...devices['Pixel 7'], screenshot: 'only-on-failure' },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 120_000 },
});
