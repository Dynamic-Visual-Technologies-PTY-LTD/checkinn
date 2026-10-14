import Link from "next/link";
import { BookingSteps } from "@/components/booking-steps";
import { BookingSummary } from "@/components/booking-summary";
import { Icon } from "@/components/icons/icons";
import { PageHeading } from "@/components/page-heading";
import { ReferenceBlock } from "@/components/reference-block";
import type { CancellationLine } from "@/domain/cancellation";
import { managePath } from "@/domain/reference";
import type { BookingView } from "@/domain/types";

/**
 * The confirmation (EXPERIENCE.md Booked, FR-22): step 3, the Mint tick,
 * "You're booked!", the reference block and "Manage this booking", with the
 * Booking's stored summary beside it on desktop and after it on phone. Shown
 * on `/bookings/[reference]`, and on `/book` when the guest comes back to a
 * step they already confirmed.
 */
export function BookingConfirmation({
  booking,
  cancellation,
}: {
  booking: BookingView;
  /** The line for the stored policy and deadline, at request time. */
  cancellation: CancellationLine;
}) {
  return (
    <>
      <BookingSteps current={3} />
      <div className="mt-space-xl grid grid-cols-1 gap-space-xl lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div className="min-w-0">
          <span className="inline-flex size-16 items-center justify-center rounded-full border-2 border-success text-success">
            <Icon name="check" className="size-10" />
          </span>
          <div className="mt-space-lg">
            <PageHeading className="text-headline-display-responsive">You&apos;re booked!</PageHeading>
          </div>
          <div className="mt-space-xl">
            <ReferenceBlock reference={booking.reference} />
          </div>
          <p className="mt-space-lg">
            Keep this reference. You need it and your email to manage this booking.
          </p>
          <p className="mt-space-sm">
            <Link
              href={managePath(booking.reference)}
              prefetch={false}
              className="inline-flex min-h-11 items-center underline hover:text-tertiary"
            >
              Manage this booking
            </Link>
          </p>
        </div>
        <aside aria-label="Booking summary">
          <h2 className="sr-only">
            Booking summary
          </h2>
          <BookingSummary
            hotelName={booking.hotelName}
            stay={booking.stay}
            party={booking.party}
            lines={booking.lines}
            roomCount={booking.roomCount}
            totalRand={booking.bookingTotalRand}
            cancellation={cancellation}
            guestName={booking.guestName}
            action={null}
          />
        </aside>
      </div>
    </>
  );
}
