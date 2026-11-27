import { io } from "next/cache";
import { Suspense, type ReactNode } from "react";
import { CityTiles, CityTilesSkeleton } from "@/components/city-tiles";
import { SearchBar } from "@/components/search-bar";
import { SearchStateProvider } from "@/components/search-state";
import { todayIn } from "@/domain/clock";
import { defaultCriteria } from "@/domain/criteria";
import { getCityTiles } from "@/features/search/queries";

/**
 * Reads today at request time, inside the Suspense boundary (AD-2), so the
 * default Stay is never frozen into the build. The provider shares the search
 * bar's live Stay and Party with the City tile links.
 */
export async function HomeSearch() {
  await io();
  const today = todayIn();
  const { stay, party } = defaultCriteria(today);
  return (
    <SearchStateProvider initialStay={stay} initialParty={party}>
      <div className="mt-space-xl">
        <SearchBar today={today} />
      </div>
      <ExploreSection>
        <Suspense fallback={<CityTilesSkeleton />}>
          <CatalogCityTiles />
        </Suspense>
      </ExploreSection>
    </SearchStateProvider>
  );
}

export function ExploreSection({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="explore-heading" className="pt-section">
      <h2 id="explore-heading" className="text-headline-md">
        Explore a city
      </h2>
      <div className="mt-space-lg">{children}</div>
    </section>
  );
}

/** Reads the tiles at request time, inside the Suspense boundary (AD-2). */
async function CatalogCityTiles() {
  const tiles = await getCityTiles();
  return <CityTiles tiles={tiles} />;
}
