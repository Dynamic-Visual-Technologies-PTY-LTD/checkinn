"use client";

import { useRequiredSearchState } from "@/components/search-state";
import { useSmartSearch } from "@/components/smart-search/smart-search-context";

/** The three PRD Queries, UJ-1 to UJ-3, verbatim (EXPERIENCE.md Example queries). */
export const EXAMPLE_QUERIES = [
  "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night",
  "quiet business hotel in Gauteng with a gym and meeting rooms",
  "ski chalet with a fireplace",
] as const;

const LEAD_IN_ID = "ss-examples";

/**
 * The Example queries under the Smart search box on Home (FR-1), as text
 * buttons in the Link style (Smart search DESIGN.md). One click
 * fills the box and submits, exactly as Enter would, with the Search bar's
 * current Stay and Party. Focus stays on the clicked button; every button is
 * `aria-disabled` while a Query is submitting. Renders nothing without
 * Smart search.
 */
export function ExampleQueries() {
  const smart = useSmartSearch();
  const { stay, party } = useRequiredSearchState();
  if (!smart) return null;
  const { pending, submit } = smart;

  return (
    <div className="flex flex-col gap-space-xs">
      <p id={LEAD_IN_ID} className="text-body-sm text-on-surface-muted">
        Try an example
      </p>
      <ul aria-labelledby={LEAD_IN_ID} className="flex flex-wrap gap-x-space-md">
        {EXAMPLE_QUERIES.map((query) => (
          <li key={query} className="max-w-full">
            <button
              type="button"
              aria-disabled={pending || undefined}
              onClick={() => {
                if (!pending) submit(query, { q: "", stay, party });
              }}
              className="inline-flex min-h-11 max-w-full items-center text-left text-body-sm text-on-surface underline hover:text-tertiary aria-disabled:cursor-default aria-disabled:text-on-surface-muted aria-disabled:hover:text-on-surface-muted"
            >
              {query}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
