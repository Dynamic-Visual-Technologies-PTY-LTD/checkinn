---
title: 'Fallback, Try again and the interpretation cache'
type: 'feature'
ticket: '7'
created: '2026-10-20'
status: 'built'
baseline_revision: 'f31f881facd75939054459ac254bc8d25a46ea77'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
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

**Problem:** When Query interpretation fails or times out, `submitQuery` sends the Guest to the pre-submit criteria with the Query uninterpreted, a silent MVP page. The Guest can't tell Smart search failed and can't retry it. A repeated or concurrent identical Query also calls the Provider again (FR-2, FR-3, AD-28).

**Approach:**
- Add the codec's `fallback` parameter, and turn every Provider failure, the 2.5 s timeout included, into the fallback URL (AD-22 Outcomes).
- Add `runSmartSearch`'s `fallback` mode (AD-20), and show the fallback notice with a Try again button that resubmits the Query.
- Add `src/features/search/cache.ts`, a bounded interpretation map that shares in-flight calls and never caches errors (AD-28). 2.5 and 2.6 extend it.

## Boundaries & Constraints

**Always:**
- AD-21:
  - `fallback=1` is written after `policy` and before `place`. It is ignored without a valid `sq`.
  - `SmartCriteria` gains `fallback: boolean`.
  - A Search bar Search drops `fallback`, as well as `place` and `ignored`. Chip removal keeps it.
  - `searchHref` stays the only writer.
- AD-22 Outcomes: a `ProviderError`, or the 2.5 s timeout, redirects to the fallback URL.
  - That URL is the pre-submit Search bar values, `sq` and `fallback=1`, with no `smart`, `prefs`, `maxPrice`, `policy`, `place` or `ignored`.
  - The timeout must fire even when the Provider ignores the `AbortSignal`: race it.
  - An empty or over-300-character Query still returns `VALIDATION`.
  - No Provider still gives the MVP URL.
  - Any other error is still `SERVER_ERROR`.
  - Logs carry the error code only (AD-29).
- AD-20 Mode:
  - `mvp` when there is no Provider, `smart` is null, or the Query is neither interpreted nor fallback.
  - `fallback` when `smart.fallback`, taking priority over `interpreted`.
  - Fallback filters by AD-23 with the Hard criteria the URL holds: Party capacity and Availability always, Max price and Policy criteria if present. It orders by the MVP `rank`.
  - Fallback cards are MVP cards priced from the cheapest qualifying Room type: no `bestFit`, no `breakdown`, ": from" kept.
  - `searchMode` in `src/domain/hard-criteria.ts` stays the one mode rule. It gains `fallback`, and `SearchMode` does too.
- AD-20 Notices:
  - `SmartNotice` gains `{ kind: "fallback" }`, ordered first (fallback, place, ignored), at most 2.
  - The notice reads exactly "Smart search isn't available right now, so these results are in the usual order.", with id `notice-fallback`, and is part of the heading's `aria-describedby`.
- EXPERIENCE Fallback notice:
  - It holds a **Try again** button (`secondaryButton`) after its text, in the tab order after the heading and before the cards.
  - Try again resubmits the URL's Query with the URL's Search bar values, through the same `useSmartSearch().submit` path as the box.
  - The box shows that Query, the Submitting state runs, and Try again is `aria-disabled` while it is pending.
  - Success lands on the Smart URL with focus on the heading. Another failure lands on the fallback page again with focus on the heading.
- EXPERIENCE Fallback URL: the Query stays in the box. Reload, Back and a shared link show the same page without calling the Provider.
- AD-28 cache:
  - `cache.ts` holds a bounded LRU map, 500 entries, on `globalThis`.
  - It is keyed by `normaliseText(query)` + today and stores the in-flight promise of the Provider's raw interpretation, so concurrent misses make one call.
  - A rejected promise is evicted. `applyInterpretation` still runs on every submit.
  - Write it so 2.5 and 2.6 can add their two maps with the same helper.
  - Nothing uses `"use cache"`.

**Never:**
- The embed stage, or the fallback on an embedding failure at render (2.5). With no render-time Provider call, a reload of a `smart=1` URL never falls back in this story.
- Match reasons (2.6), and changes to `RANKING_BLEND` or `bestFit` (1.5).
- A fallback that calls the Provider on render.
- New dependencies, seed or schema changes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected |
|----------|---------------|----------|
| Unknown Query | The fake throws `UNAVAILABLE`. From Home: no Destination, the default Stay, 2 adults | Redirect to `/search?…&sq=<query>&fallback=1`. "All destinations: 12 properties found" in MVP order. The fallback notice with Try again; the Query in the box; no chips, no Best-fit line |
| Timeout | `interpret` never settles | The fallback URL after about 2.5 s, not a hang |
| Fallback from a smart page | On a UJ-1 URL with Max price and pets, submit an unknown Query | The fallback URL holds the UJ-1 Search bar values only, with no `maxPrice`, `policy` or `prefs` |
| Fallback URL with Hard criteria | A hand-made `sq=x&fallback=1&maxPrice=2000&policy=pets` | `fallback` mode, filtered by those criteria, MVP order, MVP cards from the cheapest qualifying type; chips shown |
| Reload or share | Reload the fallback URL | The same page, with no Provider call |
| Search bar Search on fallback | Change the Party and Search | `fallback` dropped, `sq` kept: `mvp` mode, no notice, the Query still in the box |
| Try again succeeds | The fallback URL whose `sq` the fake knows | The Smart URL (`smart=1`), focus on the heading |
| Try again fails | The fake still doesn't know it | The fallback page again, focus on the heading |
| `fallback` without `sq` | `?fallback=1` | Ignored: `mvp` |
| No Provider | The fallback URL with `CHECKINN_PROVIDER=off` | `mvp`: no box, no notice |
| Cache hit | The same Query twice, same today | One `interpret` call; both get the interpreted URL |
| Concurrent | Two identical submits at once | One `interpret` call |
| Rejected not cached | The first call rejects, the second succeeds | Two calls; the second's result is cached |
| Different today | The same Query on a new day | A new call |

</intent-contract>

## Code Map

**Domain**
- `src/domain/types.ts`
  - `SmartCriteria` (around L61) gains `fallback`.
  - `SmartNotice` gains `{ kind: "fallback" }`.
  - `SearchMode` (around L204) gains `"fallback"`.
- `src/domain/criteria.ts`
  - `parseSmart` (around L257) and `smartCriteria` (L58, its defaults).
  - `setSmart` (around L353) writes `fallback` in AD-21 order.
  - `searchBarSearch` (around L436) also drops `fallback`.
  - `withoutCriterion` keeps it.
  - Add `fallbackHref(current: SearchBarCriteria, query)`, built by `searchHref`.
- `src/domain/hard-criteria.ts`: `searchMode` (L83) returns `"fallback"` for a Provider with `smart.fallback`.
- `src/domain/interpretation.ts`: `smartNotices` (L266) puts the fallback notice first when `smart.fallback`, then slices to `MAX_NOTICES`.
- `src/domain/text.ts`: `normaliseText`.

**Search feature**
- `src/features/search/cache.ts` (new). A small generic `boundedCache<K, V>(name, max)` on `globalThis` (see `provider/config.ts` for the `globalThis` pattern):
  - `getOrCreate(key, () => Promise<V>)` stores the promise and evicts it on rejection.
  - The LRU touches entries on hit.
  - Export `interpretationCache` and a test-only `clear`.
- `src/features/search/smart-search.ts`
  - `interpretQuery` (L37–54) gets the raw interpretation through the cache, keyed by `normaliseText(query)` and `today`.
  - Make it reject with `ProviderError("TIMEOUT")` when `signal` aborts, even if the Provider ignores the signal: race the call against the signal.
  - `runSmartSearch` (L70+) gets a `fallback` branch. Reuse `smartCandidates`, `qualifyingRoomTypes(…, smart.maxPriceRand)`, `hotelQualifies`, `fromPrice` from `src/domain/pricing.ts`, and `rank` and `heading` from `src/domain/search.ts`.
  - With nothing found, `criteriaSummary` is `hardCriteriaSummary(q, smart)`, as in smart mode.
- `src/features/search/actions.ts`, `queryTarget` (L64–91): the `providerFailure` branch returns `fallbackHref(current, query)`. Keep the doc comments current.
- `src/features/search/provider/fake.ts`: unknown Queries already throw `UNAVAILABLE`. Don't change it.

**UI**
- `src/app/search/search-results.tsx`
  - `noticeMessage` (L118) and `noticeId`: the fallback notice copy and the `notice-fallback` id.
  - `Notices` (L135) renders `<TryAgain query={…} current={…} />` inside the fallback notice. Pass the URL's `smart.query` and its `q`, `stay` and `party` down from `Results`.
  - The chip row's mode gate (L52) uses `searchMode`, so fallback URLs with Max price or Policy criteria show chips.
- `src/components/smart-search/try-again.tsx` (new, `"use client"`):
  - A `button` with `secondaryButton`. It calls `useSmartSearch()?.submit(query, current)`.
  - It is `aria-disabled` and ignores clicks while `pending`.
  - Focus on the heading after landing comes from the existing `ResultsHeading`. Check that a failed retry, which lands on the identical URL, still re-renders and focuses the heading. If it does not, make the provider's submit force it, for example with `router.refresh()` or a submit counter key, and record how in Implementation Notes.
- `src/components/smart-search/smart-search-provider.tsx`: `submit` (L78–98). Reuse it, and don't fork it.
- **Pending state: only the listing turns to skeletons** (Plan Change Log, 2026-10-20). EXPERIENCE Submitting says the listing becomes the three skeleton cards with `aria-busy="true"` on the list. Focus never moves until navigation, and busy controls stay mounted and `aria-disabled`.
  - Today `SmartPendingResults` (`smart-search-provider.tsx` L141) replaces the whole results area while pending, heading, notices and Try again included. That loses focus.
  - Change it so that, while pending, the heading, the notices (with Try again `aria-disabled`) and the chips stay. Only the card list is replaced by the skeleton cards, inside an element with `aria-busy="true"`.
  - On a page with no results yet (no heading), the existing skeleton may stay.
  - A small client wrapper around the `<ul>` of cards in `Results`, `search-results.tsx` around L194, is the expected shape. Keep the Suspense `ResultsSkeleton` fallback for real loading.
  - Update the existing tests that assert the old whole-area swap: `src/app/search/page.test.tsx` around L303, and `smart-search-box.test.tsx`, without weakening them. Each should assert the new rule instead.

**E2E**
- New `e2e/smart/fallback.spec.ts`, read-only on the smart projects, following `e2e/smart/tracer.spec.ts`. Use a Query absent from `data/eval/fake-provider.json`.
- For Try again success, open a hand-made fallback URL whose `sq` is the UJ-1 fixture Query.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/types.ts`, `criteria.ts` + test -- the `fallback` parse and write order, `fallbackHref`, `searchBarSearch` dropping it, ignored without `sq` -- AD-21
- [x] `src/domain/hard-criteria.ts`, `interpretation.ts` + tests -- `searchMode` fallback; the fallback notice first and at most 2 -- AD-20
- [x] `src/features/search/cache.ts` + test -- LRU bound and touch, shared in-flight, rejection evicted, keyed by normalised Query + today -- AD-28
- [x] `src/features/search/smart-search.ts` + test
  - `interpretQuery` through the cache.
  - The signal race, with a timed-out call rejecting `ProviderError("TIMEOUT")`.
  - `runSmartSearch` fallback mode, covering the Unknown Query, Hard-criteria and MVP card rows with `createTestDb()`.
  - -- AD-20, AD-22
- [x] `src/features/search/actions.ts` + test -- a `ProviderError` and a never-settling interpret (with a short timeout injected for the test, or fake timers) give `fallbackHref`. Two concurrent identical submits make one `interpret` call -- AD-22
- [x] `src/components/smart-search/smart-search-provider.tsx`, `src/app/search/search-results.tsx` + tests -- while pending only the card list shows skeletons with `aria-busy`; the heading, notices and Try again stay mounted -- EXPERIENCE Submitting
- [x] `src/components/smart-search/try-again.tsx` + test -- submits the URL's Query and values; `aria-disabled` while pending
- [x] `src/app/search/search-results.tsx` + test -- the fallback notice copy, id, `aria-describedby`, Try again placement, and fallback cards without the Best-fit line
- [x] `e2e/smart/fallback.spec.ts`
  - The unknown Query from Home gives the notice, the heading "All destinations: 12 properties found", the Query in the box, and no chips or Best-fit line.
  - Reload gives the same page.
  - Press Try again: while pending, Try again stays visible and is `aria-disabled`, keeps focus, and the cards are skeletons.
  - Then it lands on the fallback page again with focus on the heading.
  - Find the notice by its text or by the heading's accessible description, never by `#id` or an attribute selector (AGENTS.md).
  - A fallback URL with the UJ-1 Query: Try again gives `smart=1` and Winelands.
  - A Search bar Search on the fallback page gives `mvp` with no notice and the Query kept.

**Acceptance Criteria:**
- Given an unknown Query, when the Guest submits it, then they see the fallback notice with Try again, the usual order and their Query in the box, on desktop and phone.
- Given the fallback page, when the Guest presses Try again, then the Submitting state runs, and the page becomes Smart results or the fallback again, with focus on the result heading.
- Given no Provider, then every MVP spec passes unchanged and the fallback URL is the MVP page.

## Implementation Notes

- **Pending state (review loop 1).** `SmartPendingListing` in `smart-search-provider.tsx` swaps only the card list (and, in the no-results state, the city tiles) for `BusyListing`: the three skeleton cards in a `<ul aria-label="Hotels" aria-busy="true">`. The card list carries the same "Hotels" name, so tests find both by role. The heading, notices with Try again (`aria-disabled`, keeping focus) and chips stay mounted. `SmartPendingResults` now wraps only the stale-link page, which has no heading.
- **Focus after a failed Try again.** The heading is no longer re-mounted when the redirect lands on the identical fallback URL, so `ResultsHeading` counts submits that end without an error message (`pending` true → false, no `error`) and passes the count to a new optional `PageHeading` prop, `refocusKey`, which focuses the heading whenever it changes after arrival. A successful Try again lands on a new URL, whose new heading focuses on mount as before. No `router.refresh()` was added. Covered by `page-heading.test.tsx`, `page.test.tsx` and `e2e/smart/fallback.spec.ts` on desktop and phone.
- **Cache.** `boundedCache<K, V>(name, max)` in `src/features/search/cache.ts` keeps one `Map` per name on `globalThis.__checkinnCaches`; 2.5 and 2.6 add their maps with the same helper. `interpretationKey(normalisedQuery, today)` builds the key. The underlying Provider call keeps the first caller's signal.
- **No dead call pinned in the cache** (coordinator fix, beyond Design Notes). When `interpretQuery`'s signal race loses, it calls `interpretationCache.evict(key, call)`, which removes the entry only while it still holds that same promise, so a newer call is kept. A Provider call that never settles therefore no longer makes every later submit of that Query time out; the next submit calls the Provider again and caches its success. Tested in `smart-search.test.ts` and `cache.test.ts`.
- **Timeout race.** `interpretQuery` races the cached promise against the signal (`raceSignal`) and rejects with `ProviderError("TIMEOUT")`. The action test injects a 20 ms timeout by wrapping `AbortSignal.timeout`.
- **No Provider.** The fallback URL with `CHECKINN_PROVIDER=off` is covered by unit tests (`runSmartSearch` returns `mvp` with no notice, and the page ignores Smart parameters without a Provider). No new MVP e2e spec was added; every MVP spec passes unchanged.
- **Accessible description.** The heading's `aria-describedby` points at the whole `notice-fallback` container, so its description is the notice text followed by "Try again".

## Plan Change Log

### 2026-10-20 — Review loop 1 (bad_plan)
- **Trigger:** the review found that pressing Try again unmounts it. The pre-existing `SmartPendingResults` swaps the whole results area for skeletons, so focus drops to `<body>` and its `aria-disabled` state is never seen. That breaks EXPERIENCE Submitting, Busy controls and "focus does not move until navigation", and the plan's "Try again is `aria-disabled` while pending". The implementer knowingly left it and asserted the wrong behaviour in e2e.
- **Amended:** the Code Map has a "Pending state: only the listing turns to skeletons" entry, there is a new Execution task, and the e2e Try again steps are spelled out.
- **Known-bad state avoided:** Try again unmounting while pending, and an e2e asserting the heading is gone while pending.
- **KEEP:** everything else in `story-fallback-try-again-and-the-interpretation-cache-plan.keep.patch`, relative to `baseline_revision`. Apply it first, then change only what this entry names. That covers:
  - the codec's `fallback` and `fallbackHref`
  - `searchMode` and the notices
  - `cache.ts`, including `evict` and the eviction on timeout
  - the `interpretQuery` cache and the signal race
  - the `runSmartSearch` fallback branch
  - the `actions.ts` fallback redirect
  - `TryAgain`
  - the notice copy, id and `aria-describedby`
  - all their tests
- **Also apply** (review patches):
  - (a) In `interpretQuery`, check `signal.aborted` before the cache lookup and reject `ProviderError("TIMEOUT")` with no Provider call, and assert no call in the existing test.
  - (b) Replace the `#notice-fallback` and `[aria-busy="true"]` selectors in `e2e/smart/fallback.spec.ts` and `src/app/search/page.test.tsx` with role, text or accessible-description queries. Use `getByRole` for `aria-busy` only if an accessible role carries it. Otherwise assert busy through the list's role and its `aria-busy` attribute, via `toHaveAttribute` on a role-found element.
  - (c) Fix the broken line wrap in the `parseSmart` doc comment in `criteria.ts`.

## Review Triage Log

### 2026-10-20 — Review pass
- verdicts: 5 findings — high 0, medium 1, low 4, false 0, maybe-false 0
- findings:
  - `[medium]` `[bad_plan]` Try again unmounts while pending: `SmartPendingResults` replaces the whole results area, so focus is lost and `aria-disabled` is never seen. Confirmed against EXPERIENCE L114, L154 and L162, and the plan's Boundaries. Amended the Code Map, Execution and e2e steps (Plan Change Log, review loop 1). The code was reverted and re-derived from the KEEP patch.
  - `[low]` `[reject]` A concurrent cache hit shares the first caller's `AbortSignal`, so a second identical Query can time out early.
    - It is real, but it needs two identical Queries within one slow call's 2.5 s window, which is unlikely in everyday use.
    - The fix, a cache-owned signal and budget, adds machinery.
    - The fallback it causes is the documented outcome for a slow Provider anyway.
  - `[low]` `[patch]` An already-aborted signal still makes a Provider call before `raceSignal` checks it. Folded into the re-derivation as (a).
  - `[low]` `[patch]` Tests query by `#notice-fallback` and `[aria-busy="true"]`, against AGENTS.md "Query by role and accessible name". Folded in as (b).
  - `[low]` `[patch]` Broken line wrap in the `parseSmart` doc comment. Folded in as (c).

### 2026-10-20 — Review pass (after review loop 1)
- verdicts: 2 findings — high 0, medium 0, low 2, false 0, maybe-false 0
- findings:
  - `[low]` `[patch]` The `searchHotels` doc comment in `queries.ts` described only the smart and MVP modes and the old notice order. Fixed: it names `mvp`, `smart` and `fallback`, and the order fallback, place, ignored, at most 2.
  - `[low]` `[patch]` The `runSmartSearch` doc comment said `today` was for "Relevance and the fallback", but the fallback is now in that function and doesn't read it. Fixed: "the stages still to come (Relevance)".

## Design Notes

**Why race the signal.** The Azure adapter maps an abort to `TIMEOUT`, but any Provider could ignore the signal. Racing the call against it in `interpretQuery` keeps the 2.5 s promise for every adapter. The cache still holds the underlying call, and evicts it if it later rejects.

**Fallback is not `mvp`.** On a fallback URL, `searchCatalog` would ignore Party capacity and any Hard criteria the URL holds. AD-20 says fallback filters by AD-23 with the URL's criteria. For a fresh fallback, with none, that is only Availability and capacity.

## Verification

**Commands:**
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` -- expected: green
- `npm run test:e2e` -- expected: green, including `e2e/smart/fallback.spec.ts` on smart-desktop and smart-mobile, with every MVP spec unchanged

## Auto Run Result

**Summary.** When Query interpretation fails or passes 2.5 s, the Guest lands on the fallback page (AD-22).
- **The URL:** the pre-submit Search bar values, the Query (`sq`) and `fallback=1`.
- **The page:** the AD-23 Hard criteria the URL holds, in MVP order, with MVP cards priced "from" the cheapest qualifying Room type, and no Best-fit line.
- **The notice:** "Smart search isn't available right now, so these results are in the usual order." with **Try again**, which resubmits the Query through the box's submit.
- **While a Query submits:** only the card list becomes busy skeleton cards. The heading, notices, chips and Try again (`aria-disabled`, keeping focus) stay. After a failed retry lands on the same URL, the heading takes focus again.
- **The cache:** `src/features/search/cache.ts` holds a bounded interpretation map (500 entries, on `globalThis`), keyed by today and the normalised Query.
  - Identical concurrent Queries share one call.
  - Rejected calls are evicted, and so are calls that time out, so a dead call is never pinned.
  - An already-aborted signal makes no Provider call.

**History.** The first review found that Try again unmounted while pending, because the old whole-area skeleton swap took it away. That was a bad_plan: the plan was amended, the code reverted, and the work re-derived from the KEEP patch (`story-fallback-try-again-and-the-interpretation-cache-plan.keep.patch`) with the pending-state change and three low patches. The second review found two stale doc comments, now fixed.

**Files changed**
- *Domain*
  - `src/domain/types.ts`, `criteria.ts`: `fallback` and `fallbackHref`.
  - `hard-criteria.ts`: `searchMode` fallback.
  - `interpretation.ts`: fallback notice first.
- *Search feature*
  - `src/features/search/cache.ts` (new).
  - `smart-search.ts`: cache, signal race, fallback mode.
  - `actions.ts`: fallback redirect.
  - `queries.ts`: doc comment.
- *UI*
  - `src/components/smart-search/try-again.tsx` (new).
  - `smart-search-provider.tsx`: `SmartPendingListing`.
  - `results-heading.tsx` and `src/components/page-heading.tsx`: `refocusKey`.
  - `src/app/search/search-results.tsx`: the notice, Try again and the busy "Hotels" list.
- *Tests*
  - Unit tests beside each file.
  - New `e2e/smart/fallback.spec.ts`.

**Review findings breakdown**
- Pass 1:
  - 1 medium bad_plan, re-derived.
  - 3 low patches, folded into the re-derivation.
  - 1 low rejected: a concurrent cache hit shares the first caller's `AbortSignal`. It is rare in everyday use, the fix adds machinery, and the fallback is the documented outcome for a slow Provider.
- Pass 2: 2 low patches.
- 0 deferred.

**Follow-up review recommended:** false. The last pass patched only two low entries.

**Verification.** After the final patch, lint and typecheck were clean. `npm test` passed 1018 tests in 92 files. Build OK. `npm run test:e2e` (CI=1) had 208 passed and 8 skipped (the existing project skips), including `fallback.spec.ts` on smart-desktop and smart-mobile and every MVP spec.

**Residual risks**
- `refocusKey` relies on React clearing `pending` after the action's redirect commits. Chromium e2e confirms it, but the behaviour is timing-dependent.
- The card list now has `aria-label="Hotels"` on the MVP page too.
- A concurrent identical Query can time out on the first caller's signal (rejected above).
- A reload of a `smart=1` URL never falls back until 2.5 adds the render-time embed.
