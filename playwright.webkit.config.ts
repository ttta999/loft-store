import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  testMatch: ['jank.spec.ts', 'premium.spec.ts', 'motion.spec.ts', 'profile-shared.spec.ts'],
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-webkit' }]],
  outputDir: 'test-results-webkit',
  use: { ...base.use, channel: undefined },
  projects: [{ name: 'webkit-mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit', channel: undefined } }],
})
