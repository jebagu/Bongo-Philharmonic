import { defineConfig } from '@playwright/test';
const baseURL = process.env.BONGO_TEST_URL ?? 'http://127.0.0.1:5417/BongoPlanet/composer/';
export default defineConfig({
  testDir: 'tests', testMatch: 'browser.spec.ts', workers: 1, timeout: 45000,
  outputDir: '/tmp/bongo-philharmonic-browser',
  reporter: [['list'], ['json', { outputFile: 'evidence/browser-results.json' }]],
  webServer: process.env.BONGO_TEST_URL ? undefined : {
    command: 'npm run dev', url: baseURL, reuseExistingServer: !process.env.CI, timeout: 30000,
  },
  use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 }, baseURL,
    launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--enable-unsafe-swiftshader'] } },
});
