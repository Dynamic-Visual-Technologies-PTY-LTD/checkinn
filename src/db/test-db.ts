import { type Db, openDb } from "@/db/client";

/** A fresh `:memory:` database, migrated and seeded, for repo tests (AD-18). */
export function createTestDb(): Db {
  return openDb(":memory:");
}
