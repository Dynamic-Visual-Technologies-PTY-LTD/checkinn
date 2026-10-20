---
title: 'Best-fit room on cards, Ranking blend and Score breakdown'
type: 'feature'
ticket: '5'
created: '2026-10-20'
status: 'built'
baseline_revision: '43b98fc124326eabb072f60dd8dad496ec1587ee'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/initiative-checkinn-smart-search/architecture-smart-search/architecture-smart-search.md'
  - '{project-root}/_bmad-output/initiative-checkinn-smart-search/ux-smart-search/EXPERIENCE.md'
  - '{project-root}/AGENTS.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Smart mode cards show the MVP "from" price and are ordered by the MVP `rank`. The Guest cannot see which room fits their Party, the order ignores the Ranking blend (FR-11 to FR-13), and the presenter cannot see why a Hotel ranks where it does (FR-20).

**Approach:** Add the pure `bestFit()` (AD-26) and `RANKING_BLEND` with its fixed scales and tie-breaks. In `smart` mode, each card carries its Best-fit room and is priced from it, and the order comes from the blend. Relevance is 0 until 2.5. Show the Best-fit room line on smart cards, and write `bestFit` into the card's Hotel page link for 1.6. Show a Score breakdown table on each smart card only when the server sets `CHECKINN_SEARCH_DEBUG=1`.

## Boundaries & Constraints

**Always:**
- AD-20 Types (in `src/domain/types.ts`):
  - `SearchCriteria.bestFit: string | null`.
  - `ListingCard.bestFit?: { roomTypeId, name, rooms, sleeps, nightlyRand, totalRand }`.
  - `ListingCard.breakdown?`, present only under the debug flag.
- AD-20 smart row: `bestFit` is always present, and the card's `nightlyRand` and `totalRand` equal the Best-fit room's.
- AD-21: `hotelHref` writes the MVP criteria plus `bestFit`, and never a Smart parameter. `searchHref` and every `/book` or room-table builder never write `bestFit`.
- AD-26, Ranking:
  - `RANKING_BLEND` is the one constant in `src/domain/ranking.ts`: Best match, `{ relevance: 0.7, reviewScore: 0.15, price: 0.15 }`, documented as provisional until 2.8.
  - Review score signal: 3.0 → 0, 5.0 → 1. Price signal: the Best-fit Nightly price, R 500 → 1, R 3 500 → 0. Both clamped.
  - The blend score is rounded to 4 decimals before ordering.
  - Ties break by higher Review score, then lower Best-fit Nightly price, then Hotel name.
- AD-26, Best-fit: `bestFit()` in `src/domain/best-fit.ts` picks among the qualifying Room types.
  - It takes a per-Room-type meaning map, empty for now: the highest meaning wins.
  - Ties, and a missing meaning, go to the lower Nightly price, then seed order.
  - Prices come from `stayTotalRand` in `src/domain/pricing.ts`. It never splits a Party: one Room type × the Party's Rooms.
- AD-29: `CHECKINN_SEARCH_DEBUG` is read only on the server at request time after `io()`. No URL parameter turns the breakdown on.
- EXPERIENCE Best-fit room line:
  - At the top of the price block, muted body-sm: "Family Room · 1 room · sleeps 4". It reads "2 rooms" in the plural. "sleeps N" is `maxGuests × rooms`.
  - The stay line loses ": from".
- EXPERIENCE Score breakdown:
  - A real `<table>` captioned "Score breakdown, {hotel name}", with "Score" as the one column.
  - Row headers: "Relevance, meaning", "Relevance, exact words", "Review score signal", "Price signal", "Ranking blend score". Each value has two decimals.
  - Outside the card link and the tab order. It fits 320px with no sideways scroll. Its styling follows DESIGN.md `score-breakdown`.

**Never:**
- Hotel page reading of `bestFit`, the pre-selection or the Best-fit chip (1.6).
- The fallback mode, the cache (1.7), or Relevance and embeddings (2.5): the meaning map stays empty and Relevance is 0.
- The other two blend candidates anywhere in `src/` (FR-12).
- Changes to the `mvp` mode output, the MVP card in `mvp` mode, seed, schema or dependencies.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected |
|----------|-------|----------|
| UJ-1 | Stellenbosch, Fri 23–Sun 25 Oct, 4 adults, 1 Room, Max 2000, pets | Winelands card: "Family Room · 1 room · sleeps 4", R 4 000, R 2 000 a night, no "from"; link has `bestFit=<family room id>` and no `sq`, `smart`, `prefs`, `maxPrice` or `policy` |
| Best-fit tie | Two qualifying types, empty meanings | The lower Nightly price wins; equal prices → seed order |
| Meaning wins | Meanings {A: 0.9, B: 0.1}, A dearer | A |
| Several Rooms | 4 adults, 2 Rooms, Standard sleeps 2 | "Standard Room · 2 rooms · sleeps 4", total = nightly × nights × 2 |
| Scales | Review 2.5 / 3.0 / 4.0 / 5.0 / 5.5 | 0 / 0 / 0.5 / 1 / 1 |
| Scales | Price 400 / 500 / 2000 / 3500 / 4000 | 1 / 1 / 0.5 / 0 / 0 |
| Rounding | Two scores equal to 4 decimals | Treated as a tie, then the tie-breaks |
| Tie-breaks | Equal score | Higher Review score, then lower Best-fit Nightly price, then name |
| Debug off | No flag, or `?debug=1` / `?CHECKINN_SEARCH_DEBUG=1` in the URL | No `breakdown` on any card, no table |
| Debug on | Flag `1`, smart mode | A table on every smart card; meaning and exact read 0.00 |
| MVP mode | No Provider, or `smart` null | The MVP cards and order exactly as today: no line, no `bestFit` in the link, no breakdown |

</intent-contract>

## Code Map

**Domain**
- `src/domain/types.ts`
  - `SearchCriteria`: add `bestFit` and update `defaultCriteria` in `criteria.ts`. Fix every object literal typecheck reports, tests included.
  - `ListingCard`: add the optional `bestFit` and `breakdown`. `breakdown` is `{ meaning, exact, reviewSignal, priceSignal, score }`, numbers.
- `src/domain/criteria.ts`
  - `parseCriteria`: read `bestFit` as trimmed non-empty text. Checking it against the Hotel is 1.6's job.
  - Writing: `serializeCriteria` never writes `bestFit`. `hotelHref(hotelId, criteria)` appends `bestFit` last when `criteria.bestFit` is set. Then the `/book` builders in `src/features/booking/actions.ts`, `room-selection.tsx` and `availability-alert.tsx`, and `searchHref`, can't leak it.
- `src/domain/pricing.ts`: reuse `stayTotalRand`. `fromPrice` stays for MVP and its existing callers.
- `src/domain/hard-criteria.ts`: `HardCriteriaRoomType` gains `name`, and `qualifyingRoomTypes` is generic, so the name passes through.
- `src/domain/search.ts`: the MVP `rank` is unchanged and still used by `mvp` mode.
- `src/domain/relevance.ts` exists (it has `toUnitVector`). Don't add Relevance here.
- New: `src/domain/best-fit.ts` and `src/domain/ranking.ts`, each with a test.

**Search feature**
- `src/features/search/search.repo.ts`: `hotelRoomTypes` (L71) also selects `name: roomTypes.name`. Check the column name in `src/db/schema.ts`.
- `src/features/search/smart-search.ts`, `runSmartSearch`, L70–111:
  - Replace the `fromPrice` and `rank` in smart mode with `bestFit(qualifying, new Map(), party.rooms, nights)`.
  - The card's `nightlyRand` and `totalRand` come from the Best-fit room.
  - Order the cards with the ranking function, with Relevance 0.
  - Attach `breakdown` only when the new optional 6th argument `{ debug?: boolean }` is true. The AD-20 signature stays compatible.
  - Keep the `mvp` branch byte-for-byte.
- `src/features/search/queries.ts`: `searchHotels` passes `{ debug: process.env.CHECKINN_SEARCH_DEBUG === "1" }` after `io()`. Put that read in a small exported `searchDebug(env = process.env)` helper beside `getProvider` in `provider/config.ts`, and test it.

**UI**
- `src/components/listing-card.tsx`: price block, L141–158.
  - When `card.bestFit` is set, add the line above the stay line and drop ": from".
  - Render `breakdown` as the table at the bottom across the full card width. It sits outside the `<Link>`, after the grid columns: `md:col-span-2 lg:col-span-3` or whatever the `CARD_GRID` columns require.
- `src/app/search/search-results.tsx`, `Results`, L185–198: `linkCriteria` adds `bestFit: card.bestFit?.roomTypeId ?? null` per card.

**Tests to follow**
- `src/features/search/smart-search.test.ts` uses `createTestDb()`.
- `src/components/listing-card.test.tsx`, if it exists, otherwise `src/app/search/search-results.test.tsx`.
- `e2e/smart/hard-criteria.spec.ts`, with its `cardNames` and `heading` helpers.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/best-fit.ts` + test -- `bestFit(qualifying, meanings, rooms, nights)` returns the card's `bestFit` shape or null, covering the matrix's Best-fit rows -- AD-26, FR-14
- [x] `src/domain/ranking.ts` + test
  - `RANKING_BLEND`, `reviewSignal`, `priceSignal` and `blendScore` (rounded to 4 decimals).
  - `rankByBlend(cards with relevance)` returning ordered cards and their signals for the breakdown.
  - Tests cover the scales, the rounding, each tie-break and the clamps.
  - -- AD-26, FR-11–FR-13
- [x] `src/domain/types.ts`, `src/domain/criteria.ts` + `criteria.test.ts`
  - `bestFit` parse, and `hotelHref` writing it.
  - A codec test that `hotelHref` given full Smart criteria and `bestFit` contains none of `sq`, `smart`, `prefs`, `maxPrice`, `policy`, `fallback`, `place` or `ignored`, but does contain `bestFit`.
  - `searchHref` and `serializeCriteria` never write `bestFit`.
  - -- AD-21
- [x] `src/domain/hard-criteria.ts`, `src/features/search/search.repo.ts` -- Room type `name` -- for the line
- [x] `src/features/search/smart-search.ts` + test
  - UJ-1 gives Winelands' Family Room `bestFit` at 2000/4000 and no `breakdown`.
  - With `{ debug: true }`, `breakdown` is present with meaning 0 and exact 0.
  - Smart order follows the blend.
  - The `mvp` output is unchanged.
  - -- AD-20, AD-26
- [x] `src/features/search/provider/config.ts` + test, `src/features/search/queries.ts` -- `searchDebug` reads only `"1"` -- AD-29
- [x] `src/components/listing-card.tsx` + test
  - The line and "no from" with `bestFit`, and the MVP text without it.
  - The breakdown table by role (`table` named by its caption, `rowheader`s) only when `breakdown` is set, and outside the link's name.
  - -- EXPERIENCE, FR-20
- [x] `src/app/search/search-results.tsx` -- per-card `bestFit` in `hotelHref` -- FR-14 handoff to 1.6
- [x] `e2e/smart/best-fit.spec.ts` (read-only, smart projects)
  - The UJ-1 Example query card shows "Family Room · 1 room · sleeps 4", "R 4 000" and "R 2 000 a night".
  - Its link `href` has `bestFit=` and no `sq=` or `smart=`.
  - No "Score breakdown" table, including with `&debug=1` added to the URL.
- [x] `e2e/smart/*.spec.ts` -- if the blend changes an order the 1.4 specs assert (Oak & Vine vs Winelands with filters removed), re-baseline to the blend order and record why in Implementation Notes. Never weaken an assertion.

**Acceptance Criteria:**
- Given UJ-1 on the fake Provider, when results load, then the Winelands card shows "Family Room · 1 room · sleeps 4" above "2 nights, 4 adults" with R 4 000 and R 2 000 a night, on desktop and phone.
- Given that card, when the Guest opens it, then the Hotel page URL carries `bestFit` and no Smart parameter.
- Given `CHECKINN_SEARCH_DEBUG` unset, when any URL loads, then no Score breakdown shows. Given it set to `1` (component and unit tests), then each smart card shows the captioned table.
- Given no Provider, then every MVP spec passes unchanged.

## Implementation Notes

- **Re-baselined `e2e/smart/hard-criteria.spec.ts`.** After both chips are removed (2 adults + 2 children, 1 Room, no filters), the smart order is now Winelands Family Lodge, then Oak & Vine Manor. With Relevance 0 the blend is 0.15 × Review score signal + 0.15 × price signal: Winelands (4.5 → 0.75, Family Room R 2 000 → 0.5) scores 0.1875 and Oak & Vine (4.8 → 0.9, Family Room R 2 500 → 0.3333) scores 0.185. The MVP-mode assertion at the end of that spec (Oak & Vine first, by the MVP `rank`) is unchanged. The unit test "orders with the MVP rank" in `smart-search.test.ts` became "orders by the Ranking blend, not the MVP rank" and asserts both orders.
- **Missing meaning counts as 0** in `bestFit()`, so an explicit meaning above 0 beats a missing one, and 0 ties with missing and falls to price, then seed order.
- **Name tie-break** compares by code unit, so the order does not depend on the runtime's locale.
- **Score breakdown** sits in a `relative` wrapper spanning `md:col-span-2 lg:col-span-3`, so it paints above the stretched link's overlay (its text can be selected) while staying outside the link in the DOM. Checked by hand at 320px with `CHECKINN_SEARCH_DEBUG=1`: `scrollWidth` equals the viewport, no sideways scroll.
- `searchDebug()` lives in `provider/config.ts`. `queries.test.ts` mocks that module, so its mock now also passes `searchDebug` through with an injected env.

## Plan Change Log

## Review Triage Log

### 2026-10-20 — Review pass
- verdicts: 1 finding — high 0, medium 0, low 1, false 0, maybe-false 0
- findings:
  - `[low]` `[patch]` The `ranking.test.ts` rounding test could not tell rounded from unrounded ordering: the entry with the higher unrounded score also won on name, and the titled Review-score tie-break never ran, so the matrix's "Rounding" row had no real covering test. Fixed: the entry with the higher unrounded Relevance (0.50001) is now "B", so ["A", "B"] holds only because rounding ties the scores and the name decides. The test is retitled to match.

## Design Notes

**Why `serializeCriteria` never writes `bestFit`.** `serializeCriteria` builds every `/book`, room-table and alert URL from spread criteria. AD-21 says those drop `bestFit`, so the one writer is `hotelHref`. 1.6 decides whether a Hotel page Stay or Party change keeps it (AD-26 says it does) by passing it to `hotelHref` explicitly.

**Relevance 0 now.** With Relevance 0, the smart order is 0.15 × Review score signal + 0.15 × price signal. That is a real blend, not the MVP `rank`, so smart and MVP orders can differ. 2.5 supplies Relevance and the meanings and re-baselines the order specs.

```ts
export const RANKING_BLEND = { relevance: 0.7, reviewScore: 0.15, price: 0.15 } as const; // Best match, provisional until 2.8
const score = round4(w.relevance * relevance + w.reviewScore * reviewSignal(r) + w.price * priceSignal(p));
```

## Verification

**Commands:**
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` -- expected: green
- `npm run test:e2e` -- expected: green, including `e2e/smart/best-fit.spec.ts` on smart-desktop and smart-mobile, with every MVP spec unchanged

## Auto Run Result

**Summary.** Smart search cards now carry their Best-fit room (AD-26, FR-14) and are priced from it. "Family Room · 1 room · sleeps 4" sits at the top of the price block, and the stay line has no "from".
- Smart results are ordered by `RANKING_BLEND` (Best match 0.7 / 0.15 / 0.15, provisional until 2.8), with fixed scales, 4-decimal rounding and the FR-13 tie-breaks. Relevance is 0 until 2.5.
- The card's Hotel page link carries `bestFit` for 1.6, and no Smart parameter (AD-21).
- With the server's `CHECKINN_SEARCH_DEBUG=1`, each smart card ends with the Score breakdown table (FR-20). No URL turns it on.
- `mvp` mode is unchanged.

**Files changed**
- *Domain*
  - `src/domain/best-fit.ts` (new): `bestFit()`.
  - `src/domain/ranking.ts` (new): `RANKING_BLEND`, the signals, `blendScore` and `rankByBlend`.
  - `src/domain/types.ts`: `SearchCriteria.bestFit`, `BestFitRoom`, `ScoreBreakdown`, and the optional card fields.
  - `src/domain/criteria.ts`: `bestFit` parse; `hotelHref` is its only writer.
  - `src/domain/hard-criteria.ts`: Room type `name`.
- *Search feature*
  - `src/features/search/search.repo.ts`: selects the Room type name.
  - `src/features/search/smart-search.ts`: Best-fit pricing, blend order, and the `debug` option for the breakdown.
  - `src/features/search/provider/config.ts`: `searchDebug()`.
  - `src/features/search/queries.ts`: passes it after `io()`.
- *UI*
  - `src/components/listing-card.tsx`: the Best-fit room line, "from" dropped, and the Score breakdown table.
  - `src/app/search/search-results.tsx`: per-card `bestFit` in `hotelHref`.
- *Tests*
  - New: `best-fit.test.ts`, `ranking.test.ts`, `e2e/smart/best-fit.spec.ts`.
  - Extended: the criteria, smart-search, config, queries, listing-card and search page tests.
  - Typecheck fixes in four tests.
  - `e2e/smart/hard-criteria.spec.ts`: one order re-baselined to the blend.

**Review findings breakdown**
- 1 patch applied (low): the rounding tie test now proves the rounding.
- 0 deferred, 0 rejected.

**Follow-up review recommended:** false. One low patch, test only.

**Verification**
- Before review: lint and typecheck clean. `npm test` passed 938 tests in 90 files. Build OK. `npm run test:e2e` (CI=1, after the build) had 188 passed and 8 skipped, the existing project skips.
- After the patch: the same commands, with the same results.
- The implementer checked the debug table by hand at 320px with no sideways scroll.

**Residual risks**
- No e2e server sets the debug flag, so the debug-on path is covered only by unit and component tests.
- The smart order now differs from the MVP order. 2.5 adds Relevance and re-baselines the order specs again.
- The Hotel page does not read `bestFit` yet (1.6).
