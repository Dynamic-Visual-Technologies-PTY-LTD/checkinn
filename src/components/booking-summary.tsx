"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/icons/icons";
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
  cancellation: CancellationLine;
  /** "Thandi Nkosi", once the Booking exists. */
  guestName?: string;
  /** The step's primary button (Reserve, Confirm booking), or null for none. */
  action: ReactNode;
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
      <div className="mt-space-md text-body-sm">
        {cancellation.kind === "free" ? (
          <p className="flex flex-wrap items-center gap-x-space-sm gap-y-space-xs">
            <span className="rounded-full bg-success px-space-sm text-label-md text-on-success">
              Free cancellation
            </span>
            <span>{cancellation.until}</span>
          </p>
        ) : cancellation.kind === "ended" ? (
          <p>{cancellation.text}</p>
        ) : (
          <p className="flex items-start gap-space-xs">
            <Icon name="warning" className="mt-0.5 shrink-0" />
            {cancellation.text}
          </p>
        )}
      </div>
      {action ? <div className="mt-space-lg">{action}</div> : null}
    </div>
  );
}
