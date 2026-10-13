// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Db, openDb } from "@/db/client";
import { resetDb } from "@/db/reset";
import { bookingLines, bookings, cities, hotels, roomTypes } from "@/db/schema";
import { loadSeed, type Seed } from "@/db/seed";
import { insertTestBooking } from "@/db/test-db";
import { countHotels, listCityTiles } from "@/features/hotels/catalog.repo";

let dir: string;
let file: string;
const opened: Db[] = [];

function open(): Db {
  const db = openDb(file);
  opened.push(db);
  return db;
}

/** Changes the catalog the way a session might: an extra Hotel, a lost Room type. */
function mutate(db: Db): void {
  const seed = loadSeed();
  const source = seed.hotels[0];
  db.insert(hotels)
    .values({
      ...db.select().from(hotels).where(eq(hotels.id, source.id)).get()!,
      id: "hotel-extra",
    })
    .run();
  db.delete(roomTypes).where(eq(roomTypes.id, source.roomTypes[0].id)).run();
}

function migrationRows(db: Db): unknown[] {
  return db.all(sql`SELECT * FROM __drizzle_migrations ORDER BY id`);
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "checkinn-reset-"));
  file = path.join(dir, "checkinn.db");
});

afterEach(() => {
  for (const db of opened.splice(0)) db.$client.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("resetDb", () => {
  it("restores the seed catalog after the data was changed", () => {
    const db = open();
    const seed = loadSeed();
    const roomTypeCount = seed.hotels.flatMap((h) => h.roomTypes).length;
    const migrations = migrationRows(db);
    mutate(db);
    expect(countHotels(db)).toBe(13);

    resetDb(db, seed);

    expect(countHotels(db)).toBe(12);
    expect(db.select().from(roomTypes).all()).toHaveLength(roomTypeCount);
    const tiles = listCityTiles(db);
    expect(tiles).toHaveLength(6);
    expect(tiles.reduce((sum, tile) => sum + tile.hotelCount, 0)).toBe(12);
    expect(migrationRows(db)).toEqual(migrations);
  });

  it("is seen by another connection that holds the file open", () => {
    const server = open();
    const script = open();
    mutate(server);

    resetDb(script, loadSeed());

    expect(countHotels(server)).toBe(12);
    expect(
      server.select().from(hotels).where(eq(hotels.id, "hotel-extra")).get(),
    ).toBeUndefined();
  });

  it("empties tables it does not know about", () => {
    const db = open();
    db.run(sql`CREATE TABLE later_table (id INTEGER PRIMARY KEY)`);
    db.run(sql`INSERT INTO later_table (id) VALUES (1), (2)`);

    resetDb(db, loadSeed());

    expect(db.all(sql`SELECT * FROM later_table`)).toEqual([]);
  });

  it("removes every Booking and Booking line", () => {
    const db = open();
    insertTestBooking(db, {
      hotelId: "hotel-001",
      stay: { checkIn: "2026-11-13", checkOut: "2026-11-15" },
      lines: [{ roomTypeId: "hotel-001-standard", quantity: 2 }],
    });

    resetDb(db, loadSeed());

    expect(db.select().from(bookings).all()).toEqual([]);
    expect(db.select().from(bookingLines).all()).toEqual([]);
  });

  it("rolls back and keeps the previous data when an insert fails", () => {
    const db = open();
    mutate(db);
    const before = db.select().from(hotels).all();
    const seed = loadSeed();
    const broken: Seed = { ...seed, cities: [...seed.cities, seed.cities[0]] };

    expect(() => resetDb(db, broken)).toThrow();

    expect(db.select().from(hotels).all()).toEqual(before);
    expect(db.select().from(cities).all()).toHaveLength(6);
  });
});
