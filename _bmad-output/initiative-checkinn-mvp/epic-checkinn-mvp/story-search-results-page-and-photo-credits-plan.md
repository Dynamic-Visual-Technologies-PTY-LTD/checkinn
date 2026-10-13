---
title: 'Search results page and photo credits'
type: 'feature'
ticket: '7'
created: '2026-10-13'
status: 'ready-for-dev'
baseline_revision: ''
route: 'full'
route_source: 'auto'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md'
  - '{project-root}/DESIGN.md'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/mockups/key-search-results.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Searching from Home lands on a 404. Guests can't see results, and the footer's "Photo credits" link goes nowhere, although the seed requires the credits to be shown.

**Approach:** Build `/search`. It parses the URL with the criteria codec (story 5) inside Suspense and runs `searchHotels` (story 6) only when `stay` is set. It renders the search bar (collapsed to a summary line on phones), the FR-7 heading, Listing cards in FR-7 order, the FR-8 no-results state with the City tiles, three skeleton cards while loading, the stale-link state and the page title. Also build `/credits` from the seed data in the DB, and ship `e2e/search.spec.ts`.

## Boundaries & Constraints

**Always:** `searchParams` is awaited only inside a Suspense-wrapped component (Cache Components). Every DB or clock read is behind `io()`. Stale or malformed criteria (codec problems) → the stale state: no search runs, defaults replace the invalid values, Stay is cleared, and "Those dates have passed. Pick new ones." shows in Coral under Dates. Headings follow FR-7. No results → "Nothing matches that search." / "Try another city, other dates or fewer rooms." and then "Explore a city" with the 6 tiles. A Listing card follows FR-6 and DESIGN.md L734-743: the name is the only link, stretched over the card, to `/hotels/<id>?<criteria>`; "See availability" is visual and `aria-hidden`; the score reads "Rated 4.8 out of 5, Superb, 248 reviews"; stars read "5-star hotel"; prices go through `formatZar` and are named "4 900 rand". Photos go through `RemoteImage`. Titles: "Cape Town hotels · CheckInn" for a city query, otherwise "Search results · CheckInn". On phone the bar starts collapsed as "Cape Town · 13–15 Nov · 2 adults" and expands on tap; it stays expanded from 768px. After results load, focus goes to the count heading on client navigation. Remove the `prefetch={false}` lines that waited for `/search` and `/credits`. Tokens only.

**Never:** No Hotel page (story 8); card links may 404 for now. No sort control. No new dependencies. No `"use cache"` on DB or clock reads.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| City | `/search?q=Cape+Town&checkIn=<+3d>&checkOut=<+5d>&adults=2&children=0&rooms=1` | h "Cape Town: 2 properties found"; first card Harbourlight Retreat, "2 nights, 2 adults: from R 4 900" | — |
| Province | `q=cape` | "6 properties found"; first card Oak & Vine Manor | — |
| Empty / no dates | `/search` | Default Stay (tomorrow, 1 night); "All destinations: 12 properties found" | — |
| No match | `q=Bloemfontein` | No-results copy + 6 City tiles | — |
| Stale | `checkIn` in the past | "Those dates have passed. Pick new ones." under Dates; no cards; the bar is usable | — |
| Credits | `/credits` | h1 "Photo credits"; 6 City rows and 12 Hotel rows | — |
| Phone | < 768px | Collapsed summary button; tap → full bar | — |

## Decisions (user, 2026-10-13)

- **Hotel credits:** one entry per Hotel (12). Each names the Hotel and links both photos' source pages, with the provider, the licence link and the seed's illustrative-photos note.
- **Credits page:** h1 "Photo credits", then h2 "Cities" (6 rows: City name, a "Source and licence" link to `sourceUrl`, the credit instructions) and h2 "Hotels" (12 rows). Text tokens only, no images. Read through a `queries.ts` function with `await io()`, inside Suspense.

</frozen-after-approval>

## Code Map

- `src/domain/criteria.ts` (story 5) -- `parseCriteria(params, today)` → `{criteria, problems}`; `serializeCriteria`. `src/domain/clock.ts` `todayIn()`.
- `src/features/search/queries.ts` (story 6) -- `searchHotels(criteria): Promise<SearchResult>` (`heading`, `cards: ListingCard[]`); `getCityTiles()`. `src/lib/format.ts` `formatZar`.
- `src/components/search-bar.tsx` (story 5) -- extend with a `collapsed` phone mode and a stale `datesError` message; `src/components/city-tiles.tsx` + `CityTilesSkeleton`; `remote-image.tsx`; `icons/icons.tsx`.
- `src/app/page.tsx` -- the Suspense + async-wrapper pattern to copy. `src/app/layout.tsx` title template `"%s · CheckInn"`; `main#main` has tabIndex -1.
- Remove `prefetch={false}` from `site-footer.tsx` (credits), `city-tiles.tsx`, `not-found.tsx` (search).
- Next docs: `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md:787` (pass the `searchParams` promise into the Suspense child), `03-api-reference/04-functions/generate-metadata.md:1272-1334` (metadata reading `searchParams` defers to request time).
- `src/db/schema.ts` -- `cities.image_source_url`, `image_credit_instructions`; `hotel_images.source_url`, `license_url`, `provider`, `is_illustrative`.
- DESIGN.md L590-597 (results layout), L734-743 (card), L783-785 (cancellation line), L729-733 (score, stars), L801-803 (skeleton); tokens `listing-card`, `card-border(-hover)`, `price-lg`, `chip`, `score-badge`.
- Mockup `key-search-results.html` -- card structure, the no-results alternate. Ignore its `destination=` param: AD-8 uses `q`.

## Tasks & Acceptance

**Execution:**
- [ ] `src/app/search/page.tsx` + test -- page, metadata, the Suspense child that awaits `searchParams`, parses, and searches or shows the stale/no-results state.
- [ ] `src/components/listing-card.tsx` + test -- FR-6 card from a `ListingCard` view model; `ListingCardSkeleton`.
- [ ] `src/components/search-bar.tsx` + test -- phone collapsed summary; stale dates error; initial criteria from the URL.
- [ ] `src/features/hotels/credits.repo.ts` + test, a `queries.ts` wrapper -- the credits view model.
- [ ] `src/app/credits/page.tsx` + test -- the credits page per Decisions; title "Photo credits · CheckInn".
- [ ] `site-footer.tsx`, `city-tiles.tsx`, `not-found.tsx` -- drop the `prefetch={false}` workarounds and their tests' expectations, if any.
- [ ] `e2e/search.spec.ts` -- the Cape Town, cape, stale and credits rows of the matrix, plus Home → Search → results; dates computed relative to today.

**Acceptance Criteria:**
- Given Home, when a guest searches "Cape Town", then `/search` shows the heading and Harbourlight Retreat first, and Back returns to Home.
- Given `npm run build`, then `/search` and `/credits` build as Partial Prerender with no request-time API outside Suspense.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green.
- `npm run test:e2e` -- expected: all pass, including `e2e/search.spec.ts`.
