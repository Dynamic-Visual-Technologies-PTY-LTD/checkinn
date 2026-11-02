"use client";

import type { ReactNode } from "react";
import { CancellationLineText } from "@/components/cancellation-line";
import { countLabel } from "@/components/occupancy-field";
import type { CancellationLine } from "@/domain/cancellation";
import { nightsBetween, nightsLabel, stayLabel } from "@/domain/dates";
import { roomsLabel } from "@/domain/selection";
import type { BookingLineView, Party, Stay } from "@/domain/types";
import { formatZar } from "@/lib/format";

type BookingSummaryProps = {
  hotelName: string;
  stay: Stay;
  party: Party;
  lines: BookingLineView[];
  roomCount: number;
  totalRand: number;
  /** Left out where the page shows the cancellation state itself (the Booking view). */
  cancellation?: CancellationLine;
  /** "Thandi Nkosi", once the Booking exists. */
  guestName?: string;
  /** The step's primary button (Reserve, Confirm booking), or null for none. */
  action: ReactNode;
  /**
   * One muted line before the total: on the Hotel page, why the Best-fit
   * room is already selected (EXPERIENCE.md Booking summary (changed)).
   */
  note?: string;
};

/**
 * The booking summary panel (FR-18, DESIGN.md Booking summary), the same on
 * the Hotel page, Booking details and the confirmation: the Hotel, dates and
 * Nights, Party, each line, the total, the cancellation line, and the step's
 * primary button.
 */
export function BookingSummary({
  hotelName,
  stay,
  party,
  lines,
  roomCount,
  totalRand,
  cancellation,
  guestName,
  action,
  note,
}: BookingSummaryProps) {
  const nights = nightsLabel(nightsBetween(stay.checkIn, stay.checkOut));
  const people = [countLabel("adults", party.adults)];
  if (party.children > 0) people.push(countLabel("children", party.children));

  return (
    <div className="rounded-md border border-primary bg-neutral p-space-lg">
      <h3 className="text-headline-sm">{hotelName}</h3>
      <div className="mt-space-md flex flex-col gap-space-xs text-body-sm">
        <p>{stayLabel(stay)}</p>
        <p className="text-on-surface-muted">
          {nights}, {people.join(", ")}
        </p>
        {guestName && <p className="text-on-surface-muted">Guest: {guestName}</p>}
      </div>
      <hr className="my-space-md border-outline" />
      <p className="text-body-sm text-on-surface-muted">{roomsLabel(roomCount)} selected</p>
      <ul className="mt-space-xs flex flex-col gap-space-xs text-body-sm">
        {lines.map((line) => (
          <li key={line.roomTypeId} className="flex justify-between gap-space-md">
            <span>
              {line.quantity} × {line.name}
            </span>
            <span className="whitespace-nowrap">
              {formatZar(line.lineTotalRand, { cents: true })}
            </span>
          </li>
        ))}
      </ul>
      {note && <p className="mt-space-sm text-body-sm text-on-surface-muted">{note}</p>}
      <hr className="my-space-md border-outline" />
      <p aria-live="polite" className="flex items-baseline justify-between gap-space-md">
        <span className="text-headline-sm">Total</span>
        <span className="text-price-lg whitespace-nowrap">
          {formatZar(totalRand, { cents: true })}
        </span>
      </p>
      <p className="mt-space-xs text-body-sm text-on-surface-muted">
        Includes taxes. No extra fees.
      </p>
      {cancellation && (
        <div className="mt-space-md text-body-sm">
          <CancellationLineText line={cancellation} />
        </div>
      )}
      {action ? <div className="mt-space-lg">{action}</div> : null}
    </div>
  );
}
