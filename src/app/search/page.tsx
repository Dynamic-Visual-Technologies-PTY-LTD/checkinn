import type { Metadata } from "next";
import { Suspense } from "react";
import { ResultsSkeleton, SearchResults } from "@/app/search/search-results";
import { SearchBarSkeleton } from "@/components/search-bar";
import { getCityNamed } from "@/features/search/queries";

/** "Cape Town hotels" for a City, otherwise "Search results" (EXPERIENCE.md Page titles). */
export async function generateMetadata({
  searchParams,
}: PageProps<"/search">): Promise<Metadata> {
  const { q } = await searchParams;
  const city = await getCityNamed((Array.isArray(q) ? q[0] : q) ?? "");
  return { title: city ? `${city} hotels` : "Search results" };
}

/**
 * Search results (FR-3, FR-5–FR-8). The shell prerenders; the URL is read
 * only inside the Suspense boundary (AD-2).
 */
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="mx-auto w-full max-w-page px-gutter pt-space-xl pb-space-xl">
      <Suspense
        fallback={
          <>
            <SearchBarSkeleton collapsed />
            <ResultsSkeleton />
          </>
        }
      >
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
