import { Suspense } from "react";
import { AvailabilityAlert } from "@/app/hotels/[hotelId]/availability-alert";
import { RoomSelectionPanel } from "@/app/hotels/[hotelId]/room-selection";
import { RoomTable, RoomTableSkeleton } from "@/app/hotels/[hotelId]/room-table";
import { DatesFieldProvider, StayPartyPicker } from "@/app/hotels/[hotelId]/stay-party-picker";
import { Icon } from "@/components/icons/icons";
import { STALE_LINK_MESSAGE } from "@/domain/criteria";
import { availabilityHeadingId } from "@/domain/hotel";
import {
  clampSelection,
  loweredMessage,
  ranOutLines,
  roomRanOutMessage,
} from "@/domain/selection";
import type { HotelPage, IsoDate, SearchCriteria, Stay } from "@/domain/types";
import { getAvailability } from "@/features/hotels/queries";

/** What the Hotel page read from the URL, for the Availability section. */
export type AvailabilityContext = {
  today: IsoDate;
  /** The current instant, read at request time, for the cancellation deadline. */
  now: string;
  criteria: SearchCriteria;
  /** The URL's dates or Party were rejected: show the stale-link message. */
  stale: boolean;
};

const STEPS = ["Your selection", "Your details", "Confirmation"];

/**
 * The Availability section (FR-16 to FR-18): the room-ran-out alert, the step
 * indicator, the heading See rooms focuses, the Stay and Party picker, then
 * the room table and booking summary. Availability loads inside its own
 * Suspense boundary, keyed by the Stay so the table shows its skeleton while
 * the picker stays put.
 */
export function AvailabilitySection({
  hotel,
  context: { today, now, criteria, stale },
}: {
  hotel: HotelPage;
  context: AvailabilityContext;
}) {
  const { stay, notice } = criteria;

  return (
    <section
      id={`availability-${hotel.hotelId}`}
      aria-labelledby={availabilityHeadingId(hotel.hotelId)}
      className="mt-section"
    >
      {stay && notice?.type === "room-unavailable" && (
        <Suspense fallback={null}>
          <RoomRanOutAlert hotel={hotel} stay={stay} today={today} criteria={criteria} />
        </Suspense>
      )}
      <ol aria-label="Booking steps" className="flex flex-wrap gap-x-space-lg gap-y-space-sm">
        {STEPS.map((step, index) => (
          <li
            key={step}
            aria-current={index === 0 ? "step" : undefined}
            className={
              index === 0
                ? "border-b-2 border-secondary pb-space-xs text-label-md"
                : "text-label-sm text-on-surface-muted"
            }
          >
            {index + 1} {step}
          </li>
        ))}
      </ol>
      <h2
        id={availabilityHeadingId(hotel.hotelId)}
        tabIndex={-1}
        className="mt-space-lg text-headline-md"
      >
        Availability
      </h2>
      <DatesFieldProvider>
      <div className="mt-space-lg">
        <StayPartyPicker
          hotelId={hotel.hotelId}
          today={today}
          q={criteria.q}
          stay={stay}
          party={criteria.party}
          datesError={stale ? STALE_LINK_MESSAGE : undefined}
        />
      </div>
      {stay ? (
        <Suspense key={`${stay.checkIn}/${stay.checkOut}`} fallback={<RoomTableSkeleton />}>
          <AvailabilityResults
            hotel={hotel}
            stay={stay}
            today={today}
            now={now}
            criteria={criteria}
          />
        </Suspense>
      ) : (
        <div className="mt-space-lg">
          <div className="mb-space-lg flex items-start gap-space-sm rounded-md border border-primary bg-surface p-space-md">
            <Icon name="info" className="mt-0.5 shrink-0" />
            <p>Select dates to see this property&apos;s availability and prices</p>
          </div>
          <RoomTable
            rooms={hotel.rooms}
            nights={null}
            availability={null}
            selection={[]}
          />
        </div>
      )}
      </DatesFieldProvider>
    </section>
  );
}

/**
 * The Room types the room-ran-out notice can name: those in `rt` that the
 * URL's selection asks for more of than are left.
 */
function ranOutFor(hotel: HotelPage, criteria: SearchCriteria, availability: Map<string, number>) {
  const { notice } = criteria;
  if (notice?.type !== "room-unavailable") return [];
  return ranOutLines(notice.roomTypeIds, criteria.sel, hotel.rooms, availability);
}

/**
 * The room-ran-out alert (EXPERIENCE.md Room ran out at confirm). It reads
 * Availability at request time to name only the Room types the guest asked
 * for more of than are left; with nothing to name there is no alert.
 */
export async function RoomRanOutAlert({
  hotel,
  stay,
  today,
  criteria,
}: {
  hotel: HotelPage;
  stay: Stay;
  today: IsoDate;
  criteria: SearchCriteria;
}) {
  const availability = await getAvailability(hotel.hotelId, stay);
  const lines = ranOutFor(hotel, criteria, availability);
  if (lines.length === 0) return null;
  return <AvailabilityAlert message={roomRanOutMessage(lines)} today={today} />;
}

/** Reads Availability at request time (AD-2, AD-4) and hands the room table its data. */
export async function AvailabilityResults({
  hotel,
  stay,
  today,
  now,
  criteria,
}: {
  hotel: HotelPage;
  stay: Stay;
  today: IsoDate;
  now: string;
  criteria: SearchCriteria;
}) {
  const availability = await getAvailability(hotel.hotelId, stay);
  const { selection, lowered } = clampSelection(criteria.sel, hotel.rooms, availability);
  // The room-ran-out alert already names its Room types; the live region
  // announces only the other lowered lines.
  const named = new Set(ranOutFor(hotel, criteria, availability).map((line) => line.roomTypeId));
  const unnamed = lowered.filter((line) => !named.has(line.roomTypeId));
  return (
    <RoomSelectionPanel
      hotelId={hotel.hotelId}
      hotelName={hotel.name}
      rooms={hotel.rooms}
      cancellationPolicy={hotel.cancellationPolicy}
      checkInTime={hotel.checkInTime}
      today={today}
      now={now}
      q={criteria.q}
      stay={stay}
      party={criteria.party}
      availability={Object.fromEntries(availability)}
      initialSelection={selection}
      loweredNotice={loweredMessage(unnamed)}
      selectionLowered={lowered.length > 0}
    />
  );
}
