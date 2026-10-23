---
title: 'Hard-criteria filter, Criteria chips and corrections'
type: 'feature'
ticket: '4'
created: '2026-10-20'
status: 'built'
baseline_revision: 'c3d6d944179e53adbca187c45d673a496cef8796'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/initiative-checkinn-smart-search/architecture-smart-search/architecture-smart-search.md'
  - '{project-root}/_bmad-output/initiative-checkinn-smart-search/ux-smart-search/EXPERIENCE.md'
  - '{project-root}/AGENTS.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Max price, Policy criteria and the Query's Party sit in the URL, but they filter nothing. So the UJ-1 Query still lists Hotels that ban dogs or are too small. The Guest cannot see or remove those criteria. A Search bar Search under a Query drops the Query, and an empty no-results page doesn't say which Hard criteria ruled everything out.

**Approach:** Add the AD-23 Hard-criteria check in `src/domain/hard-criteria.ts`. Then:
- Add `runSmartSearch`, which decides the mode (AD-20). It covers the `mvp` and `smart` modes; `fallback` comes in 1.7.
- In `smart` mode, filter Hotels by one qualifying Room type and by Policy criteria.
- Render removable Criteria chips with the EXPERIENCE focus and announcement rules.
- Make a Search bar Search under a Query keep the Smart criteria. With an empty box, it returns to the MVP search.
- Name the Hard criteria in the no-results state.

## Boundaries & Constraints

**Always:**
- AD-20 (mode decided only in `runSmartSearch`, `searchHotels` stays the one entry point), AD-21 (URL changes), AD-23, AD-33.
- The EXPERIENCE rows Criteria chip, Search bar (changed), Re-running and No results:
  - chip copy and names, keyed chips
  - focus kept in the chip row
  - a polite results status region, empty on load, that announces the new count once after a chip removal
- The candidate set is the MVP Destination-and-Stay match, narrowed by the check:
  - one Room type with availability ≥ Rooms, `maxGuests × rooms` ≥ guests, and `nightlyRand ≤ Max price` when set
  - every Policy criterion met by the seed policies
- A smart card is priced from the cheapest qualifying Room type.
- The `mvp` mode output is byte-for-byte the MVP result.
- Smart parameters are written only by `searchHref`.

**Never:**
- The Best-fit room, `RANKING_BLEND`, the Score breakdown or the Hotel page `bestFit` (1.5, 1.6). Smart mode orders with the MVP `rank` until 1.5, and Relevance is 0.
- The `fallback` mode or parameter, Try again, or caching (1.7).
- Embeddings (2.5).
- Seed or schema changes.
- New dependencies.

## I/O & Edge-Case Matrix

Seed facts:
- Stellenbosch has Oak & Vine (Standard 1 950/2, Family 2 500/4, no pets) and Winelands (Standard 1 450/2, Family 2 000/4, pets).
- Every Hotel allows children; none allows smoking.

| Scenario | Criteria | Result |
|----------|----------|--------|
| UJ-1 | Stellenbosch, 4 adults, 1 Room, Max 2000, pets | Only Winelands (Family 2 000 qualifies), priced at R 2 000 a night |
| Price edge | Max 1999, same criteria | No Hotels. The no-results body is "We looked for Pets allowed and Max R 1 999 per night in Stellenbosch. Remove a filter, or try other dates or another city." |
| Capacity across Rooms | 4 adults, 2 Rooms, no Max price | A Standard (2 guests) × 2 qualifies |
| Availability | A Room type with count < Rooms | That type does not qualify |
| No pets | Remove pets, keep Max 2000 | Still only Winelands: Oak & Vine has no qualifying type at or under R 2 000 for 4 |
| No filters | Remove pets and Max price | Oak & Vine and Winelands |
| Smoking | policy smoking | No Hotels; the summary names "Smoking allowed" |
| MVP mode | No Provider, or `smart` null, or `interpreted` false | `searchCatalog` unchanged, with no chips |

</intent-contract>

## Code Map

**Domain**
- `src/domain/types.ts`
  - `SearchResult { heading, cards, notices }`: add `mode: "mvp" | "smart"` and `criteriaSummary: string | null`.
  - `SmartCriteria` already carries `preferences`, `maxPriceRand`, `policies`, `place`, `ignored` and `ignoredKind`.
  - `PolicyCriterion` already exists.
- `src/domain/criteria.ts`
  - `searchHref` and `serializeCriteria` already write every Smart parameter.
  - Add the URL change builders, all through `searchHref`:
    - `withoutCriterion(criteria, key)`, where `key` is `maxPrice`, `pets`, `children` or `smoking`.
    - `searchBarSearch(criteria, { boxIsEmpty })`. It keeps `sq`, `smart`, `prefs`, `maxPrice` and `policy`, and drops `place` and `ignored`. With an empty box it drops every Smart parameter.
- `src/domain/search.ts`: `matches`, `rank` and `heading` are reused.
- `src/domain/pricing.ts`: `fromPrice(prices, nights, rooms)` is reused for the smart card price.
- `src/domain/format`: `formatZar` or the existing chip copy helper, if 1.3 added one. Check `src/lib/format.ts`. The copy is "Max R 2 000 per night", with non-breaking spaces.

**Search feature**
- `src/features/search/search.repo.ts`: `searchCatalog(db, criteria, now)`, the MVP path, stays unchanged. Add `smartCandidates(db, criteria, now)`, returning for each Destination-matching Hotel:
  - its card fields, built the same way `searchCatalog` builds them
  - its `policies`
  - its Room types (`id`, `maxGuests`, `nightlyRand`) with `availabilityFor` counts
- `src/features/search/smart-search.ts`: add `runSmartSearch(db, provider, criteria, today, now): SearchResult`. No `server-only`, and it never throws for Provider errors.
- `src/features/search/queries.ts`: `searchHotels` calls `runSmartSearch(getDb(), getProvider(), criteria, todayIn(), nowIso())` after `io()`, and keeps its signature. The notices logic from 1.3 moves into `runSmartSearch` or stays beside it.
- `src/features/hotels/availability.repo.ts`: `availabilityFor(db, hotelId, stay)`.

**UI**
- `src/app/search/search-results.tsx`
  - `SearchResults` renders the box, the `SearchBar` and `Results`, and has the `Notices` component.
  - Put the chip row under the Search bar.
  - Render the no-results `criteriaSummary`.
  - Add the polite results status region.
  - Pass the URL's `smart` criteria to the `SearchBar`.
- `src/components/search-bar.tsx`, `onSubmit`, L99-L118: currently pushes `searchHref({ q, stay, party })`. Under a Query in the URL it must push `searchBarSearch(...)`, reading `boxIsEmpty` from `useSmartSearch()` at Search time (AD-33).
- `src/components/smart-search/smart-search-context.ts`: has `boxIsEmpty`.
- `src/components/smart-search/criteria-chips.tsx`: new.
- Reuse `iconButton` and the `close` icon. The chip style follows the Smart search DESIGN.md `criteria-chip` (44px minimum, wraps).

**E2E**
- `e2e/smart/interpretation.spec.ts`, `tracer.spec.ts`: the patterns to follow.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/hard-criteria.ts` + test -- `qualifyingRoomTypes`, `hotelQualifies`, and `hardCriteriaSummary(q, smart)` with the EXPERIENCE sentence (Policy criteria first, then Max price, then "in {q}" when Destination is set) -- AD-23, FR-10
- [x] `src/domain/types.ts`, `src/domain/criteria.ts` + tests -- `mode` and `criteriaSummary` on `SearchResult`; `withoutCriterion` and `searchBarSearch` -- AD-20, AD-21
- [x] `src/features/search/search.repo.ts` + test -- `smartCandidates` -- AD-4, AD-23
- [x] `src/features/search/smart-search.ts` + test -- `runSmartSearch`, covering every matrix row with `createTestDb()` -- AD-20
- [x] `src/features/search/queries.ts` + test -- `searchHotels` goes through `runSmartSearch` -- AD-20
- [x] `src/components/smart-search/criteria-chips.tsx` + test
  - A list labelled "Your filters" (visually hidden).
  - Each button holds a hidden "Remove " plus the visible copy and a decorative ×, with no `aria-label`.
  - Keyed by criterion, in the order Max price, pets, children, smoking.
  - A click pushes `withoutCriterion`. Focus moves to the next chip, else the previous one, else the box, and is restored by key after the update.
  - Rendered only when the mode is not `mvp` and the URL holds Max price or Policy criteria.
- [x] `src/app/search/search-results.tsx` + test
  - The chips under the Search bar.
  - The results status region (polite, empty on load). After a chip removal it announces the new heading once.
  - The no-results body with `criteriaSummary`, chips kept, city tiles below.
- [x] `src/components/search-bar.tsx` + test -- under a Query, push `searchBarSearch(..., { boxIsEmpty })`; without one, the MVP behaviour is unchanged -- FR-5, AD-33
- [x] `e2e/smart/hard-criteria.spec.ts` (read-only, smart projects)
  - The UJ-1 Example query shows only Winelands, with the chips "Max R 2 000 per night" and "Pets allowed".
  - Changing the Party to 2 adults and 2 children updates the results. The URL keeps `sq`, `smart=1`, `prefs`, `maxPrice` and `policy`, so there was no new interpretation.
  - Removing "Pets allowed" keeps focus on the "Max R 2 000 per night" chip, with Winelands still alone.
  - Removing that chip too shows Oak & Vine Manor and Winelands, with focus on the box.
  - Clearing the box, then a Search bar Search, gives the MVP URL (no `sq`) and MVP order.

**Acceptance Criteria:**
- Given UJ-1 with the fake Provider, when results load, then only Winelands Family Lodge shows, with the chips "Max R 2 000 per night" then "Pets allowed", on desktop and phone.
- Given that page, when the Guest edits the Party in the Search bar and searches, then the results update with no "Reading your search…", and the Query, Preferences and chips are kept.
- Given that page, when the Guest removes a chip, then focus stays in the chip row (or on the box when none are left), the new count is announced once, and the heading is not focused.
- Given no qualifying Hotel, when results load, then "Nothing matches that search." shows, with the sentence naming the Hard criteria and the chips still removable.
- Given no Provider, then every MVP spec passes unchanged.

## Implementation Notes

- **Mode helper.** `searchMode(hasProvider, smart)` lives in `src/domain/hard-criteria.ts`. `runSmartSearch` decides the mode with it, and `/search` uses the same function to gate the chip row, which sits outside the per-search `<Suspense>`, so the mode rule is written once.
- **`mvp` mode.** Returns `searchCatalog` unchanged plus `mode: "mvp"` and `criteriaSummary: null`, with no notices. `searchCatalog` now returns `CatalogResult` (the MVP shape). Its card building moved into shared helpers that `smartCandidates` reuses; the output is unchanged.
- **Chip name.** The space after "Remove" sits outside the visually hidden span (`<span class="sr-only">Remove</span> Max R 2 000 per night`). With the space inside the span, the accessible-name computation trims it to "RemoveMax…". The name and visible text are as EXPERIENCE says.
- **Focus and announcement.** `SmartSearchProvider` holds `chipRemoval` (the focus target and the pushed URL) and the `resultsStatus` text. `ResultsStatus` renders the polite region, named "Result count".
  - A new `ResultsHeading` wraps `PageHeading`. When it arrives after a chip removal it skips focus (new `focusOnArrival` prop), announces its text once and clears the removal.
  - Any other navigation clears the removal: a Search bar Search, a Smart search submit, or a URL change that is not the removal's target (the provider's new `url` prop).
- **No re-mount per URL.** `SearchStateProvider` is no longer keyed. It takes a `resetKey` and resets Stay and Party at render time when the key changes. Only the box, the `SearchBar` and the results `<Suspense>` are keyed by the URL. So the chip row is never re-mounted: surviving chips keep their DOM nodes and focus. The row puts focus back on the box only if the box's re-mount dropped it.
- **Newest action wins.** Chip removal and the Search bar build the next URL from the newest URL, not from the rendered props. That is the last URL pushed while its navigation is in flight (the address bar has not moved since), otherwise `window.location.search`, parsed with `parseCriteria`. The Next router updates the address bar only when the navigation commits, so reading the address bar alone would still be stale during a re-run.
- **No chips on a stale link.**
- **`boxIsEmpty` after a re-run.** The box re-mounts with each URL and sets `boxIsEmpty` from the URL's Query on mount. Otherwise a cleared-but-unsubmitted box followed by a chip removal would leave `boxIsEmpty` true while the box shows the Query again.

## Plan Change Log

- `e2e/smart/interpretation.spec.ts`, stale Smart URL test: `policy=pets,wifi` keeps `pets`, which now filters (AD-23). The heading is "1 property found" instead of "All destinations: N properties found". The test now also checks that only the "Pets allowed" chip shows, so the invalid Max price has no chip.

## Review Triage Log

### 2026-10-20 — Review pass
- verdicts: 5 findings — high 0, medium 3, low 2, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` The chips and the Search bar built the next URL from stale server props, and the address bar only moves on commit, so a quick second action brought back a removed criterion. Fixed: `SmartSearchProvider` records each pushed URL (`recordPush`), `currentParams()` returns it until the address bar moves, and tests cover two quick removals and a removal followed by a Search.
  - `[medium]` `[patch]` `chipRemoval` was cleared only when a heading mounted, so later navigations lost heading focus. Fixed: it records its target URL and clears on a Search bar Search, on a Query submit (Example queries included), and on a URL change to any other target (Back and Forward), with a test.
  - `[medium]` `[patch]` The chip row re-mounted on every URL change because it sat inside the keyed `SearchStateProvider`, against AD-33 and EXPERIENCE ("surviving chips keep their DOM nodes"). Fixed: `SearchStateProvider` is unkeyed and takes a `resetKey`. Only the box wrapper, the Search bar and the results Suspense are keyed by URL. A test checks that the surviving chip is the same node, with no `focusout`.
  - `[low]` `[patch]` Tests selected by id and `svg`, against the AGENTS.md test rule. Fixed: the results status is named "Result count" and found by role and name, and the × is checked through the chip's accessible name.
  - `[low]` `[patch]` Chips rendered on the stale-link page. Fixed: the row is not rendered when `criteria.stay` is null, with a test.

## Design Notes

**The ticket's chip-removal check doesn't fit the seed.** The ticket says "removing 'Pets allowed' shows more Hotels". With the seed, Oak & Vine still fails the R 2 000 Max price for 4 guests in 1 Room (its Family Room is R 2 500, and a Standard Room sleeps 2). So removing Pets alone keeps Winelands alone. The e2e therefore checks the focus rule on Pets, then removes Max price to see more Hotels. This matches the ticket's intent, that removing a filter widens the results, on the seed's real data.

**Smart order until 1.5.** Smart mode uses the MVP `rank`. Story 1.5 replaces it with `RANKING_BLEND` and adds `bestFit`.

## Verification

**Commands:**
- `npm run lint`, `npm run typecheck`, `npm test` -- expected: green
- `npm run test:e2e` -- expected: green, including `e2e/smart/hard-criteria.spec.ts` on smart-desktop and smart-mobile, with every MVP spec unchanged

## Auto Run Result

**Summary.** Smart search now filters by the Hard criteria (AD-23). A Hotel shows only if one Room type meets Availability ≥ Rooms, `maxGuests × rooms` ≥ guests, and Max price, and if every Policy criterion is allowed. Smart cards are priced from the cheapest qualifying Room type, with the MVP order until 1.5.
- Removable Criteria chips sit under the Search bar. Focus stays in the row, and the new count is announced once in a polite "Result count" status.
- A Search bar Search under a Query keeps `sq`, `smart`, `prefs`, `maxPrice` and `policy`; with an empty box it gives the MVP search.
- No results names the Hard criteria.
- `runSmartSearch` decides the mode (`mvp` or `smart`) behind `searchHotels`.

**Files changed (main)**
- *Domain*
  - `src/domain/hard-criteria.ts` (new): `qualifyingRoomTypes`, `hotelQualifies`, `hardCriteriaSummary`, the chip copy and `searchMode`.
  - `src/domain/criteria.ts`: `withoutCriterion` and `searchBarSearch`.
  - `src/domain/types.ts`: `mode` and `criteriaSummary`.
- *Search feature*
  - `src/features/search/search.repo.ts`: `smartCandidates`, with the card building shared with `searchCatalog`.
  - `src/features/search/smart-search.ts`: `runSmartSearch`.
  - `src/features/search/queries.ts`.
- *UI*
  - `src/components/smart-search/criteria-chips.tsx` and `results-heading.tsx` (new).
  - `smart-search-provider.tsx`: the push and chip-removal state.
  - `src/components/search-state.tsx`: `resetKey`, unkeyed.
  - `src/components/search-bar.tsx`, `src/components/page-heading.tsx`.
  - `src/app/search/search-results.tsx`.
- *E2E*
  - `e2e/smart/hard-criteria.spec.ts` (new).
  - `e2e/smart/interpretation.spec.ts`: the stale-URL test now expects the `pets` filter to apply.

**Review findings breakdown**
- 5 patches applied: 3 medium, 2 low.
- 0 deferred.
- 0 rejected.

**Follow-up review recommended:** true. Three medium entries were patched, and they changed shared client state: an unkeyed `SearchStateProvider` with a render-time reset, and pushed-URL tracking. Named risk: Back and Forward, and quick successive actions across Home and `/search`, could leave Stay and Party or `currentParams()` out of step with the URL. `resetKey` has no test of its own.

**Verification**
- Before review: lint and typecheck clean. `npm test` passed 893 tests in 88 files. `npm run test:e2e` built, with 184 passed and 8 skipped.
- After the patches: lint and typecheck clean. `npm test` passed 897 tests in 88 files. `npm run test:e2e` built, with 184 passed and 8 skipped.

**Residual risks**
- The `aria-busy` three-skeleton re-run state is not built; the Suspense fallback shows instead.
- The order is the MVP `rank` until 1.5.
- `src/domain/hard-criteria.ts` imports `formatZar` from `src/lib`, the first domain-to-lib import.
- The risk named under the follow-up recommendation.
