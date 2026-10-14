import type { ReactNode } from "react";
import { CancelBooking } from "@/app/bookings/[reference]/cancel-booking";
import { CancelledAlert } from "@/app/bookings/[reference]/cancelled-alert";
import { BookingSummary } from "@/components/booking-summary";
import { CancellationLineText } from "@/components/cancellation-line";
import { PageHeading } from "@/components/page-heading";
import {
  type CancellationLine,
  type CancelState,
  instantDateLabel,
} from "@/domain/cancellation";
import type { BookingView as BookingViewModel } from "@/domain/types";

type BookingViewProps = {
  booking: BookingViewModel;
  /** Whether it can be cancelled now (`cancelState`, at request time). */
  state: CancelState;
  /** The line for the stored policy and deadline, at request time. */
  cancellation: CancellationLine;
  /** Show "Your booking is cancelled.": the guest just cancelled it. */
  justCancelled: boolean;
};

function Row({ term, children, first = false }: { term: string; children: ReactNode; first?: boolean }) {
  return (
    <div
      className={`grid grid-cols-1 gap-space-xs py-space-md sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center sm:gap-space-md ${first ? "" : "border-t border-outline"}`}
    >
      <dt className="text-body-sm text-on-surface-muted">{term}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/**
 * The Booking view (EXPERIENCE.md Booking view, FR-23, FR-24): status,
 * reference, guest and Hotel, then the cancellation state, beside the stored
 * summary on desktop and after it on phone. Read from the snapshot only
 * (AD-16). The four cancellation states:
 *
 * - open: the Mint "Free cancellation" badge with the deadline and Cancel booking
 * - deadline passed: "Free cancellation ended on …", no button
 * - Non-refundable: "Non-refundable. This booking can't be cancelled.", no button
 * - cancelled: status Cancelled with the date, no button
 */
export function BookingView({ booking, state, cancellation, justCancelled }: BookingViewProps) {
  return (
    <div className="grid grid-cols-1 gap-space-xl lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-space-lg">
        <PageHeading>Your booking</PageHeading>
        {justCancelled && <CancelledAlert />}
        <dl>
          <Row term="Status" first>
            {booking.status === "cancelled" ? (
              <>
                <span className="text-headline-sm">Cancelled</span>
                {booking.cancelledAt && (
                  <span className="text-on-surface-muted">
                    {" "}
                    on {instantDateLabel(booking.cancelledAt)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-headline-sm">Confirmed</span>
            )}
          </Row>
          <Row term="Booking reference">
            <span className="select-all">{booking.reference}</span>
          </Row>
          <Row term="Guest">{booking.guestName}</Row>
          <Row term="Hotel">{booking.hotelName}</Row>
        </dl>
        {state === "open" && cancellation.kind === "free" ? (
          <CancelBooking
            reference={booking.reference}
            hotelName={booking.hotelName}
            stay={booking.stay}
            line={cancellation}
          />
        ) : state === "deadline-passed" || state === "non-refundable" ? (
          <div className="text-body-sm">
            <CancellationLineText line={cancellation} />
          </div>
        ) : null}
      </div>
      <aside aria-label="Booking summary">
        <h2 className="sr-only">Booking summary</h2>
        <BookingSummary
          hotelName={booking.hotelName}
          stay={booking.stay}
          party={booking.party}
          lines={booking.lines}
          roomCount={booking.roomCount}
          totalRand={booking.bookingTotalRand}
          guestName={booking.guestName}
          action={null}
        />
      </aside>
    </div>
  );
}
