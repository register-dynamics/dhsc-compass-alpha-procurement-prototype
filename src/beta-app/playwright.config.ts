import { defineConfig } from "@playwright/test";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env");
} catch {
  console.log(".env file not present. Ignoring.");
}

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
