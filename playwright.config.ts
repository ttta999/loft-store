import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 30_000,
  expect: { timeout: 7_000 }, retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { channel: 'chrome', headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure', serviceWorkers: 'block' },
  webServer: { command: 'node scripts/test-servers.mjs', url: 'http://127.0.0.1:4174', reuseExistingServer: false, timeout: 90_000 },
  projects: [{ name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }, { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } }],
})
