import { io } from "next/cache";
import { Suspense } from "react";
import { ExploreSection } from "@/app/home-search";
import { ResultsHeading } from "@/app/search/results-heading";
import { CityTiles } from "@/components/city-tiles";
import { ListingCard, ListingCardSkeleton } from "@/components/listing-card";
import { SearchBar } from "@/components/search-bar";
import { SearchStateProvider } from "@/components/search-state";
import { todayIn } from "@/domain/clock";
import {
  hotelHref,
  parseCriteria,
  serializeCriteria,
  STALE_LINK_MESSAGE,
} from "@/domain/criteria";
import type { SearchCriteria } from "@/domain/types";
import { getCityTiles, searchHotels } from "@/features/search/queries";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Reads the URL and today at request time, inside the Suspense boundary
 * (AD-2), and parses them with the criteria codec (AD-8). Stale or invalid
 * criteria show the stale-link state and run no search.
 */
export async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  await io();
  const today = todayIn();
  const { criteria } = parseCriteria(params, today);
  // `/search` reads only the search criteria; a bad `sel` is not its concern.
  const stale = criteria.stay === null;

  return (
    // Keyed by the criteria, so a new search or Back starts from the URL.
    <SearchStateProvider
      key={serializeCriteria(criteria)}
      initialStay={criteria.stay}
      initialParty={criteria.party}
    >
      <SearchBar
        today={today}
        initialQuery={criteria.q}
        collapsible
        datesError={stale ? STALE_LINK_MESSAGE : undefined}
      />
      {stale ? (
        <h1 className="sr-only">Search results</h1>
      ) : (
        <Suspense fallback={<ResultsSkeleton />}>
          <Results criteria={criteria} />
        </Suspense>
      )}
    </SearchStateProvider>
  );
}

/** The result heading and Listing cards, or the no-results state (FR-7, FR-8). */
export async function Results({ criteria }: { criteria: SearchCriteria }) {
  const { heading, cards } = await searchHotels(criteria);

  if (!heading) {
    const tiles = await getCityTiles();
    return (
      <>
        <div className="mt-space-xl flex flex-col gap-space-md">
          <ResultsHeading>Nothing matches that search.</ResultsHeading>
          <p className="text-body-lg">Try another city, other dates or fewer rooms.</p>
        </div>
        <ExploreSection>
          <CityTiles tiles={tiles} />
        </ExploreSection>
      </>
    );
  }

  const linkCriteria = { q: criteria.q, stay: criteria.stay, party: criteria.party };
  return (
    <>
      <div className="mt-space-xl">
        <ResultsHeading>{heading}</ResultsHeading>
      </div>
      <ul className="mt-space-lg flex flex-col gap-space-md">
        {cards.map((card) => (
          <li key={card.hotelId}>
            <ListingCard card={card} href={hotelHref(card.hotelId, linkCriteria)} />
          </li>
        ))}
      </ul>
    </>
  );
}

/** Three skeleton Listing cards under a heading-sized block (EXPERIENCE.md Loading results). */
export function ResultsSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mt-space-xl h-10 w-2/3 rounded-md bg-primary-subtle motion-safe:animate-pulse md:w-1/2" />
      <div className="mt-space-lg flex flex-col gap-space-md">
        <ListingCardSkeleton />
        <ListingCardSkeleton />
        <ListingCardSkeleton />
      </div>
    </div>
  );
}
