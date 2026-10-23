import { defineConfig, devices } from "@playwright/test";
import { E2E_DB_PATH } from "./e2e/support/db";

const isCI = Boolean(process.env.CI);
// A port of its own, so the suite never talks to the developer's dev server
// on 3000 (AD-18).
const E2E_PORT = 3100;
const baseURL = `http://localhost:${E2E_PORT}`;
const startServer = `npm start -- --port ${E2E_PORT}`;

// Specs that create or cancel Bookings live here and run only in the booking
// projects, one at a time.
const BOOKING_SPECS = "booking/**/*.spec.ts";

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Capped locally: more browsers at once fail to launch on Windows
  // (`spawn UNKNOWN`).
  workers: isCI ? undefined : 2,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // Desktop only: phone layouts are covered by component tests.
  projects: [
    // Read-only specs, in parallel.
    {
      name: "chromium",
      testIgnore: BOOKING_SPECS,
      use: { ...devices["Desktop Chrome"] },
    },
    // Booking specs: serial, after the read-only project finishes, so they
    // never race it over Rooms.
    {
      name: "booking",
      testMatch: BOOKING_SPECS,
      fullyParallel: false,
      workers: 1,
      dependencies: ["chromium"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Always a production server of its own, against a temporary database
  // (AD-18). CI builds in an earlier step; locally the build runs here.
  webServer: {
    command: isCI ? startServer : `npm run build && ${startServer}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: isCI ? 120_000 : 300_000,
    env: { CHECKINN_DB_PATH: E2E_DB_PATH },
  },
});
