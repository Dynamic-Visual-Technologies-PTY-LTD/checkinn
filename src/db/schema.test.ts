// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { BOOKING_STATUSES as SCHEMA_STATUSES, hotels } from "@/db/schema";
import { createTestDb, insertTestBooking } from "@/db/test-db";
import { BOOKING_STATUSES, CANCELLATION_POLICIES } from "@/domain/types";

// The data layer keeps its own copy of values the domain defines, because
// `src/db` imports nothing from `src/domain` (AD-1). These tests, which may
// import both, hold the copies equal.

const stay = { checkIn: "2026-11-13", checkOut: "2026-11-15" };
const opened: Db[] = [];

function open(): Db {
  const db = createTestDb();
  opened.push(db);
  return db;
}

afterEach(() => {
  for (const db of opened.splice(0)) db.$client.close();
});

describe("Booking statuses", () => {
  it("lists the same statuses as the domain", () => {
    expect([...SCHEMA_STATUSES]).toEqual([...BOOKING_STATUSES]);
  });

  it("lets the database store every domain status", () => {
    const db = open();
    for (const status of BOOKING_STATUSES) {
      expect(() =>
        insertTestBooking(db, {
          hotelId: "hotel-001",
          stay,
          lines: [{ roomTypeId: "hotel-001-standard", quantity: 1 }],
          status,
        }),
      ).not.toThrow();
    }
  });

  it("makes the database refuse any other status", () => {
    const db = open();
    expect(() =>
      insertTestBooking(db, {
        hotelId: "hotel-001",
        stay,
        lines: [{ roomTypeId: "hotel-001-standard", quantity: 1 }],
        status: "pending" as (typeof BOOKING_STATUSES)[number],
      }),
    ).toThrow(/CHECK constraint failed/);
  });
});

describe("Cancellation policies", () => {
  it("stores only domain policies in the seeded catalog", () => {
    const db = open();
    const policies = new Set(
      db
        .select({ policies: hotels.policies })
        .from(hotels)
        .all()
        .map((row) => row.policies.cancellation.type),
    );
    expect([...policies].sort()).toEqual([...CANCELLATION_POLICIES].sort());
  });
});
