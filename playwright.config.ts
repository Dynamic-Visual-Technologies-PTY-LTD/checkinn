import { defineConfig, devices } from "@playwright/test";
import { E2E_DB_PATH, E2E_SMART_DB_PATH } from "./e2e/support/db";

const isCI = Boolean(process.env.CI);
// A port of its own, so the suite never talks to the developer's dev server
// on 3000 (AD-18).
const E2E_PORT = 3100;
const baseURL = `http://localhost:${E2E_PORT}`;
const startServer = `npm start -- --port ${E2E_PORT}`;

// The Smart search server: the same build, the fake Provider and a database
// of its own (AD-30).
const SMART_PORT = 3101;
const smartURL = `http://localhost:${SMART_PORT}`;

// Specs that create or cancel Bookings live here and run only in the booking
// projects, one at a time.
const BOOKING_SPECS = "booking/**/*.spec.ts";
// Smart search specs run only against the Smart server.
const SMART_SPECS = "smart/**/*.spec.ts";
const serverTimeout = isCI ? 120_000 : 300_000;

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
  projects: [
    // Read-only specs, in parallel.
    {
      name: "chromium",
      testIgnore: [BOOKING_SPECS, SMART_SPECS],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testIgnore: [BOOKING_SPECS, SMART_SPECS],
      use: { ...devices["Pixel 7"] },
    },
    // Smart search specs, read-only, against the fake Provider on 3101.
    {
      name: "smart-desktop",
      testMatch: SMART_SPECS,
      use: { ...devices["Desktop Chrome"], baseURL: smartURL },
    },
    {
      name: "smart-mobile",
      testMatch: SMART_SPECS,
      use: { ...devices["Pixel 7"], baseURL: smartURL },
    },
    // Booking specs: serial, after the read-only projects finish, so they
    // never race them over Rooms; desktop first, then mobile.
    {
      name: "booking-desktop",
      testMatch: BOOKING_SPECS,
      fullyParallel: false,
      workers: 1,
      dependencies: ["chromium", "mobile"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "booking-mobile",
      testMatch: BOOKING_SPECS,
      fullyParallel: false,
      workers: 1,
      dependencies: ["booking-desktop"],
      use: { ...devices["Pixel 7"] },
    },
  ],
  // Always production servers of their own, each against a temporary
  // database (AD-18, AD-30). CI builds in an earlier step; locally the build
  // runs with the first server, and the Smart server starts after it from the
  // same build.
  webServer: [
    {
      command: isCI ? startServer : `npm run build && ${startServer}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: serverTimeout,
      env: { CHECKINN_DB_PATH: E2E_DB_PATH, CHECKINN_PROVIDER: "off" },
    },
    {
      command: `npm start -- --port ${SMART_PORT}`,
      url: smartURL,
      reuseExistingServer: false,
      timeout: serverTimeout,
      env: { CHECKINN_DB_PATH: E2E_SMART_DB_PATH, CHECKINN_PROVIDER: "fake" },
    },
  ],
});
