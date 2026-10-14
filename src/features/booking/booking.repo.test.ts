// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { bookingLines, bookings } from "@/db/schema";
import { createTestDb, insertTestBooking } from "@/db/test-db";
import { validateGuest, type GuestDetails } from "@/domain/guest";
import type { Stay } from "@/domain/types";
import { availabilityFor } from "@/features/hotels/availability.repo";
import {
  bookingByKey,
  bookingByLookup,
  bookingByReference,
  bookingQuote,
  cancelBooking,
  createBooking,
  type CreateBookingInput,
  hotelRooms,
} from "./booking.repo";

const REFERENCE = /^CI-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
const weekend: Stay = { checkIn: "2026-11-13", checkOut: "2026-11-15" };
const durban: Stay = { checkIn: "2026-11-13", checkOut: "2026-11-18" };

function guest(email = "thandi@example.com"): GuestDetails {
  const result = validateGuest({ firstName: "Thandi", lastName: "Nkosi", email });
  if (!result.ok) throw new Error("bad fixture guest");
  return result.guest;
}

let db: Db;
let count = 0;

beforeEach(() => {
  db = createTestDb();
});
afterEach(() => {
  db.$client.close();
});

function input(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  count += 1;
  return {
    hotelId: "hotel-001",
    stay: weekend,
    party: { adults: 2, children: 0, rooms: 1 },
    lines: [{ roomTypeId: "hotel-001-standard", quantity: 1 }],
    guest: guest(),
    idempotencyKey: `key-${count}`,
    accessToken: `token-${count}`,
    now: "2026-10-14T08:00:00.000Z",
    ...overrides,
  };
}

function bookingCount(): number {
  return db.select().from(bookings).all().length;
}

describe("createBooking", () => {
  it("confirms a Booking and lowers Availability for each Night of the Stay only", () => {
    const before = availabilityFor(db, "hotel-001", weekend).get("hotel-001-standard");
    const result = createBooking(db, input({ guest: guest(" Thandi@Example.COM ") }));

    expect(result).toMatchObject({ kind: "created" });
    if (result.kind !== "created") return;
    expect(result.reference).toMatch(REFERENCE);

    const row = db.select().from(bookings).where(eq(bookings.reference, result.reference)).get();
    expect(row).toMatchObject({
      status: "confirmed",
      hotelId: "hotel-001",
      checkIn: "2026-11-13",
      checkOut: "2026-11-15",
      adults: 2,
      children: 0,
      rooms: 1,
      email: "thandi@example.com",
      bookingTotalRand: 4900,
      cancellationPolicy: "non_refundable",
      cancellationDeadline: null,
      accessToken: result.accessToken,
    });
    expect(db.select().from(bookingLines).where(eq(bookingLines.bookingId, row!.id)).all()).toEqual(
      [
        {
          bookingId: row!.id,
          roomTypeId: "hotel-001-standard",
          quantity: 1,
          unitPriceRand: 2450,
          lineTotalRand: 4900,
        },
      ],
    );

    for (const night of [
      { checkIn: "2026-11-13", checkOut: "2026-11-14" },
      { checkIn: "2026-11-14", checkOut: "2026-11-15" },
    ]) {
      expect(availabilityFor(db, "hotel-001", night).get("hotel-001-standard")).toBe(before! - 1);
    }
    for (const night of [
      { checkIn: "2026-11-12", checkOut: "2026-11-13" },
      { checkIn: "2026-11-15", checkOut: "2026-11-16" },
    ]) {
      expect(availabilityFor(db, "hotel-001", night).get("hotel-001-standard")).toBe(before);
    }
  });

  it("stores two lines, their total and the free-cancellation deadline (Coral Coast)", () => {
    const result = createBooking(
      db,
      input({
        hotelId: "hotel-005",
        stay: durban,
        party: { adults: 2, children: 3, rooms: 2 },
        lines: [
          { roomTypeId: "hotel-005-family", quantity: 1 },
          { roomTypeId: "hotel-005-standard", quantity: 1 },
        ],
      }),
    );
    if (result.kind !== "created") throw new Error(result.kind);

    const row = db.select().from(bookings).where(eq(bookings.reference, result.reference)).get()!;
    expect(row.bookingTotalRand).toBe(24750);
    expect(row.cancellationPolicy).toBe("free_until_48_hours_before_check_in");
    expect(row.cancellationDeadline).toBe("2026-11-11T12:00:00.000Z");
    const lines = db
      .select({
        roomTypeId: bookingLines.roomTypeId,
        quantity: bookingLines.quantity,
        unitPriceRand: bookingLines.unitPriceRand,
        lineTotalRand: bookingLines.lineTotalRand,
      })
      .from(bookingLines)
      .where(eq(bookingLines.bookingId, row.id))
      .all();
    expect(lines).toEqual(
      expect.arrayContaining([
        { roomTypeId: "hotel-005-standard", quantity: 1, unitPriceRand: 2200, lineTotalRand: 11000 },
        { roomTypeId: "hotel-005-family", quantity: 1, unitPriceRand: 2750, lineTotalRand: 13750 },
      ]),
    );
    expect(lines).toHaveLength(2);
  });

  it("books the last Room once: the second create reports it ran out and inserts nothing", () => {
    insertTestBooking(db, {
      hotelId: "hotel-001",
      stay: weekend,
      lines: [{ roomTypeId: "hotel-001-family", quantity: 3 }],
    });
    const family = [{ roomTypeId: "hotel-001-family", quantity: 1 }];

    const first = createBooking(db, input({ lines: family }));
    const second = createBooking(db, input({ lines: family }));

    expect(first.kind).toBe("created");
    expect(second).toEqual({ kind: "unavailable", roomTypeIds: ["hotel-001-family"] });
    expect(bookingCount()).toBe(2);
  });

  it("inserts nothing when one of two lines no longer fits, and names only that one", () => {
    insertTestBooking(db, {
      hotelId: "hotel-001",
      stay: { checkIn: "2026-11-14", checkOut: "2026-11-16" },
      lines: [{ roomTypeId: "hotel-001-family", quantity: 4 }],
    });
    const before = bookingCount();

    const result = createBooking(
      db,
      input({
        lines: [
          { roomTypeId: "hotel-001-standard", quantity: 1 },
          { roomTypeId: "hotel-001-family", quantity: 1 },
        ],
      }),
    );

    expect(result).toEqual({ kind: "unavailable", roomTypeIds: ["hotel-001-family"] });
    expect(bookingCount()).toBe(before);
    expect(db.select().from(bookingLines).all()).toHaveLength(1);
  });

  it("returns the first Booking for a repeated key, without a second row", () => {
    const key = "repeat-key";
    const first = createBooking(db, input({ idempotencyKey: key }));
    if (first.kind !== "created") throw new Error(first.kind);

    const again = createBooking(
      db,
      input({ idempotencyKey: key, guest: guest("someone@example.com") }),
    );

    expect(again).toEqual({
      kind: "existing",
      reference: first.reference,
      accessToken: first.accessToken,
      email: "thandi@example.com",
    });
    expect(bookingCount()).toBe(1);
    expect(bookingByKey(db, key)).toEqual({
      reference: first.reference,
      accessToken: first.accessToken,
      email: "thandi@example.com",
    });
    expect(bookingByKey(db, "never-used")).toBeNull();
  });

  it("returns the first Booking for a repeated key even after its Rooms sold out", () => {
    const key = "sold-out-key";
    createBooking(db, input({ idempotencyKey: key }));
    insertTestBooking(db, {
      hotelId: "hotel-001",
      stay: weekend,
      lines: [{ roomTypeId: "hotel-001-standard", quantity: 9 }],
    });

    expect(createBooking(db, input({ idempotencyKey: key })).kind).toBe("existing");
  });

  it("generates a new reference on a collision", () => {
    const taken = createBooking(db, input({ newReference: () => "CI-AAAAAA" }));
    expect(taken).toMatchObject({ reference: "CI-AAAAAA" });

    const picks = ["CI-AAAAAA", "CI-AAAAAA", "CI-BBBBBB"];
    const result = createBooking(db, input({ newReference: () => picks.shift()! }));

    expect(result).toMatchObject({ kind: "created", reference: "CI-BBBBBB" });
  });

  it("rejects tampered lines and a party that does not fit, inserting nothing", () => {
    const cases: Partial<CreateBookingInput>[] = [
      { lines: [{ roomTypeId: "hotel-002-standard", quantity: 1 }] },
      { lines: [{ roomTypeId: "hotel-001-standard", quantity: 0 }] },
      { lines: [] },
      {
        lines: [
          { roomTypeId: "hotel-001-standard", quantity: 1 },
          { roomTypeId: "hotel-001-standard", quantity: 1 },
        ],
      },
      { party: { adults: 3, children: 0, rooms: 1 } },
      { hotelId: "nope" },
      { stay: { checkIn: "2026-11-15", checkOut: "2026-11-15" } },
    ];
    for (const overrides of cases) {
      expect(createBooking(db, input(overrides))).toEqual({ kind: "invalid" });
    }
    expect(bookingCount()).toBe(0);
  });
});

describe("hotelRooms", () => {
  it("lists a Hotel's Room types in seed order, and none for an unknown Hotel", () => {
    expect(hotelRooms(db, "hotel-001").map((room) => room.id)).toEqual([
      "hotel-001-standard",
      "hotel-001-family",
    ]);
    expect(hotelRooms(db, "nope")).toEqual([]);
  });
});

describe("bookingQuote", () => {
  const family = { adults: 2, children: 3, rooms: 2 };

  it("prices the selection as createBooking stores it, lines in the Hotel's order", () => {
    const quote = bookingQuote(db, {
      hotelId: "hotel-005",
      stay: durban,
      party: family,
      // The URL can list the lines in any order.
      lines: [
        { roomTypeId: "hotel-005-family", quantity: 1 },
        { roomTypeId: "hotel-005-standard", quantity: 1 },
      ],
    });

    expect(quote).toEqual({
      kind: "ok",
      quote: {
        hotelId: "hotel-005",
        hotelName: "Coral Coast Resort",
        checkInTime: "14:00",
        cancellationPolicy: "free_until_48_hours_before_check_in",
        stay: durban,
        party: family,
        lines: [
          {
            roomTypeId: "hotel-005-standard",
            name: "Standard Double",
            quantity: 1,
            lineTotalRand: 11000,
          },
          { roomTypeId: "hotel-005-family", name: "Family Room", quantity: 1, lineTotalRand: 13750 },
        ],
        roomCount: 2,
        totalRand: 24750,
      },
    });

    const created = createBooking(
      db,
      input({
        hotelId: "hotel-005",
        stay: durban,
        party: family,
        lines: [
          { roomTypeId: "hotel-005-family", quantity: 1 },
          { roomTypeId: "hotel-005-standard", quantity: 1 },
        ],
      }),
    );
    if (created.kind !== "created" || quote.kind !== "ok") throw new Error("expected both");
    const stored = bookingByReference(db, created.reference);
    expect(stored?.booking.lines).toEqual(quote.quote.lines);
    expect(stored?.booking.bookingTotalRand).toBe(quote.quote.totalRand);
  });

  it("tells an unknown Hotel apart from a selection that does not fit", () => {
    const base = { stay: weekend, party: { adults: 2, children: 0, rooms: 1 } };
    expect(
      bookingQuote(db, { ...base, hotelId: "nope", lines: [{ roomTypeId: "x", quantity: 1 }] }),
    ).toEqual({ kind: "no-hotel" });
    expect(
      bookingQuote(db, {
        ...base,
        hotelId: "hotel-001",
        lines: [{ roomTypeId: "hotel-005-standard", quantity: 1 }],
      }),
    ).toEqual({ kind: "invalid" });
    expect(
      bookingQuote(db, {
        ...base,
        hotelId: "hotel-005",
        party: { adults: 2, children: 3, rooms: 1 },
        lines: [{ roomTypeId: "hotel-005-family", quantity: 1 }],
      }),
    ).toEqual({ kind: "invalid" });
  });

  it("names the Room types that ran out", () => {
    insertTestBooking(db, {
      hotelId: "hotel-001",
      stay: weekend,
      lines: [{ roomTypeId: "hotel-001-standard", quantity: 10 }],
    });

    expect(
      bookingQuote(db, {
        hotelId: "hotel-001",
        stay: weekend,
        party: { adults: 2, children: 0, rooms: 1 },
        lines: [{ roomTypeId: "hotel-001-standard", quantity: 1 }],
      }),
    ).toEqual({ kind: "unavailable", roomTypeIds: ["hotel-001-standard"] });
  });
});

describe("bookingByReference", () => {
  it("reads the snapshot, the guest name and the token", () => {
    const created = createBooking(db, input({ accessToken: "secret-token" }));
    if (created.kind !== "created") throw new Error("expected created");

    expect(bookingByReference(db, created.reference)).toEqual({
      id: expect.any(Number),
      accessToken: "secret-token",
      booking: {
        reference: created.reference,
        hotelId: "hotel-001",
        hotelName: "Harbourlight Retreat",
        status: "confirmed",
        stay: weekend,
        party: { adults: 2, children: 0, rooms: 1 },
        guestName: "Thandi Nkosi",
        lines: [
          {
            roomTypeId: "hotel-001-standard",
            name: "Standard Double",
            quantity: 1,
            lineTotalRand: 4900,
          },
        ],
        roomCount: 1,
        bookingTotalRand: 4900,
        cancellationPolicy: "non_refundable",
        cancellationDeadline: null,
        cancelledAt: null,
      },
    });
  });

  it("never recomputes prices from the catalog", () => {
    const created = createBooking(db, input());
    if (created.kind !== "created") throw new Error("expected created");
    db.update(bookingLines).set({ lineTotalRand: 1234 }).run();
    db.update(bookings).set({ bookingTotalRand: 1234 }).run();

    const stored = bookingByReference(db, created.reference);
    expect(stored?.booking.lines[0].lineTotalRand).toBe(1234);
    expect(stored?.booking.bookingTotalRand).toBe(1234);
  });

  it("is null for an unknown reference", () => {
    expect(bookingByReference(db, "CI-AAAAAA")).toBeNull();
  });
});

describe("bookingByLookup", () => {
  it("finds a Booking by its reference and email, and gives its token", () => {
    const created = createBooking(db, input({ accessToken: "lookup-token" }));
    if (created.kind !== "created") throw new Error("expected created");

    expect(bookingByLookup(db, created.reference, "thandi@example.com")).toEqual({
      reference: created.reference,
      accessToken: "lookup-token",
    });
  });

  it("is null for a wrong reference and for a right reference with another email", () => {
    const created = createBooking(db, input());
    if (created.kind !== "created") throw new Error("expected created");

    expect(bookingByLookup(db, "CI-AAAAAA", "thandi@example.com")).toBeNull();
    expect(bookingByLookup(db, created.reference, "sipho@example.com")).toBeNull();
  });
});

describe("cancelBooking", () => {
  /** Coral Coast Resort: Free cancellation, check-in 14:00, so the deadline is 2026-11-11T12:00Z. */
  function freeBooking(): number {
    const created = createBooking(
      db,
      input({
        hotelId: "hotel-005",
        stay: durban,
        lines: [{ roomTypeId: "hotel-005-standard", quantity: 1 }],
      }),
    );
    if (created.kind !== "created") throw new Error("expected created");
    const record = bookingByReference(db, created.reference);
    if (!record) throw new Error("expected the Booking");
    return record.id;
  }

  function stored(id: number) {
    return db.select().from(bookings).where(eq(bookings.id, id)).get();
  }

  it("cancels a Free cancellation Booking before its deadline and frees its Rooms", () => {
    const before = availabilityFor(db, "hotel-005", durban).get("hotel-005-standard") ?? 0;
    const id = freeBooking();
    expect(availabilityFor(db, "hotel-005", durban).get("hotel-005-standard")).toBe(before - 1);

    expect(cancelBooking(db, id, "2026-11-10T08:00:00.000Z")).toEqual({ kind: "cancelled" });

    expect(stored(id)).toMatchObject({
      status: "cancelled",
      cancelledAt: "2026-11-10T08:00:00.000Z",
    });
    expect(availabilityFor(db, "hotel-005", durban).get("hotel-005-standard")).toBe(before);
    // Only the status changed: the lines and the snapshot stay.
    expect(db.select().from(bookingLines).where(eq(bookingLines.bookingId, id)).all()).toHaveLength(
      1,
    );
  });

  it("refuses once the deadline has passed and changes nothing", () => {
    const id = freeBooking();
    expect(cancelBooking(db, id, "2026-11-11T12:00:00.000Z")).toEqual({
      kind: "deadline-passed",
    });
    expect(stored(id)).toMatchObject({ status: "confirmed", cancelledAt: null });
  });

  it("refuses a Non-refundable Booking and changes nothing", () => {
    const created = createBooking(db, input());
    if (created.kind !== "created") throw new Error("expected created");
    const id = bookingByReference(db, created.reference)!.id;

    expect(cancelBooking(db, id, "2026-10-14T08:00:00.000Z")).toEqual({ kind: "non-refundable" });
    expect(stored(id)).toMatchObject({ status: "confirmed", cancelledAt: null });
  });

  it("refuses a Booking that is already cancelled and keeps its first cancel time", () => {
    const id = freeBooking();
    cancelBooking(db, id, "2026-11-01T08:00:00.000Z");

    expect(cancelBooking(db, id, "2026-11-02T08:00:00.000Z")).toEqual({
      kind: "already-cancelled",
    });
    expect(stored(id)?.cancelledAt).toBe("2026-11-01T08:00:00.000Z");
  });

  it("is not-found for an unknown id", () => {
    expect(cancelBooking(db, 999_999, "2026-11-01T08:00:00.000Z")).toEqual({ kind: "not-found" });
  });

  it("reads the stored deadline, not one recomputed from the catalog", () => {
    const id = freeBooking();
    // A snapshot whose deadline has already passed, whatever the catalog says.
    db.update(bookings)
      .set({ cancellationDeadline: "2026-11-01T00:00:00.000Z" })
      .where(eq(bookings.id, id))
      .run();
    expect(cancelBooking(db, id, "2026-11-05T08:00:00.000Z")).toEqual({
      kind: "deadline-passed",
    });
  });

  it("shows the cancel time in the Booking's view", () => {
    const id = freeBooking();
    cancelBooking(db, id, "2026-11-01T08:00:00.000Z");
    const reference = stored(id)!.reference;
    expect(bookingByReference(db, reference)?.booking).toMatchObject({
      status: "cancelled",
      cancelledAt: "2026-11-01T08:00:00.000Z",
    });
  });
});
