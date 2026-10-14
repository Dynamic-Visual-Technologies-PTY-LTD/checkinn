import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingContent, BookingSkeleton } from "@/app/bookings/[reference]/booking-content";
import { normaliseReference } from "@/domain/reference";

/** "Booking CI-7K3P9Q" (EXPERIENCE.md Page titles). Reads nothing but the URL. */
export async function generateMetadata({
  params,
}: PageProps<"/bookings/[reference]">): Promise<Metadata> {
  const { reference } = await params;
  return { title: `Booking ${normaliseReference(reference)}` };
}

/**
 * The confirmation, step 3 of the booking flow (FR-22). The shell
 * prerenders; the reference, the cookie and the database are read only
 * inside the Suspense boundary (AD-2).
 */
export default function BookingPage({ params }: PageProps<"/bookings/[reference]">) {
  return (
    <div className="mx-auto w-full max-w-page px-gutter pt-space-xl pb-space-xl">
      <Suspense fallback={<BookingSkeleton />}>
        <BookingContent params={params} />
      </Suspense>
    </div>
  );
}
