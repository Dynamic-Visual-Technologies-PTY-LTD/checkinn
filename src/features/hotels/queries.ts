import "server-only";
import { io } from "next/cache";
import { getDb } from "@/db/client";
import type { PhotoCredits, Stay } from "@/domain/types";
import { availabilityFor } from "@/features/hotels/availability.repo";
import { listPhotoCredits } from "@/features/hotels/credits.repo";

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

/** Every seed photo credit for `/credits`, read at request time (AD-2). */
export async function getPhotoCredits(): Promise<PhotoCredits> {
  await io();
  return listPhotoCredits(getDb());
}
