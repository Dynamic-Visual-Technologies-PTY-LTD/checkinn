// npm run db:reset: put the database back to the committed seed (AD-6).
// Safe while the app is running; it never deletes the file.
import { count } from "drizzle-orm";
import { dbPath, openDb } from "@/db/client";
import { resetDb } from "@/db/reset";
import { cities, hotels, roomTypes } from "@/db/schema";
import { loadSeed } from "@/db/seed";

const file = dbPath();

try {
  // A one-shot process, so openDb rather than the cached getDb. A missing
  // file is created, migrated and seeded here, then reset like any other.
  const db = openDb(file);
  try {
    resetDb(db, loadSeed());
    const rows = (table: typeof cities | typeof hotels | typeof roomTypes) =>
      db.select({ n: count() }).from(table).get()?.n ?? 0;
    console.log(
      `Reset ${file}: ${rows(cities)} cities, ${rows(hotels)} hotels, ${rows(roomTypes)} room types.`,
    );
  } finally {
    db.$client.close();
  }
} catch (error) {
  console.error(`Reset of ${file} failed.`);
  console.error(error);
  process.exitCode = 1;
}
