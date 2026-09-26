import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", timeout: 90000, expect: { timeout: 15000 }, fullyParallel: false,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure", ...(process.env.FOLIO_BROWSER_CHANNEL === "chrome" ? { channel: "chrome" as const } : {}) },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } }],
  webServer: { command: process.platform === "win32" ? "npm.cmd run start" : "npm run start", url: "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 30000 }
});
