"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ReserveButton } from "@/app/hotels/[hotelId]/reserve-button";
import { RoomTable } from "@/app/hotels/[hotelId]/room-table";
import { useDatesField } from "@/app/hotels/[hotelId]/stay-party-picker";
import { BookingSummary } from "@/components/booking-summary";
import { Icon } from "@/components/icons/icons";
import { MobileSummaryBar } from "@/components/mobile-summary-bar";
import { cancellationLine } from "@/domain/cancellation";
import { hotelQuery, parseCriteria } from "@/domain/criteria";
import { nightsBetween } from "@/domain/dates";
import { availabilitySectionId } from "@/domain/hotel";
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
  /** The current instant, read at request time, for the cancellation deadline. */
  now: string;
  q: string;
  stay: Stay;
  party: Party;
  availability: Record<string, number>;
  /** The URL's selection, already clamped to Availability on the server. */
  initialSelection: RoomSelection[];
  /**
   * Said once on arrival when a new Stay lowered a chosen quantity. Leaves
   * out the lines the room-ran-out alert already names.
   */
  loweredNotice: string;
  /** The server lowered the URL's selection, so the address bar follows it. */
  selectionLowered: boolean;
  /** The Room type whose row carries the Best-fit chip (AD-26), or null. */
  bestFitRoomTypeId?: string | null;
  /**
   * The selection is the server's Best-fit pre-selection, not the URL's `sel`:
   * the booking summary explains it until the Guest changes a quantity.
   */
  preselected?: boolean;
};

function selectionKey(selection: readonly RoomSelection[]): string {
  return selection.map((line) => `${line.roomTypeId}:${line.quantity}`).join(",");
}

/**
 * Writes the selection into the address bar: replace, never push (EXPERIENCE.md
 * Navigation). Smart search parameters are dropped: the Hotel page never
 * carries them. `bestFit` is kept, so a reload still shows the chip (AD-21).
 * An empty selection writes no `sel`, so a reload pre-selects the Best-fit
 * room again (AD-26).
 */
export function replaceSelectionInUrl(selection: RoomSelection[], today: IsoDate) {
  const { criteria } = parseCriteria(new URLSearchParams(window.location.search), today, {
    defaultStay: false,
  });
  const query = hotelQuery({ ...criteria, sel: selection.length > 0 ? selection : null });
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
  now,
  q,
  stay,
  party,
  availability,
  initialSelection,
  loweredNotice,
  selectionLowered,
  bestFitRoomTypeId = null,
  preselected = false,
}: RoomSelectionProps) {
  const [selection, setSelection] = useState(initialSelection);
  // The server selection last applied. Each server render (a Party or Stay
  // change, Back, Forward) sends a new array, even with the same content.
  const [seen, setSeen] = useState(initialSelection);
  // The Guest has changed a quantity since the Best-fit pre-selection.
  const [touched, setTouched] = useState(false);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const datesField = useDatesField();

  // A new server selection (Back, Forward, or a Party change that re-runs the
  // Best-fit pre-selection) replaces the Guest's local one when it differs,
  // even if it equals the previous server selection. An echo of the Guest's
  // own selection changes nothing.
  if (initialSelection !== seen) {
    setSeen(initialSelection);
    if (selectionKey(initialSelection) !== selectionKey(selection)) {
      setSelection(initialSelection);
      setTouched(false);
    }
  }

  // A live region announces only changes made after it is in the page.
  // The server clamped the URL's selection; the address bar follows it.
  useEffect(() => {
    if (liveRef.current) liveRef.current.textContent = loweredNotice;
    if (selectionLowered) replaceSelectionInUrl(initialSelection, today);
  }, [loweredNotice, selectionLowered, initialSelection, today]);

  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const lines = summaryLines(selection, rooms, nights);
  const totalRand = selectionTotalRand(lines);
  const count = roomCount(selection);
  const allSoldOut = rooms.every((room) => (availability[room.id] ?? 0) === 0);
  const block = reserveBlock(selection, rooms, party.adults + party.children);

  function onQuantityChange(roomTypeId: string, quantity: number) {
    const next = withQuantity(selection, rooms, roomTypeId, quantity);
    setSelection(next);
    setTouched(true);
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
  // EXPERIENCE.md Booking summary (changed): explains the pre-selection until
  // the first quantity change.
  const bestFitName = rooms.find((room) => room.id === bestFitRoomTypeId)?.name;
  const note =
    preselected && !touched && bestFitName
      ? `${bestFitName} picked for your search. Change it in the table.`
      : undefined;
  const summary = (
    <BookingSummary
      hotelName={hotelName}
      stay={stay}
      party={party}
      lines={lines}
      roomCount={count}
      totalRand={totalRand}
      cancellation={cancellationLine(cancellationPolicy, stay.checkIn, checkInTime, now)}
      note={note}
      action={allSoldOut ? null : <ReserveButton {...reserveProps} />}
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
              href={`#${availabilitySectionId(hotelId)}`}
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
          bestFitRoomTypeId={bestFitRoomTypeId}
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
            action={<ReserveButton {...reserveProps} inBar />}
            summary={summary}
          />
          <div aria-hidden="true" className="h-24 md:hidden" />
        </>
      )}
    </div>
  );
}
