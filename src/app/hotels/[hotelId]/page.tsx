import type { Metadata } from "next";
import { Suspense } from "react";
import { HotelContent, HotelSkeleton } from "@/app/hotels/[hotelId]/hotel-details";
import { getHotelPage } from "@/features/hotels/queries";

/** "Harbourlight Retreat" (EXPERIENCE.md Page titles). */
export async function generateMetadata({
  params,
}: PageProps<"/hotels/[hotelId]">): Promise<Metadata> {
  const { hotelId } = await params;
  const hotel = await getHotelPage(hotelId);
  return { title: hotel ? hotel.name : "Page not found" };
}

/**
 * The Hotel page (FR-9–FR-14). The shell prerenders; the id and the URL are
 * read only inside the Suspense boundary (AD-2).
 */
export default function HotelPage({ params, searchParams }: PageProps<"/hotels/[hotelId]">) {
  return (
    <div className="mx-auto w-full max-w-page px-gutter pt-space-xl pb-space-xl">
      <Suspense fallback={<HotelSkeleton />}>
        <HotelContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
