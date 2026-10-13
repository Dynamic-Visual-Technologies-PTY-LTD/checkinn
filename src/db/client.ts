import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  type BetterSQLite3Database,
  drizzle,
} from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/db/schema";
import { loadSeed, seedCatalog } from "@/db/seed";

/** The Drizzle database, with the underlying better-sqlite3 connection as `$client`. */
export type Db = BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
};

const DEFAULT_DB_PATH = path.join("data", "checkinn.db");

/**
 * Opens a database at `file` (a path or `:memory:`), applies the committed
 * migrations in `drizzle/`, and seeds the catalog if `hotels` is empty
 * (AD-6, AD-12). Nothing here runs at import time.
 */
export function openDb(file: string): Db {
  if (file !== ":memory:") {
    mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }

  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  if (!db.select({ id: schema.hotels.id }).from(schema.hotels).limit(1).get()) {
    seedCatalog(db, loadSeed());
  }

  return db;
}

// One connection per process (AD-12). In development it lives on globalThis,
// so hot reloads reuse it instead of opening a new one each time.
const globalForDb = globalThis as typeof globalThis & { checkinnDb?: Db };
let processDb: Db | undefined;

/** The app's database, opened lazily on first call. */
export function getDb(): Db {
  if (process.env.NODE_ENV !== "production") {
    globalForDb.checkinnDb ??= openDb(dbPath());
    return globalForDb.checkinnDb;
  }
  processDb ??= openDb(dbPath());
  return processDb;
}

function dbPath(): string {
  return process.env.CHECKINN_DB_PATH || DEFAULT_DB_PATH;
}
