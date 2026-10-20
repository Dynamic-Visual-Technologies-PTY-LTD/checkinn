/**
 * Rooms auto-raise (FR-4, AD-26): the fewest Rooms of one Room type that
 * sleep the Party. Availability is not considered.
 */
import { PARTY_LIMITS } from "@/domain/criteria";
import type { Party } from "@/domain/types";

/**
 * The smallest `ceil(guests / maxGuests)` over the Room types, capped by the
 * adults (the MVP rule) and the codec's Rooms limit. An empty list, or one
 * with no usable `maxGuests`, keeps the Party's current Rooms.
 */
export function fewestRooms(
  party: Party,
  roomTypes: readonly { maxGuests: number }[],
): number {
  const guests = party.adults + party.children;
  const counts = roomTypes
    .filter((type) => Number.isInteger(type.maxGuests) && type.maxGuests >= 1)
    .map((type) => Math.ceil(guests / type.maxGuests));
  if (counts.length === 0) return party.rooms;
  const fewest = Math.min(...counts, party.adults, PARTY_LIMITS.rooms.max);
  return Math.max(PARTY_LIMITS.rooms.min, fewest);
}
