// @vitest-environment node
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Db, getDb, openDb } from "@/db/client";
import { hotels } from "@/db/schema";
import { bookings, roomTypes } from "@/db/schema";
import { resetDb } from "@/db/reset";
import { loadSeed } from "@/db/seed";
import { insertTestBooking } from "@/db/test-db";
import { countHotels } from "@/features/hotels/catalog.repo";

let dir: string;
const opened: Db[] = [];
const globalForDb = globalThis as typeof globalThis & { checkinnDb?: Db };

function track(db: Db): Db {
  opened.push(db);
  return db;
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "checkinn-db-"));
});

afterEach(() => {
  for (const db of opened.splice(0)) db.$client.close();
  delete globalForDb.checkinnDb;
  delete process.env.CHECKINN_DB_PATH;
  rmSync(dir, { recursive: true, force: true });
});

describe("openDb", () => {
  it("creates the folder, migrates and seeds a new file", () => {
    const file = path.join(dir, "nested", "checkinn.db");
    const db = track(openDb(file));

    expect(existsSync(file)).toBe(true);
    expect(countHotels(db)).toBe(120);
  });

  it("does not reseed a database that already has Hotels", () => {
    const file = path.join(dir, "checkinn.db");
    const first = track(openDb(file));
    const before = first.select({ id: hotels.id }).from(hotels).all();
    first.$client.close();
    opened.splice(0);

    const second = track(openDb(file));

    expect(countHotels(second)).toBe(120);
    expect(second.select({ id: hotels.id }).from(hotels).all()).toEqual(before);
  });

  it("turns on foreign keys and WAL", () => {
    const db = track(openDb(path.join(dir, "checkinn.db")));

    expect(db.$client.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(db.$client.pragma("journal_mode", { simple: true })).toBe("wal");
  });

  it("preserves a previously seeded 12-hotel database and its bookings on reopen", () => {
    const file = path.join(dir, "previous-catalog.db");
    const first = track(openDb(file));
    const seed = loadSeed();
    resetDb(first, { ...seed, cities: seed.cities.slice(0, 6), hotels: seed.hotels.slice(0, 12) });
    insertTestBooking(first, {
      hotelId: "hotel-001",
      stay: { checkIn: "2026-11-13", checkOut: "2026-11-15" },
      lines: [{ roomTypeId: "hotel-001-standard", quantity: 1 }],
    });
    const before = first.select().from(bookings).all();
    first.$client.close();
    opened.splice(0);

    const second = track(openDb(file));
    expect(countHotels(second)).toBe(12);
    expect(second.select().from(roomTypes).all()).toHaveLength(24);
    expect(second.select().from(bookings).all()).toEqual(before);
    expect(before).toHaveLength(1);
  });
});

describe("getDb", () => {
  it("opens the file named by CHECKINN_DB_PATH, once per process", () => {
    const file = path.join(dir, "custom.db");
    process.env.CHECKINN_DB_PATH = file;

    const db = track(getDb());

    expect(existsSync(file)).toBe(true);
    expect(countHotels(db)).toBe(120);
    expect(getDb()).toBe(db);
  });
});
