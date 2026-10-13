// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb, insertTestBooking } from "@/db/test-db";
import { availabilityFor } from "./availability.repo";

let db: Db;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.$client.close();
});

const weekend = { checkIn: "2026-11-13", checkOut: "2026-11-15" };

describe("availabilityFor", () => {
  it("gives every Room type its inventory when nothing is booked", () => {
    expect(availabilityFor(db, "hotel-001", weekend)).toEqual(
      new Map([
        ["hotel-001-standard", 10],
        ["hotel-001-family", 4],
      ]),
    );
  });

  it("gives 0 for a Room type with no inventory", () => {
    expect(availabilityFor(db, "hotel-002", weekend).get("hotel-002-family")).toBe(0);
  });

  it("is empty for an unknown Hotel", () => {
    expect(availabilityFor(db, "hotel-999", weekend).size).toBe(0);
  });

  describe("with a Booking from 13 to 15 November", () => {
    beforeEach(() => {
      insertTestBooking(db, {
        hotelId: "hotel-001",
        stay: weekend,
        lines: [
          { roomTypeId: "hotel-001-standard", quantity: 3 },
          { roomTypeId: "hotel-001-family", quantity: 1 },
        ],
      });
    });

    it("does not count it for a Stay from its check-out", () => {
      const stay = { checkIn: "2026-11-15", checkOut: "2026-11-16" };
      expect(availabilityFor(db, "hotel-001", stay).get("hotel-001-standard")).toBe(10);
    });

    it("does not count it for a Stay ending on its check-in", () => {
      const stay = { checkIn: "2026-11-12", checkOut: "2026-11-13" };
      expect(availabilityFor(db, "hotel-001", stay).get("hotel-001-standard")).toBe(10);
    });

    it("counts it for a Stay on a Night it covers", () => {
      const stay = { checkIn: "2026-11-14", checkOut: "2026-11-15" };
      expect(availabilityFor(db, "hotel-001", stay)).toEqual(
        new Map([
          ["hotel-001-standard", 7],
          ["hotel-001-family", 3],
        ]),
      );
    });

    it("does not affect another Hotel", () => {
      expect(availabilityFor(db, "hotel-005", weekend).get("hotel-005-standard")).toBe(14);
    });
  });

  it("subtracts the busiest Night across overlapping Bookings", () => {
    insertTestBooking(db, {
      hotelId: "hotel-001",
      stay: { checkIn: "2026-11-12", checkOut: "2026-11-14" },
      lines: [{ roomTypeId: "hotel-001-standard", quantity: 4 }],
    });
    insertTestBooking(db, {
      hotelId: "hotel-001",
      stay: { checkIn: "2026-11-14", checkOut: "2026-11-20" },
      lines: [{ roomTypeId: "hotel-001-standard", quantity: 5 }],
    });

    expect(availabilityFor(db, "hotel-001", weekend).get("hotel-001-standard")).toBe(5);
  });

  it("ignores cancelled Bookings", () => {
    insertTestBooking(db, {
      hotelId: "hotel-001",
      stay: weekend,
      status: "cancelled",
      lines: [{ roomTypeId: "hotel-001-standard", quantity: 10 }],
    });

    expect(availabilityFor(db, "hotel-001", weekend).get("hotel-001-standard")).toBe(10);
  });
});
