import { tmpdir } from "node:os";
import path from "node:path";

/**
 * The e2e server's database: a file in the OS temp folder, never
 * `data/checkinn.db` (AD-18). `playwright.config.ts` passes it to the server
 * and `e2e/global-setup.ts` resets it before the run.
 */
export const E2E_DB_PATH = path.join(tmpdir(), "checkinn-e2e", "checkinn.db");

/**
 * The Smart search server's database (AD-30): a second file, so Smart specs
 * on port 3101 never race the MVP specs on port 3100.
 */
export const E2E_SMART_DB_PATH = path.join(tmpdir(), "checkinn-e2e", "checkinn-smart.db");
