import { randomUUID } from "node:crypto";

/**
 * A guest email no other spec or run uses, so Bookings made by booking specs
 * never collide on lookup (AD-18). Uses the reserved `.test` domain.
 */
export function uniqueGuestEmail(label = "guest"): string {
  return `${label}-${randomUUID()}@checkinn.test`;
}
