import { type Db, openDb } from "@/db/client";
import { type BookingStatus, bookingLines, bookings } from "@/db/schema";
import type { Stay } from "@/domain/types";

/** A fresh `:memory:` database, migrated and seeded, for repo tests (AD-18). */
export function createTestDb(): Db {
  return openDb(":memory:");
}

let fixtureCount = 0;

/**
 * Inserts a fixture Booking with its lines, for repo tests only. The app
 * writes Bookings through `src/features/booking` alone (AD-3). Snapshot
 * values are placeholders: Availability reads only the Stay, status and
 * quantities.
 */
export function insertTestBooking(
  db: Db,
  booking: {
    hotelId: string;
    stay: Stay;
    lines: { roomTypeId: string; quantity: number }[];
    status?: BookingStatus;
  },
): number {
  fixtureCount += 1;
  const id = `TEST${String(fixtureCount).padStart(2, "0")}`;
  return db.transaction((tx) => {
    const row = tx
      .insert(bookings)
      .values({
        reference: `CI-${id}`,
        idempotencyKey: `key-${id}`,
        accessToken: `token-${id}`,
        hotelId: booking.hotelId,
        status: booking.status ?? "confirmed",
        checkIn: booking.stay.checkIn,
        checkOut: booking.stay.checkOut,
        adults: 2,
        children: 0,
        rooms: booking.lines.reduce((sum, line) => sum + line.quantity, 0),
        firstName: "Test",
        lastName: "Guest",
        email: "guest@example.test",
        bookingTotalRand: 0,
        cancellationPolicy: "non_refundable",
        createdAt: "2026-10-13T08:00:00.000Z",
      })
      .returning({ id: bookings.id })
      .get();
    tx.insert(bookingLines)
      .values(
        booking.lines.map((line) => ({
          bookingId: row.id,
          roomTypeId: line.roomTypeId,
          quantity: line.quantity,
          unitPriceRand: 0,
          lineTotalRand: 0,
        })),
      )
      .run();
    return row.id;
  });
}
