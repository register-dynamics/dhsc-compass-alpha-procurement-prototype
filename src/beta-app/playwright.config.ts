import { defineConfig } from "@playwright/test";

export default defineConfig({
  fullyParallel: true,
  outputDir: "./reports/test-results",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "./reports/playwright-report" }],
  ],
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3001",
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: "http://localhost:3001",
  },
});
