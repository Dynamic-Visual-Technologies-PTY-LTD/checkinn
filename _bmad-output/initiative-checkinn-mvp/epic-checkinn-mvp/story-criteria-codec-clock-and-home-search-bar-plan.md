---
title: 'Criteria codec, clock and Home search bar'
type: 'feature'
ticket: '5'
created: '2026-10-13'
status: 'built'
baseline_revision: 'd72f269937b08fcdb49c39668646954fb39b4092'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md'
  - '{project-root}/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Home has no way to search, and nothing turns a URL into search criteria or back again. Every later page (search, Hotel, booking) depends on one codec and one clock (AD-8, AD-9).

**Approach:** `src/domain/clock.ts` gives "today" in Africa/Johannesburg, with injectable time. `src/domain/criteria.ts` alone parses and serializes `q`, `checkIn`, `checkOut`, `adults`, `children`, `rooms`, `hotel`, `sel`, `k`, `notice` (+ `rt`), with defaults and the `stay | null` rules. Home gets the search bar (Destination, story 4's Dates and Occupancy fields, Search). It validates on submit, then pushes the `/search?…` URL. The City tiles link through the codec with the current Stay and Party (FR-27).

## Boundaries & Constraints

**Always:** Parsing never throws; it returns `{ criteria, problems }`. Absent dates on Home or `/search` → tomorrow to the day after (1 night), no problem. Past, malformed, check-out ≤ check-in, > 30 nights, or a Party outside its limits (adults 1–10, children 0–6, rooms 1–5 and ≤ adults) → `stay: null` with a problem, and invalid Party values fall back to defaults. `sel` is `roomTypeId:qty,…` with positive integer quantities, otherwise invalid (strict). Serialize emits a fixed parameter order and round-trips with parse. The clock is read on the server only after `await io()`, inside Suspense; tests inject it. Domain files import nothing from Next, React or db. The Destination has a visible label, the placeholder "Where are you going?" and a clear (×) that keeps focus. Errors are Coral under the field, tied by `aria-describedby`, with focus moving to the first invalid field; the messages are those in EXPERIENCE.md L120. An empty Destination searches anyway. Submit pushes a history entry. Tokens only.

**Never:** No `/search` page, collapsed phone bar or stale-link state (story 7). No `searchHotels` or availability (story 6). No `"use cache"` around the clock. No new dependencies. No `new Date()` outside `clock.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Defaults | `{}`; today 2026-11-10 | q "", stay 11→12, party 2/0/1, no problems | — |
| Round-trip | criteria → serialize → parse | Same criteria | — |
| Stale past | checkIn 2026-11-09 | stay null; problem `stay-past` | — |
| Too long / order / malformed | 31 nights; out ≤ in; `2026-13-01` | stay null; problem per case | — |
| Party limits | adults 11, rooms 3 with adults 2, children `x` | Defaults for those fields; problem | — |
| sel strict | `rt-1:2,rt-2:0` / `rt-1:1.5` / `rt-1:1` | invalid / invalid / valid | — |
| Johannesburg date | 2026-11-10T22:30Z | today 2026-11-11 | — |
| Submit | "Cape Town", defaults, Search | Pushes `/search?q=Cape+Town&checkIn=…&checkOut=…&adults=2&children=0&rooms=1` | — |
| Bad dates on submit | Stay now in the past | No navigation; "Check-in can't be in the past." under Dates; focus on Dates | — |

## Decisions (user, 2026-10-13)

- **Tile criteria:** City tiles follow the search bar's live, unsubmitted Stay and Party. A small client provider shares the bar's state with the tile links; with no change, the tiles carry Home's defaults.

</frozen-after-approval>

## Code Map

- `src/domain/types.ts` -- `IsoDate`, `Stay`, `Party`, `CityTile`; add `SearchCriteria` and the problem type here.
- `src/domain/dates.ts` (story 4) -- `addDays`, `nightsBetween`; reuse.
- `src/components/date-range-field.tsx`, `occupancy-field.tsx` (story 4) -- take `today`, emit `Stay` and `Party` on close; optional controlled `open`/`onOpenChange` to keep one overlay open. Caveat from story 4: closing a field from its parent (`open={false}`) does not commit its value; closing from inside (Done, Escape, outside press, Close) does. Opening the other field starts with an outside press on the open one, so it commits first. Check at 768–1023px that the two-month Dates popover (~690px, `absolute left-0`) does not overflow the viewport; if it does, align it to the field's end or clamp it (deferred from story 4 review).
- `src/app/page.tsx` -- server Home: h1, lead, "Explore a city" with `<Suspense>` around `CatalogCityTiles` (L31-34). The search bar goes before "Explore a city" (DESIGN.md L587).
- `src/components/city-tiles.tsx:20-22` -- `href` is `/search?q=<name>` with `prefetch={false}` (keep until story 7); switch it to the codec.
- `src/features/search/queries.ts` -- `server-only`, `await io()` pattern to copy for the clock read.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md` (server `await io()` before `new Date()`), `use-router.md` (`router.push`).
- DESIGN.md L199-251 tokens `input`, `input-mobile`, `input-error*`, `search-bar` (72px, 1px primary, radius md); L669-674 Input; L690-696 Search bar. Mockup `mockups/key-home.html:156-168` (`form role="search" aria-label="Search hotels"`).
- `e2e/home.spec.ts` -- extend with the search bar flow.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/clock.ts` + test -- `todayIn(now?)`, `nowIso(now?)` in Africa/Johannesburg via `Intl.DateTimeFormat` with `timeZone`.
- [x] `src/domain/criteria.ts` + test -- `parseCriteria(params, today)`, `serializeCriteria(criteria)`, `validateStay(stay, today)` → field problems; defaults; `sel` codec. Cover every matrix row.
- [x] `src/domain/types.ts` -- `SearchCriteria`, `CriteriaProblem`.
- [x] `src/components/search-bar.tsx` + test -- client form: Destination with clear, the Dates and Occupancy fields, Search; validate, focus the first invalid field, `router.push`.
- [x] `src/app/page.tsx`, `page.test.tsx` -- an async wrapper reads `todayIn()` after `await io()` inside Suspense (skeleton fallback) and renders the search bar; a client provider shares the bar's live Stay and Party with the tile links (Decisions).
- [x] `src/components/city-tiles.tsx` + test -- href built with `serializeCriteria`.
- [x] `e2e/home.spec.ts` -- the search bar is visible with "2 adults · 0 children · 1 room"; typing "Cape Town" and pressing Search lands on the expected `/search?…` URL; a City tile's href carries the dates and party.

**Acceptance Criteria:**
- Given Home on desktop and phone, when a guest searches, then the URL holds every criterion and Back returns to Home.
- Given `npm run build`, when it runs, then `/` stays Partial Prerender with no clock read at build time.

## Implementation Notes

- The async clock wrapper lives in `src/app/home-search.tsx` (`HomeSearch`, `ExploreSection`, `CatalogCityTiles`), because a route file may only export the page. Its Suspense fallback is the search bar skeleton plus "Explore a city" with the tile skeleton, so the static shell keeps the section heading; the tiles keep their own inner boundary.
- `SearchStateProvider` / `useSearchState` (`src/components/search-state.tsx`) holds the live Stay and Party. `CityTiles` is now a client component that reads it; outside a provider it links with the default Party and no dates.
- `parseCriteria(params, today, { defaultStay })`: `defaultStay` defaults to `true` (Home, `/search`); the Hotel page passes `false`. Also exported: `defaultCriteria`, `defaultStay`, `validateStay` (returns `StayProblem[]`), `parseSelection`, `problemMessage`, `STALE_LINK_MESSAGE`, `searchHref`, `PARTY_LIMITS` and `DEFAULT_PARTY` (moved from `occupancy-field.tsx` so the domain owns the limits). `sel` ownership by `hotel` needs the catalog and is left to the caller. Unknown `notice` values parse to `null` with no problem. The Party is always serialized.
- The search bar validates against `todayIn()` at submit time (injectable `getToday`), so a page left open past midnight is caught; the calendar still uses the server's `today`.
- Dates errors set `aria-describedby` on the Dates trigger. `aria-invalid` was dropped: it is not a supported attribute on a button (jsx-a11y lint).
- Popover overflow at 768-1279px: the bar wraps (Destination on its own row, then Dates, Occupancy, Search), so the Dates popover starts at the left; from 1280px it is one row and the popover aligns to the field's end (`Popover` gained a `placement` prop, passed through `DateRangeField.popoverPlacement`). e2e checks 768, 1024 and 1280.

## Plan Change Log

## Review Triage Log

Verdicts: 0 high, 0 medium, 6 low, 0 false; 1 outside the diff.

| # | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| 1 | Submit with no Stay shows "Those dates have passed" | low | Unreachable on Home (the provider always starts with a Stay); on `/search` a null Stay only comes from a stale link, where EXPERIENCE.md L121 uses exactly that message. | reject |
| 2 | `stay: null` / `sel: []` don't round-trip | low | A null Stay serialises to the default URL, as AD-8 says (invalid values are replaced with defaults); `[]` vs `null` has no caller-visible effect. | reject |
| 3 | Parse trims and accepts leading zeros in the Party | low | Harmless normalisation; `sel` stays strict per AD-8; no user meets it. | reject |
| 4 | No Coral border on the invalid Dates field | low | DESIGN.md Input "Invalid: 1px Coral border"; direct correction. | patch |
| 5 | The skeleton test doesn't assert the skeleton | low | `page.test.tsx` checks only for no landmark and no clock read; a direct correction. | patch |
| 6 | e2e expected dates could cross midnight | low | Needs a run that crosses Johannesburg midnight; the fix adds coordination. | reject |
| 7 | `.vitest/` not ignored | — | Outside the diff; generated Vitest output. | separate chore commit adds it to `.gitignore` |

## Design Notes

- Serialize order: `q, checkIn, checkOut, adults, children, rooms, hotel, sel, k, notice, rt`. Empty optional params are omitted; dates and Party are always written when `stay` is set, so a shared link doesn't shift with "today".
- Problem codes, e.g. `stay-past`, `stay-too-long`, `stay-order`, `stay-malformed`, `party-invalid`, `sel-invalid`, map to the EXPERIENCE.md messages in one place.


## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green; `/` still `◐`.
- `npm run test:e2e` -- expected: all pass.
