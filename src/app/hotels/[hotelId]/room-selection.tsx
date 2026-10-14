"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BookingSummary } from "@/app/hotels/[hotelId]/booking-summary";
import { MobileSummaryBar } from "@/app/hotels/[hotelId]/mobile-summary-bar";
import { RoomTable } from "@/app/hotels/[hotelId]/room-table";
import { useDatesField } from "@/app/hotels/[hotelId]/stay-party-picker";
import { Icon } from "@/components/icons/icons";
import { cancellationLine } from "@/domain/cancellation";
import { parseCriteria, serializeCriteria } from "@/domain/criteria";
import { nightsBetween } from "@/domain/dates";
import {
  reserveBlock,
  roomCount,
  selectionTotalRand,
  summaryLines,
  withQuantity,
} from "@/domain/selection";
import type {
  CancellationPolicy,
  IsoDate,
  Party,
  RoomOption,
  RoomSelection,
  Stay,
} from "@/domain/types";
import { startBooking } from "@/features/booking/actions";

type RoomSelectionProps = {
  hotelId: string;
  hotelName: string;
  rooms: RoomOption[];
  cancellationPolicy: CancellationPolicy;
  checkInTime: string;
  today: IsoDate;
  q: string;
  stay: Stay;
  party: Party;
  availability: Record<string, number>;
  /** The URL's selection, already clamped to Availability on the server. */
  initialSelection: RoomSelection[];
  /** Said once on arrival when a new Stay lowered a chosen quantity. */
  loweredNotice: string;
};

function selectionKey(selection: readonly RoomSelection[]): string {
  return selection.map((line) => `${line.roomTypeId}:${line.quantity}`).join(",");
}

/** Writes the selection into the address bar: replace, never push (EXPERIENCE.md Navigation). */
function replaceSelectionInUrl(selection: RoomSelection[], today: IsoDate) {
  const { criteria } = parseCriteria(new URLSearchParams(window.location.search), today, {
    defaultStay: false,
  });
  const query = serializeCriteria({
    ...criteria,
    sel: selection.length > 0 ? selection : null,
  });
  window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
}

/**
 * The room table, booking summary and phone summary bar, around one
 * client-side selection (FR-17, FR-18). The selection starts from the URL and
 * is written back with `replaceState`; Reserve calls `startBooking`.
 */
export function RoomSelectionPanel({
  hotelId,
  hotelName,
  rooms,
  cancellationPolicy,
  checkInTime,
  today,
  q,
  stay,
  party,
  availability,
  initialSelection,
  loweredNotice,
}: RoomSelectionProps) {
  const [selection, setSelection] = useState(initialSelection);
  const [seenKey, setSeenKey] = useState(selectionKey(initialSelection));
  const liveRef = useRef<HTMLParagraphElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const datesField = useDatesField();

  // Back and Forward bring a new selection from the URL.
  const incomingKey = selectionKey(initialSelection);
  if (incomingKey !== seenKey) {
    setSeenKey(incomingKey);
    setSelection(initialSelection);
  }

  // A live region announces only changes made after it is in the page.
  // The server clamped the URL's selection; the address bar follows it.
  useEffect(() => {
    if (liveRef.current) liveRef.current.textContent = loweredNotice;
    if (loweredNotice) replaceSelectionInUrl(initialSelection, today);
  }, [loweredNotice, initialSelection, today]);

  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const lines = summaryLines(selection, rooms, nights);
  const totalRand = selectionTotalRand(lines);
  const count = roomCount(selection);
  const allSoldOut = rooms.every((room) => (availability[room.id] ?? 0) === 0);
  const block = reserveBlock(selection, rooms, party.adults + party.children);

  function onQuantityChange(roomTypeId: string, quantity: number) {
    const next = withQuantity(selection, rooms, roomTypeId, quantity);
    setSelection(next);
    setError(null);
    replaceSelectionInUrl(next, today);
  }

  function reserve() {
    setError(null);
    startTransition(async () => {
      const result = await startBooking({ hotelId, q, stay, party, sel: selection });
      // Success redirects and never returns.
      if (result && !result.ok) setError(result.message);
    });
  }

  const reserveProps = {
    block: pending ? { kind: "empty" as const, message: "Reserving…" } : block,
    onReserve: reserve,
    error,
  };
  const summary = (
    <BookingSummary
      hotelName={hotelName}
      stay={stay}
      party={party}
      lines={lines}
      roomCount={count}
      totalRand={totalRand}
      cancellation={cancellationLine(cancellationPolicy, stay.checkIn, checkInTime)}
      reserve={allSoldOut ? null : reserveProps}
    />
  );

  return (
    <div className="mt-space-lg">
      <p ref={liveRef} role="status" className="sr-only" />
      {allSoldOut && (
        <div className="mb-space-lg flex items-start gap-space-sm rounded-md border border-primary bg-surface p-space-md">
          <Icon name="info" className="mt-0.5 shrink-0" />
          <p>
            No rooms left for these dates. Try other dates.{" "}
            <a
              href={`#availability-${hotelId}`}
              onClick={(event) => {
                event.preventDefault();
                datesField.focus();
              }}
              className="underline hover:text-tertiary"
            >
              Change dates
            </a>
          </p>
        </div>
      )}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-space-lg">
        <RoomTable
          rooms={rooms}
          nights={nights}
          availability={availability}
          selection={selection}
          onQuantityChange={onQuantityChange}
        />
        {/* From 768px the summary is a panel (sticky from 1024px); below it, the bar and sheet. */}
        <aside
          aria-label="Booking summary"
          className="mt-space-lg hidden md:block lg:sticky lg:top-28 lg:mt-0"
        >
          {summary}
        </aside>
      </div>
      {!allSoldOut && (
        <>
          <MobileSummaryBar
            roomCount={count}
            totalRand={totalRand}
            reserve={reserveProps}
            summary={summary}
          />
          <div aria-hidden="true" className="h-24 md:hidden" />
        </>
      )}
    </div>
  );
}
