import { Suspense } from "react";
import { ExploreSection, HomeSearch } from "@/app/home-search";
import { CityTilesSkeleton } from "@/components/city-tiles";
import { SearchBarSkeleton } from "@/components/search-bar";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-page px-gutter pt-space-xl pb-space-xl">
      <h1 className="text-headline-display-responsive text-primary">
        Find your stay.
      </h1>
      <p className="mt-space-lg text-body-lg">
        Hotels across South Africa. Pick your dates and book in
        a few steps.
      </p>

      <Suspense
        fallback={
          <>
            <div className="mt-space-xl">
              <SearchBarSkeleton />
            </div>
            <ExploreSection>
              <CityTilesSkeleton />
            </ExploreSection>
          </>
        }
      >
        <HomeSearch />
      </Suspense>
    </div>
  );
}
