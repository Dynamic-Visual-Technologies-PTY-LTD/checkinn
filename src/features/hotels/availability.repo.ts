import { and, eq, gt, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { bookingLines, bookings, roomTypes } from "@/db/schema";
import { countAvailable } from "@/domain/availability";
import type { Stay } from "@/domain/types";

/**
 * Availability for every Room type of a Hotel over a Stay (AD-4): the number
 * of Rooms free on every Night, keyed by Room type id. The only Availability
 * computation; search, the room table and confirm all call it. Synchronous,
 * so the booking transaction can call it too (AD-3).
 *
 * Only Confirmed Booking lines whose Stay overlaps the requested one are
 * loaded. A Room type is available when its count is at least 1.
 */
export function availabilityFor(
  db: Db,
  hotelId: string,
  stay: Stay,
): Map<string, number> {
  const types = db
    .select({ id: roomTypes.id, totalRooms: roomTypes.totalRooms })
    .from(roomTypes)
    .where(eq(roomTypes.hotelId, hotelId))
    .orderBy(roomTypes.position)
    .all();

  const lines = db
    .select({
      roomTypeId: bookingLines.roomTypeId,
      quantity: bookingLines.quantity,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
    })
    .from(bookingLines)
    .innerJoin(bookings, eq(bookings.id, bookingLines.bookingId))
    .where(
      and(
        eq(bookings.hotelId, hotelId),
        eq(bookings.status, "confirmed"),
        lt(bookings.checkIn, stay.checkOut),
        gt(bookings.checkOut, stay.checkIn),
      ),
    )
    .all();

  return new Map(
    types.map((type) => [
      type.id,
      countAvailable(
        type.totalRooms,
        lines.filter((line) => line.roomTypeId === type.id),
        stay,
      ),
    ]),
  );
}
