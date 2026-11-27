import { openDb } from "@/db/client";
import { resetDb } from "@/db/reset";
import { loadSeed } from "@/db/seed";
import { E2E_DB_PATH } from "./support/db";

/**
 * Puts the e2e database back to the seed before any spec runs (AD-18). The
 * server is already up and holds the file open; the reset is safe for that.
 */
export default function globalSetup(): void {
  const db = openDb(E2E_DB_PATH);
  try {
    resetDb(db, loadSeed());
  } finally {
    db.$client.close();
  }
}
