import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  testMatch: /.*\.spec\.js/,
  webServer: {
    command: 'python3 -m http.server 8080',
    url: 'http://localhost:8080/test/index.html',
    reuseExistingServer: !process.env.CI
  },
  use: { baseURL: 'http://localhost:8080' }
});
