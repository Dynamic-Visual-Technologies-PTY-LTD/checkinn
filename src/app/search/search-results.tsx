import { io } from "next/cache";
import { Suspense } from "react";
import { ExploreSection } from "@/app/home-search";
import { CityTiles } from "@/components/city-tiles";
import { Icon } from "@/components/icons/icons";
import { ListingCard, ListingCardSkeleton } from "@/components/listing-card";
import { SearchBar } from "@/components/search-bar";
import { SearchStateProvider } from "@/components/search-state";
import { CriteriaChips } from "@/components/smart-search/criteria-chips";
import { ResultsHeading } from "@/components/smart-search/results-heading";
import { SmartSearchBox } from "@/components/smart-search/smart-search-box";
import {
  ResultsStatus,
  SmartPendingResults,
  SmartSearchProvider,
} from "@/components/smart-search/smart-search-provider";
import { todayIn } from "@/domain/clock";
import {
  hotelHref,
  parseCriteria,
  searchHref,
  serializeCriteria,
  STALE_LINK_MESSAGE,
} from "@/domain/criteria";
import { searchMode } from "@/domain/hard-criteria";
import type { SearchCriteria, SmartNotice } from "@/domain/types";
import { getCityTiles, getSmartSearchConfig, searchHotels } from "@/features/search/queries";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Reads the URL and today at request time, inside the Suspense boundary
 * (AD-2), and parses them with the criteria codec (AD-8). Stale or invalid
 * criteria show the stale-link state and run no search.
 *
 * With a Provider configured, the Smart search box sits above the search bar
 * and shows the submitted Query (FR-1, FR-3). Without one, Smart search
 * parameters are ignored and the page is the MVP page (FR-2).
 */
export async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  await io();
  const today = todayIn();
  const smartSearch = await getSmartSearchConfig();
  const parsed = parseCriteria(params, today).criteria;
  const criteria = smartSearch ? parsed : { ...parsed, smart: null };
  // `/search` reads only the search criteria; a bad `sel` is not its concern.
  const stale = criteria.stay === null;
  const query = criteria.smart?.query ?? "";
  // Criteria chips show in any mode but `mvp` (AD-20).
  // Not on a stale link, where no search runs until dates are picked.
  const chips = !stale && searchMode(smartSearch, criteria.smart) !== "mvp";
  const urlKey = serializeCriteria(criteria);
  const urlCriteria = {
    q: criteria.q,
    stay: criteria.stay,
    party: criteria.party,
    smart: criteria.smart,
  };

  const results = stale ? (
    <h1 className="sr-only">Search results</h1>
  ) : (
    <Suspense key={`results:${urlKey}`} fallback={<ResultsSkeleton />}>
      <Results criteria={criteria} />
    </Suspense>
  );

  const content = (
    // A new search or Back starts the box, the Search bar and the listing
    // from the URL: each is keyed by it. The chip row is not, so surviving
    // chips keep their DOM nodes and focus (AD-33).
    <SearchStateProvider
      resetKey={urlKey}
      initialStay={criteria.stay}
      initialParty={criteria.party}
    >
      {smartSearch && (
        <div key={`box:${urlKey}`} className="mb-space-md">
          <SmartSearchBox initialQuery={query} destination={criteria.q} />
        </div>
      )}
      <SearchBar
        key={`bar:${urlKey}`}
        today={today}
        initialQuery={criteria.q}
        collapsible
        datesError={stale ? STALE_LINK_MESSAGE : undefined}
        smart={criteria.smart}
      />
      {chips && <CriteriaChips criteria={urlCriteria} />}
      {smartSearch ? (
        <SmartPendingResults skeleton={<ResultsSkeleton />}>{results}</SmartPendingResults>
      ) : (
        results
      )}
    </SearchStateProvider>
  );

  // Outside the keyed provider, so its state and the results status survive
  // each new URL (AD-33).
  return smartSearch ? (
    <SmartSearchProvider initialQuery={query} url={searchHref(urlCriteria)}>
      {content}
      <ResultsStatus />
    </SmartSearchProvider>
  ) : (
    content
  );
}

/** A Smart search notice's stable id (EXPERIENCE.md Notices). */
function noticeId(notice: SmartNotice): string {
  return notice.kind === "place" ? "notice-place" : "notice-value";
}

/** A Smart search notice's copy (EXPERIENCE.md Voice and Tone). */
export function noticeMessage(notice: SmartNotice): string {
  if (notice.kind === "place") {
    return `We don't have hotels in ${notice.place}, so we're showing all cities.`;
  }
  const check = notice.about === "party" ? "check who's staying" : "check your dates";
  return `We couldn't use '${notice.text}', so ${check}.`;
}

/** The heading's `aria-describedby`: every shown notice's id, in priority order. */
function noticeIds(notices: readonly SmartNotice[]): string {
  return notices.map(noticeId).join(" ");
}

/**
 * The Smart search notices after the result heading (EXPERIENCE.md Notices):
 * the MVP `notice`, display only, never taking focus.
 */
function Notices({
  notices,
  className = "mt-space-md",
}: {
  notices: readonly SmartNotice[];
  /** The space above the notices; none where a parent's gap already gives it. */
  className?: string;
}) {
  if (notices.length === 0) return null;
  return (
    <div className={`flex flex-col gap-space-sm ${className}`}>
      {notices.map((notice) => (
        <div
          key={noticeId(notice)}
          id={noticeId(notice)}
          className="flex items-start gap-space-sm rounded-md border border-primary bg-surface p-space-md"
        >
          <Icon name="info" className="mt-0.5 shrink-0" />
          <p>{noticeMessage(notice)}</p>
        </div>
      ))}
    </div>
  );
}

/** The MVP no-results body (FR-8). */
export const NO_RESULTS_HINT = "Try another city, other dates or fewer rooms.";

/**
 * The result heading, any Smart search notices and the Listing cards, or the
 * no-results state (FR-7, FR-8). Notices come after the heading, which they
 * describe. Under Smart search the no-results body names the Hard criteria
 * (FR-10).
 */
export async function Results({ criteria }: { criteria: SearchCriteria }) {
  const { heading, cards, notices, criteriaSummary } = await searchHotels(criteria);

  if (!heading) {
    const tiles = await getCityTiles();
    return (
      <>
        <div className="mt-space-xl flex flex-col gap-space-md">
          <ResultsHeading describedBy={noticeIds(notices)}>Nothing matches that search.</ResultsHeading>
          <Notices notices={notices} className="" />
          <p className="text-body-lg">{criteriaSummary ?? NO_RESULTS_HINT}</p>
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
        <ResultsHeading describedBy={noticeIds(notices)}>{heading}</ResultsHeading>
        <Notices notices={notices} />
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
