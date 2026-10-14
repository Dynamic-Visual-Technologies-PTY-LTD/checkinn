import type { Metadata } from "next";
import { Suspense } from "react";
import { BookContent, BookSkeleton, bookPageTitle, loadBookPage } from "@/app/book/book-content";

/** "Your details · Harbourlight Retreat" (EXPERIENCE.md Page titles). */
export async function generateMetadata({ searchParams }: PageProps<"/book">): Promise<Metadata> {
  return { title: bookPageTitle(await loadBookPage(await searchParams)) };
}

/**
 * Booking details (FR-21), step 2 of the booking flow. The shell prerenders;
 * the URL, the clock and the database are read only inside the Suspense
 * boundary (AD-2).
 */
export default function BookPage({ searchParams }: PageProps<"/book">) {
  return (
    <div className="mx-auto w-full max-w-page px-gutter pt-space-xl pb-space-xl">
      <Suspense fallback={<BookSkeleton />}>
        <BookContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
