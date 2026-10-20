import { io } from "next/cache";
import { Suspense, type ReactNode } from "react";
import { CityTiles, CityTilesSkeleton } from "@/components/city-tiles";
import { SearchBar } from "@/components/search-bar";
import { SearchStateProvider } from "@/components/search-state";
import { SmartSearchBox } from "@/components/smart-search/smart-search-box";
import { SmartSearchProvider } from "@/components/smart-search/smart-search-provider";
import { todayIn } from "@/domain/clock";
import { defaultCriteria } from "@/domain/criteria";
import { getCityTiles, getSmartSearchConfig } from "@/features/search/queries";

/**
 * Reads today at request time, inside the Suspense boundary (AD-2), so the
 * default Stay is never frozen into the build. The provider shares the search
 * bar's live Stay and Party with the City tile links. With a Provider
 * configured, the Smart search box sits above the search bar (FR-1);
 * without one, Home is the MVP Home (FR-2).
 */
export async function HomeSearch() {
  await io();
  const today = todayIn();
  const smartSearch = await getSmartSearchConfig();
  const { stay, party } = defaultCriteria(today);
  const content = (
    <SearchStateProvider initialStay={stay} initialParty={party}>
      {smartSearch && (
        <div className="mt-space-xl">
          <SmartSearchBox />
        </div>
      )}
      <div className={smartSearch ? "mt-space-md" : "mt-space-xl"}>
        <SearchBar today={today} />
      </div>
      <ExploreSection>
        <Suspense fallback={<CityTilesSkeleton />}>
          <CatalogCityTiles />
        </Suspense>
      </ExploreSection>
    </SearchStateProvider>
  );
  return smartSearch ? <SmartSearchProvider>{content}</SmartSearchProvider> : content;
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
