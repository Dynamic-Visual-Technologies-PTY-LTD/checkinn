"use server";
import "server-only";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { todayIn } from "@/domain/clock";
import { parseCriteria, serializeCriteria } from "@/domain/criteria";
import { clampSelection, reserveBlock } from "@/domain/selection";
import type { ActionResult, Party, RoomSelection, Stay } from "@/domain/types";
import { hotelRooms } from "@/features/booking/booking.repo";
import { availabilityFor } from "@/features/hotels/availability.repo";

export type StartBookingInput = {
  hotelId: string;
  q: string;
  stay: Stay | null;
  party: Party;
  sel: RoomSelection[];
};

function invalid(message: string): ActionResult {
  return { ok: false, code: "VALIDATION", message };
}

/**
 * Reserve (AD-10, FR-18): re-parses the criteria with the codec, checks the
 * selection against the Hotel's Room types, Availability and party fit, mints
 * the idempotency key and redirects to `/book`. Expected failures return an
 * `ActionResult`; success never returns.
 */
export async function startBooking(input: StartBookingInput): Promise<ActionResult> {
  let target: string;
  try {
    const params = new URLSearchParams(
      serializeCriteria({
        q: input.q,
        stay: input.stay,
        party: input.party,
        sel: input.sel,
      }),
    );
    const { criteria, problems } = parseCriteria(params, todayIn(), { defaultStay: false });

    if (problems.includes("sel-invalid") || !criteria.sel || criteria.sel.length === 0) {
      return invalid("Select at least one room.");
    }
    if (!criteria.stay) return invalid("Select dates to reserve a room.");

    const db = getDb();
    const rooms = hotelRooms(db, input.hotelId);
    if (rooms.length === 0) return invalid("We can't find that hotel.");
    if (criteria.sel.some((line) => !rooms.some((room) => room.id === line.roomTypeId))) {
      return invalid("Pick rooms from this hotel.");
    }

    const { lowered } = clampSelection(
      criteria.sel,
      rooms,
      availabilityFor(db, input.hotelId, criteria.stay),
    );
    if (lowered.length > 0) {
      return invalid("Some of those rooms are no longer available. Pick another room.");
    }

    const guests = criteria.party.adults + criteria.party.children;
    const block = reserveBlock(criteria.sel, rooms, guests);
    if (block) return invalid(block.message);

    target = `/book?${serializeCriteria({
      q: criteria.q,
      stay: criteria.stay,
      party: criteria.party,
      hotel: input.hotelId,
      sel: criteria.sel,
      k: randomUUID(),
    })}`;
  } catch (error) {
    // No personal data in the log (Consistency Conventions: Logging).
    console.error("startBooking failed", error instanceof Error ? error.name : "unknown");
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Something went wrong on our side. Try again.",
    };
  }
  // Outside the try: redirect() works by throwing.
  redirect(target);
}
