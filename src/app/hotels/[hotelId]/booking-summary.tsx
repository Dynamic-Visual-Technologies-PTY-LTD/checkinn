"use client";

import { useId } from "react";
import { primaryButton } from "@/components/button-styles";
import { Icon } from "@/components/icons/icons";
import { countLabel } from "@/components/occupancy-field";
import type { CancellationLine } from "@/domain/cancellation";
import { nightsBetween, nightsLabel, stayLabel } from "@/domain/dates";
import { roomsLabel, type ReserveBlock, type SummaryLine } from "@/domain/selection";
import type { Party, Stay } from "@/domain/types";
import { formatZar } from "@/lib/format";

/** Reserve: `aria-disabled` stays focusable and described by its reason. */
export const reserveButton = `${primaryButton} aria-disabled:cursor-default aria-disabled:bg-surface aria-disabled:text-on-surface-disabled aria-disabled:hover:bg-surface aria-disabled:hover:text-on-surface-disabled aria-disabled:border-2 aria-disabled:border-on-surface-disabled`;

export type ReserveProps = {
  /** Why Reserve is off, or null when it is on. */
  block: ReserveBlock | null;
  onReserve: () => void;
  /** The `startBooking` failure message, if the last try failed. */
  error: string | null;
};

/**
 * The reason above Reserve and the Reserve button itself. The reason is in a
 * polite live region, so a fit message is announced.
 */
export function ReserveButton({
  block,
  onReserve,
  error,
  inBar = false,
}: ReserveProps & {
  /** In the phone bar the reason spans the bar above the text and button. */
  inBar?: boolean;
}) {
  const reasonId = useId();
  const reason = (
    <div
      aria-live="polite"
      className={`flex flex-col gap-space-xs text-body-sm ${inBar ? "order-first col-span-2" : ""}`}
    >
      {block && (
        <p id={reasonId} className="flex items-start gap-space-xs">
          {block.kind === "capacity" && <Icon name="warning" className="mt-0.5 shrink-0" />}
          {block.message}
        </p>
      )}
      {error && (
        <p className="flex items-start gap-space-xs text-error">
          <Icon name="error" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
  const button = (
    <button
      type="button"
      aria-disabled={block ? true : undefined}
      aria-describedby={block ? reasonId : undefined}
      onClick={() => {
        if (!block) onReserve();
      }}
      className={`${reserveButton} ${inBar ? "min-w-36" : "w-full"}`}
    >
      Reserve
    </button>
  );
  if (inBar) {
    return (
      <>
        {reason}
        {button}
      </>
    );
  }
  return (
    <div className="flex flex-col gap-space-sm">
      {reason}
      {button}
    </div>
  );
}

type BookingSummaryProps = {
  hotelName: string;
  stay: Stay;
  party: Party;
  lines: SummaryLine[];
  roomCount: number;
  totalRand: number;
  cancellation: CancellationLine;
  /** Without it the summary has no Reserve (every Room type sold out). */
  reserve: ReserveProps | null;
};

/** The booking summary panel (FR-18, DESIGN.md Booking summary). */
export function BookingSummary({
  hotelName,
  stay,
  party,
  lines,
  roomCount,
  totalRand,
  cancellation,
  reserve,
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
      </div>
      <hr className="my-space-md border-outline" />
      <p className="text-body-sm text-on-surface-muted">{roomsLabel(roomCount)} selected</p>
      <ul className="mt-space-xs flex flex-col gap-space-xs text-body-sm">
        {lines.map((line) => (
          <li key={line.roomTypeId} className="flex justify-between gap-space-md">
            <span>
              {line.quantity} × {line.name}
            </span>
            <span>{formatZar(line.lineTotalRand, { cents: true })}</span>
          </li>
        ))}
      </ul>
      <hr className="my-space-md border-outline" />
      <p aria-live="polite" className="flex items-baseline justify-between gap-space-md">
        <span className="text-headline-sm">Total</span>
        <span className="text-price-lg">{formatZar(totalRand, { cents: true })}</span>
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
        ) : (
          <p className="flex items-start gap-space-xs">
            <Icon name="warning" className="mt-0.5 shrink-0" />
            {cancellation.text}
          </p>
        )}
      </div>
      {reserve && (
        <div className="mt-space-lg">
          <ReserveButton {...reserve} />
        </div>
      )}
    </div>
  );
}
