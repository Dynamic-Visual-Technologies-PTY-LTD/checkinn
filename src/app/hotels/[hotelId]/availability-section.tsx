import { Suspense } from "react";
import { AvailabilityAlert } from "@/app/hotels/[hotelId]/availability-alert";
import { RoomSelectionPanel } from "@/app/hotels/[hotelId]/room-selection";
import { RoomTable, RoomTableSkeleton } from "@/app/hotels/[hotelId]/room-table";
import { DatesFieldProvider, StayPartyPicker } from "@/app/hotels/[hotelId]/stay-party-picker";
import { Icon } from "@/components/icons/icons";
import { STALE_LINK_MESSAGE } from "@/domain/criteria";
import { availabilityHeadingId } from "@/domain/hotel";
import { clampSelection, loweredMessage, roomRanOutMessage } from "@/domain/selection";
import type { HotelPage, IsoDate, SearchCriteria, Stay } from "@/domain/types";
import { getAvailability } from "@/features/hotels/queries";

/** What the Hotel page read from the URL, for the Availability section. */
export type AvailabilityContext = {
  today: IsoDate;
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
  context: { today, criteria, stale },
}: {
  hotel: HotelPage;
  context: AvailabilityContext;
}) {
  const { stay } = criteria;
  const { notice } = criteria;
  const ranOut =
    notice?.type === "room-unavailable"
      ? hotel.rooms.filter((room) => notice.roomTypeIds.includes(room.id)).map((room) => room.name)
      : null;

  return (
    <section
      id={`availability-${hotel.hotelId}`}
      aria-labelledby={availabilityHeadingId(hotel.hotelId)}
      className="mt-section"
    >
      {ranOut && <AvailabilityAlert message={roomRanOutMessage(ranOut)} />}
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
          <AvailabilityResults hotel={hotel} stay={stay} today={today} criteria={criteria} />
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

/** Reads Availability at request time (AD-2, AD-4) and hands the room table its data. */
export async function AvailabilityResults({
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
  const { selection, lowered } = clampSelection(criteria.sel, hotel.rooms, availability);
  return (
    <RoomSelectionPanel
      hotelId={hotel.hotelId}
      hotelName={hotel.name}
      rooms={hotel.rooms}
      cancellationPolicy={hotel.cancellationPolicy}
      checkInTime={hotel.checkInTime}
      today={today}
      q={criteria.q}
      stay={stay}
      party={criteria.party}
      availability={Object.fromEntries(availability)}
      initialSelection={selection}
      loweredNotice={loweredMessage(lowered)}
    />
  );
}
