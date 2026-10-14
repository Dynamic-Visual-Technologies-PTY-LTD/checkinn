import { io } from "next/cache";
import { redirect } from "next/navigation";
import { BookingView } from "@/app/bookings/[reference]/booking-view";
import { BookingConfirmation } from "@/components/booking-confirmation";
import { cancelState, snapshotCancellationLine } from "@/domain/cancellation";
import { nowIso } from "@/domain/clock";
import { parseNotice } from "@/domain/criteria";
import { managePath, normaliseReference } from "@/domain/reference";
import { getBooking, wasJustBooked } from "@/features/booking/queries";

/**
 * `/bookings/[reference]` (FR-22, FR-23, FR-24). The reference is
 * normalised, so `ci-7k3p9q` works. The Booking shows only to a browser whose
 * access cookie holds its token (AD-15); without one, or for an unknown
 * reference, the guest is sent to look it up with their email.
 *
 * Right after confirming, this browser's just-booked cookie lists the
 * reference and the page is the confirmation, "You're booked!", even after a
 * reload. Otherwise (after a lookup, or once cancelled) it is the Booking
 * view. Only `notice=cancelled` is ever read from the URL.
 */
export async function BookingContent({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const reference = normaliseReference((await params).reference);
  const booking = await getBooking(reference);
  if (!booking) redirect(managePath(reference));

  const justCancelled =
    parseNotice(await searchParams)?.type === "cancelled" && booking.status === "cancelled";
  const justBooked =
    booking.status === "confirmed" && !justCancelled && (await wasJustBooked(reference));

  await io();
  const now = nowIso();
  const cancellation = snapshotCancellationLine(
    booking.cancellationPolicy,
    booking.cancellationDeadline,
    now,
  );
  if (justBooked) return <BookingConfirmation booking={booking} cancellation={cancellation} />;
  return (
    <BookingView
      booking={booking}
      state={cancelState(booking, now)}
      cancellation={cancellation}
      justCancelled={justCancelled}
    />
  );
}

/** The page's shape while the Booking loads (DESIGN.md Skeleton). */
export function BookingSkeleton() {
  const block = "rounded-md bg-primary-subtle motion-safe:animate-pulse";
  return (
    <div aria-hidden="true">
      <div className={`h-6 w-full max-w-md ${block}`} />
      <div className="mt-space-xl grid grid-cols-1 gap-space-xl lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-space-lg">
          <div className={`size-16 rounded-full ${block}`} />
          <div className={`h-14 w-2/3 ${block}`} />
          <div className={`h-12 w-1/2 ${block}`} />
        </div>
        <div className={`h-80 ${block}`} />
      </div>
    </div>
  );
}
