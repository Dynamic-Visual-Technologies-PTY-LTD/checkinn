import { sql } from "drizzle-orm";
import { type CatalogWriter, insertCatalog, type Seed } from "@/db/seed";

/**
 * Every app table, read from the database itself so tables added later are
 * reset with no change here. SQLite's own tables and Drizzle's migration
 * journal are left alone.
 */
function appTables(tx: CatalogWriter): string[] {
  return tx
    .all<{ name: string }>(
      sql`SELECT name FROM sqlite_master
          WHERE type = 'table'
            AND substr(name, 1, 7) <> 'sqlite_'
            AND name <> '__drizzle_migrations'
          ORDER BY name`,
    )
    .map((row) => row.name);
}

/**
 * Empties every app table and re-inserts the seed, in one transaction (AD-6).
 * The file is never deleted, so this is safe while the server holds it open,
 * and the server sees the new data on its next query. If anything throws, the
 * transaction rolls back and the previous data stays.
 */
export function resetDb(db: CatalogWriter, seed: Seed): void {
  db.transaction((tx) => {
    // Foreign keys are checked at commit, so the delete order doesn't matter.
    tx.run(sql`PRAGMA defer_foreign_keys = ON`);
    for (const table of appTables(tx)) {
      tx.run(sql.raw(`DELETE FROM "${table.replaceAll('"', '""')}"`));
    }
    insertCatalog(tx, seed);
  });
}
