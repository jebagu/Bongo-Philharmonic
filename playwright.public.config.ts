import { defineConfig } from '@playwright/test';
const hostedURL = process.env.PHILHARMONIC_PUBLIC_URL;
export default defineConfig({
  testDir: 'tests', testMatch: 'public-browser.spec.ts', workers: 1, timeout: 45000,
  outputDir: '/tmp/bongo-philharmonic-public-browser',
  reporter: [['list'], ['json', { outputFile: 'evidence/public-browser-results.json' }]],
  webServer: hostedURL ? undefined : { command: 'npm run preview:public', url: 'http://127.0.0.1:5717/BongoPhilharmonic/', reuseExistingServer: true },
  use: { baseURL: hostedURL ?? 'http://127.0.0.1:5717/BongoPhilharmonic/', viewport: { width: 1440, height: 1000 },
    launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--enable-unsafe-swiftshader'] } },
});
