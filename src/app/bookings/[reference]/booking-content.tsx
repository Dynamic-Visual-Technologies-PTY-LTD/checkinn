import { io } from "next/cache";
import { redirect } from "next/navigation";
import { BookingConfirmation, manageBookingHref } from "@/components/booking-confirmation";
import { snapshotCancellationLine } from "@/domain/cancellation";
import { nowIso } from "@/domain/clock";
import { normaliseReference } from "@/domain/reference";
import { getBooking } from "@/features/booking/queries";

/**
 * The confirmation for `/bookings/[reference]` (FR-22). The reference is
 * normalised, so `ci-7k3p9q` works. The Booking shows only to a browser
 * whose access cookie holds its token (AD-15); without one, or for an unknown
 * reference, the guest is sent to look it up with their email.
 */
export async function BookingContent({ params }: { params: Promise<{ reference: string }> }) {
  const reference = normaliseReference((await params).reference);
  const booking = await getBooking(reference);
  if (!booking) redirect(manageBookingHref(reference));

  await io();
  const cancellation = snapshotCancellationLine(
    booking.cancellationPolicy,
    booking.cancellationDeadline,
    nowIso(),
  );
  return <BookingConfirmation booking={booking} cancellation={cancellation} />;
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
