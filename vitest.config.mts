import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    // The calendar and search bar tests drive many userEvent clicks in jsdom;
    // the slowest takes ~2.5 s alone, so the 5 s default fails under load.
    testTimeout: 15_000,
    // One worker per test file (33 and growing) starves those tests of CPU.
    maxWorkers: 6,
  },
});
