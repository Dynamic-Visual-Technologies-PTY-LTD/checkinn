import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
// Next.js reads PORT too, so `PORT=3100 npm run test:e2e` moves both sides.
const baseURL = `http://localhost:${process.env.PORT ?? 3000}`;

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // CI tests the production build (run `npm run build` first); locally the dev
  // server is started, or reused if it is already running.
  webServer: {
    command: isCI ? "npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
