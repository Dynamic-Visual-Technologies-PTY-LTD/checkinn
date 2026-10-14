import type { Metadata } from "next";
import { Suspense } from "react";
import { ManageContent, ManageFormSkeleton } from "@/app/manage/manage-content";
import { PageHeading } from "@/components/page-heading";

/** "Manage booking · CheckInn" (EXPERIENCE.md Page titles). */
export const metadata: Metadata = { title: "Manage booking" };

/**
 * Manage booking (FR-23): look a Booking up by its reference and email. The
 * headline prerenders; the URL's reference is read only inside the Suspense
 * boundary (AD-2).
 */
export default function ManagePage({ searchParams }: PageProps<"/manage">) {
  return (
    <div className="mx-auto w-full max-w-page px-gutter pt-space-xl pb-space-xl">
      <div className="max-w-xl">
        <PageHeading>Manage booking</PageHeading>
        <p className="mt-space-md">
          Enter your booking reference and the email you booked with.
        </p>
        <div className="mt-space-lg">
          <Suspense fallback={<ManageFormSkeleton />}>
            <ManageContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
