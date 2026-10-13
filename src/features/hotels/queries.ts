import "server-only";
import { io } from "next/cache";
import { getDb } from "@/db/client";
import type { Stay } from "@/domain/types";
import { availabilityFor } from "@/features/hotels/availability.repo";

/**
 * Availability per Room type for a Hotel and Stay, read at request time
 * (AD-2, AD-4). Pages call this; the booking transaction calls
 * `availabilityFor` directly.
 */
export async function getAvailability(
  hotelId: string,
  stay: Stay,
): Promise<Map<string, number>> {
  await io();
  return availabilityFor(getDb(), hotelId, stay);
}
