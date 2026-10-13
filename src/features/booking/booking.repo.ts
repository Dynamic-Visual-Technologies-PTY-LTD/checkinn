import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { roomTypes } from "@/db/schema";
import type { SelectableRoom } from "@/domain/selection";

/**
 * A Hotel's Room types with what the selection rules need, in seed order.
 * Empty for an unknown Hotel. Booking writes join this file in a later story
 * (AD-3).
 */
export function hotelRooms(db: Db, hotelId: string): SelectableRoom[] {
  return db
    .select({
      id: roomTypes.id,
      name: roomTypes.name,
      maxGuests: roomTypes.maxGuests,
      nightlyRand: roomTypes.pricePerNightRand,
    })
    .from(roomTypes)
    .where(eq(roomTypes.hotelId, hotelId))
    .orderBy(asc(roomTypes.position))
    .all();
}
