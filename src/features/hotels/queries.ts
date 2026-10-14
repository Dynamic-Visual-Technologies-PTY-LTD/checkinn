import "server-only";
import { io } from "next/cache";
import { cache } from "react";
import { getDb } from "@/db/client";
import type { HotelPage, IsoDate, PhotoCredits, Stay } from "@/domain/types";
import { availabilityFor } from "@/features/hotels/availability.repo";
import { listPhotoCredits } from "@/features/hotels/credits.repo";
import { hotelPage } from "@/features/hotels/hotel.repo";

/**
 * One Availability read per request (React `cache`), keyed on primitive
 * values: a `Stay` object would be a new key on every call. Called only
 * after `io()` (AD-2).
 */
const availabilityForRequest = cache(
  async (hotelId: string, checkIn: IsoDate, checkOut: IsoDate): Promise<Map<string, number>> =>
    availabilityFor(getDb(), hotelId, { checkIn, checkOut }),
);

/** One Hotel page read per request (React `cache`). Called only after `io()` (AD-2). */
const hotelPageForRequest = cache(
  async (hotelId: string): Promise<HotelPage | null> => hotelPage(getDb(), hotelId),
);

/**
 * Availability per Room type for a Hotel and Stay, read at request time
 * (AD-2, AD-4). Pages call this; the booking transaction calls
 * `availabilityFor` directly. Calls with the same Hotel and Stay in one
 * request share one read, so the Hotel page's room-ran-out alert and room
 * table agree. Callers must not change the returned Map.
 */
export async function getAvailability(
  hotelId: string,
  stay: Stay,
): Promise<Map<string, number>> {
  await io();
  return availabilityForRequest(hotelId, stay.checkIn, stay.checkOut);
}

/** Every seed photo credit for `/credits`, read at request time (AD-2). */
export async function getPhotoCredits(): Promise<PhotoCredits> {
  await io();
  return listPhotoCredits(getDb());
}

/**
 * The Hotel page view model, or null for an unknown id, read at request time
 * (AD-2). The page title and the content share one read per request.
 */
export async function getHotelPage(hotelId: string): Promise<HotelPage | null> {
  await io();
  return hotelPageForRequest(hotelId);
}
