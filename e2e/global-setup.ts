import { openDb } from "@/db/client";
import { resetDb } from "@/db/reset";
import { loadSeed } from "@/db/seed";
import { E2E_DB_PATH, E2E_SMART_DB_PATH } from "./support/db";

/**
 * Puts both e2e databases, the MVP server's and the Smart server's, back to
 * the seed before any spec runs (AD-18, AD-30). The servers are already up
 * and hold the files open; the reset is safe for that.
 */
export default function globalSetup(): void {
  const seed = loadSeed();
  for (const file of [E2E_DB_PATH, E2E_SMART_DB_PATH]) {
    const db = openDb(file);
    try {
      resetDb(db, seed);
    } finally {
      db.$client.close();
    }
  }
}
