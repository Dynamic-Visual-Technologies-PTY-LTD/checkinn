---
title: 'Tracer: Smart search box to an interpreted Search bar'
type: 'feature'
ticket: '1'
created: '2026-10-20'
status: 'built'
baseline_revision: 'bafbe86ea32c77bd6140c0335ad13241b6bf9198'
route: 'full'
route_source: 'auto'
risk: 'medium'
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
deferred:
  - summary: >-
      AGENTS.md still describes a single e2e server on port 3100 and has no rule for Smart specs.
    evidence: |-
      The change adds a second Playwright server on 3101 (CHECKINN_PROVIDER=fake, its own
      checkinn-smart.db), the smart-desktop and smart-mobile projects, and the rule that Smart
      specs live in e2e/smart/. AGENTS.md Commands is unchanged. Agent-context edits are deferred
      by the review rules; pick it up in the 2.9 refactor sweep, or earlier with the user.
    location: >-
      AGENTS.md, Commands
    severity: medium
---

<intent-contract>

## Intent

**Problem:** The Smart search pipeline has no thin end-to-end path yet. A Guest cannot type a description and see the Search bar filled in from it, so nothing proves that the UI, action, domain, Provider port and URL layers connect.

**Approach:** Add the Provider port (types, `off`, the fake adapter), `normaliseText`, the `sq`/`smart` codec parameters, `interpretQuery` plus `submitQuery` (Destination, absolute Stay and Party only), and the Smart search box with `SmartSearchProvider` on Home and `/search`, shown only when a Provider is configured. Prove it with a second Playwright server on port 3101 that runs the fake.

## Boundaries & Constraints

**Always:**
- Follow AD-19, AD-21, AD-22, AD-29, AD-30, AD-31 and AD-33 in the architecture spine (`context`).
- `src/domain` imports no Provider, Next, React or db code.
- `server-only` lives only in `queries.ts` and `actions.ts`.
- Environment is read on the server at request time, after `io()`, or in a test. Never `NEXT_PUBLIC_`.
- Guest copy follows EXPERIENCE.md, and never says "AI".
- Every Provider input and fixture key goes through `normaliseText`.
- Redirects run outside `try`, as in `startBooking`.
- The MVP behaves exactly as today when `getProvider()` is null.

**Never:**
- The Azure adapter, the `openai` SDK or the import guard (story 1.2).
- `relativeStay`, nicknames, place, ignored notices, Max price, Policy criteria, Rooms auto-raise or Example queries (story 1.3).
- Chips or the Hard filter (1.4).
- The `fallback` parameter or caching (1.7).
- Changes to the seed, to `.github/workflows`, or to `next.config.ts`.
- New dependencies.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fixture Query | Provider `fake`; Query is the UJ-1 text | Redirect to `/search?q=Stellenbosch&…adults=4&children=0&rooms=1&sq=…&smart=1`. The Stay is the current Stay, because the fixture has no absolute dates | — |
| Absolute dates | raw `checkIn`/`checkOut` that pass `validateStay` | That Stay replaces the current one | Invalid → keep the current Stay |
| Party stated | raw `adults: 4` with `children` null | Party becomes 4 adults, 0 children, and the current Rooms clamped to ≤ adults | Out of `PARTY_LIMITS` → keep the current Party |
| Party not stated | `adults` and `children` null | Current Party kept | — |
| Bad raw | `raw` not an object, or a field of the wrong type | Field ignored; the rest still applies | No throw |
| Empty or over-length Query | `""`, whitespace only, or more than 300 characters | `{ ok:false, code:"VALIDATION" }` | Box shows the message |
| Provider off | `getProvider()` null, or a crafted call | Redirect to the MVP `searchHref(current)`. No fetch | — |
| Unknown Query | The fake throws `ProviderError("UNAVAILABLE")`, or there is a timeout | Redirect to `searchHref(current)` plus `sq`, with no `smart`. Story 1.7 replaces this with the fallback URL | Logged by code only |
| Codec | `sq` longer than 300 characters, or `smart` not `1` | `sq` dropped, so `smart` is null; `smart` ignored | — |

</intent-contract>

## Code Map

**Domain**
- `src/domain/criteria.ts`
  - `parseCriteria`, L184. The criteria object is built at L216-224.
  - `serializeCriteria`, L234, with fixed key order. Add `sq` and `smart` after `notice`.
  - `searchHref`, L273, and `hotelHref`, L278. `hotelHref` must never carry `sq` or `smart`.
  - `readText`, L73. `validateStay`, L108. `PARTY_LIMITS`, L20.
- `src/domain/types.ts`
  - `SearchCriteria`, L48: add `smart: SmartCriteria | null`.
  - `ErrorCode` already has `VALIDATION`. `ActionResult`, L300.
- `src/domain/search.ts`, `matches`, L22: the pattern for `text.ts`.
- `src/domain/clock.ts`, `todayIn`: actions call it directly.

**Search feature**
- `src/features/search/queries.ts`: add `getSmartSearchConfig()`, which awaits `io()` and returns `getProvider() !== null`.
- `src/features/hotels/catalog.repo.ts:36`, `listCityNames(db)`: the City context.
- `src/features/booking/actions.ts` L50-162: copy its `"use server"; import "server-only"`, `SERVER_ERROR`, `invalid`, `logFailure` and redirect-outside-try shape.

**Pages and components**
- `src/app/home-search.tsx:48`, `HomeSearch`, after `await io()`; and `src/app/search/search-results.tsx:26`, `SearchResults`.
  - Read `getSmartSearchConfig()` there.
  - Wrap in `SmartSearchProvider` when enabled, outside the keyed `SearchStateProvider`.
  - Put the box above `SearchBar`.
- `src/components/search-bar.tsx`
  - Props L15-28. `onSubmit` L99-108.
  - Read the nullable Smart context: read-only and `aria-disabled` while pending.
- Phone collapsed summary L206-225: the box sits above it, always visible (EXPERIENCE).

**Tests and config**
- Tests to copy:
  - `src/features/booking/actions.test.ts`: node env, `vi.hoisted` mocks of `server-only`, `redirect`, `@/db/client` and `@/domain/clock`, plus `createTestDb()`.
  - `src/app/home-search.test.tsx`.
  - `src/components/search-bar.test.tsx` (`renderBar`).
- `vitest.config.mts`: add `test.env: { CHECKINN_PROVIDER: "off" }`.
- `playwright.config.ts`
  - `webServer` becomes an array.
    - 3100 keeps its build command, and its env gains `CHECKINN_PROVIDER: "off"`.
    - 3101 runs `npm start -- --port 3101` with no build, and env `{ CHECKINN_DB_PATH: E2E_SMART_DB_PATH, CHECKINN_PROVIDER: "fake" }`.
  - Add `smart-desktop` (Desktop Chrome) and `smart-mobile` (Pixel 7) projects with `baseURL` 3101 and `testMatch: "smart/**/*.spec.ts"`.
  - Every other project gets the smart glob in `testIgnore`.
- `e2e/support/db.ts`: add `E2E_SMART_DB_PATH`. `e2e/global-setup.ts` resets both.
- `e2e/home.spec.ts`: helper patterns. Add a no-box assertion.
- `.env.example`: replace the placeholder comment with `CHECKINN_PROVIDER=` (`off` | `fake`; the Azure variables come in 1.2).

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/text.ts` + test -- `normaliseText` (trim, collapse whitespace, lowercase) -- AD-28 key rule
- [x] `src/domain/types.ts`, `src/domain/criteria.ts` + tests
  - Add `SmartCriteria { query: string; interpreted: boolean }`. Later stories extend it.
  - Parse and serialize `sq` (trimmed, at most 300 characters) and `smart=1`. `smart` is non-null only with a valid `sq`.
  - `searchHref` writes them, and `hotelHref` never does (test).
  - Rationale: AD-21.
- [x] `src/domain/interpretation.ts` + test
  - `Interpretation` type with every AD-22 field.
  - `applyInterpretation(raw: unknown, current: {q, stay, party}, today)` returns `{q, stay, party}`. Destination is set from `destination` when it is a non-empty string; otherwise empty, per AD-22.
  - Covers the matrix rows.
  - Rationale: pure, untrusted output.
- [x] `src/features/search/provider/types.ts`
  - `ProviderError` with codes `TIMEOUT`, `RATE_LIMITED`, `UNAVAILABLE` and `INVALID_OUTPUT`.
  - The `Provider` interface: `interpret(query, context, signal)`, `embed(texts, signal)`, `reasons(input, signal)` and `judge(input, signal)`, with typed inputs and outputs.
  - `InterpretationContext { today; cities: {name, aliases}[]; nicknames: Record<string,string> }`. The nickname map is empty here and story 1.3 fills it.
  - Rationale: AD-19 handoff.
- [x] `src/features/search/provider/fake.ts`, `provider/config.ts` + tests
  - The fake reads `data/eval/fake-provider.json`, keyed by the normalised Query and Preferences. Any unknown key throws `UNAVAILABLE`; so do `embed` and `judge` until 2.x supplies fixtures.
  - `getProvider()`: `off` gives null; `fake` gives the fake and logs one warning; Azure variables give null until 1.2.
  - Rationale: AD-29, AD-30.
- [x] `data/eval/fake-provider.json`
  - The UJ-1 Query maps to `{ destination: "Stellenbosch", relativeStay: "next-weekend", adults: 4, children: null, petsAllowed: true, maxPrice: 2000, preferences: "pet friendly family place", … }`.
  - No absolute dates and no chunk ids.
  - Rationale: the tracer fixture.
- [x] `src/features/search/smart-search.ts` -- `interpretQuery(provider, query, current, catalog, today, signal)`: normalise, `provider.interpret`, then `applyInterpretation`. No `server-only` -- AD-22 single caller
- [x] `src/features/search/actions.ts` + node test
  - `submitQuery({ query, current })`, a typed input like `startBooking`, called through `useTransition`.
  - Outcomes from the matrix, with a 2.5 s `AbortSignal.timeout`.
  - Includes the AD-31 test: `fetch` is stubbed to throw, the Provider is off, `submitQuery` redirects to MVP, and `fetch` is never called.
- [x] `src/features/search/queries.ts` -- `getSmartSearchConfig()` -- boolean prop source
- [x] `src/components/smart-search/smart-search-provider.tsx`, `smart-search-box.tsx` + tests
  - The context holds `pending`, `submittedQuery`, `boxIsEmpty` and `submit()`.
  - The box:
    - a native `<textarea rows=1 maxlength=300>`, labelled "Describe your stay"
    - a hidden "Press Enter to search" description
    - Enter submits, except during IME composition
    - a clear × button
    - a submit icon button named "Search by description"
    - a counter shown from 250 characters
    - a status live region, empty on load, that reads "Reading your search…" while pending
    - `readonly` while pending
    - the VALIDATION message shown under the field
  - Styling follows the Smart search DESIGN.md (2px gradient border) on top of the root tokens.
- [x] `src/components/search-bar.tsx` + test -- read-only and `aria-disabled` while the Smart context is pending; unchanged without a context -- AD-33
- [x] `src/app/home-search.tsx`, `src/app/search/search-results.tsx` + tests
  - Render the provider and the box when enabled. On `/search`, fill the box from `criteria.smart?.query`.
  - While pending, show the 3 skeleton cards in place of results.
- [x] `vitest.config.mts`, `playwright.config.ts`, `e2e/support/db.ts`, `e2e/global-setup.ts`, `.env.example` -- see the Code Map -- AD-29, AD-30
- [x] `e2e/smart/tracer.spec.ts`, `e2e/home.spec.ts`
  - On 3101: type the UJ-1 Query on Home and submit. It lands on `/search` with `sq` and `smart=1`, and the Search bar shows Stellenbosch and 4 adults.
  - On 3100: no "Describe your stay" field.

**Acceptance Criteria:**
- Given the Smart server on 3101, when the Guest submits the UJ-1 Query on Home, then `/search` opens with `sq` and `smart=1` in the URL, the Destination field reads Stellenbosch and Occupancy reads 4 adults. This holds on desktop and on phone.
- Given the MVP server on 3100, when Home or `/search` loads, then no Smart search box is present, and every existing MVP spec still passes.
- Given a submission in flight, when the Guest looks at the box and the Search bar, then both are read-only and the status reads "Reading your search…".
- Given `npm test`, when it runs, then no outbound request is made and the Provider is off.

## Implementation Notes

- **Context split.** `SmartSearchContext` and `useSmartSearch` live in `src/components/smart-search/smart-search-context.ts`, apart from `SmartSearchProvider`, so the Search bar does not import the `submitQuery` server action (and `server-only`) into every Search bar test.
- **Only children stated.** When the Query states children but not adults, the current adults are kept; children default to 0 only when adults are stated. The raw `rooms` field is not applied yet (story 1.3); the current Rooms are clamped to the adults.
- **Current Destination.** The box sends the URL's Destination (`q`), not unsubmitted Search bar text, as `current.q`; the live Stay and Party come from `SearchStateProvider`.
- **Timeouts.** A `TimeoutError` or `AbortError` that an adapter did not map is treated as a Provider failure, like `ProviderError`.
- **Spinner icon.** Added `spinner` to the icon set (now 29 icons).
- **Search bar triggers.** `DateRangeField` and `OccupancyField` take an optional `busyStatusId`: `aria-disabled`, presses ignored and described by the Submitting status.
- **Tests and React transitions.** React entangles async transitions, so component tests settle every in-flight `submitQuery` after each test.
- **"use server" exports.** `actions.ts` exports only async functions and types; the 2.5 s budget is a module constant.

## Plan Change Log

## Review Triage Log

### 2026-10-20 — Review pass
- verdicts: 5 findings — high 0, medium 3, low 2, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` The Smart search error survives URL changes, because the provider is outside the keyed SearchStateProvider and the reset block didn't clear `error`. Fixed: the reset block clears `error`, with a re-render test.
  - `[medium]` `[patch]` The 300-character limit was never announced (EXPERIENCE.md Character counter, Accessibility Floor). Fixed: "300 of 300 characters, the limit" is said once through the existing polite status region, with tests for typing and for a cut-off paste.
  - `[low]` `[reject]` The narrow-width layout (under 360px, or enlarged text) is not built. At 320px the textarea keeps about 170px beside the magnifier and both buttons, so it stays usable. Guests that narrow are rare, and the fix is a layout rework, not a direct correction.
  - `[low]` `[patch]` `replaceSelectionInUrl` and `clearNoticeFromUrl` kept `sq` and `smart` on a crafted Hotel page URL, against AD-21. `/book` was already safe. Fixed: both pass `smart: null`, with tests.
  - `[medium]` `[defer]` AGENTS.md describes the old single-server e2e setup. It is an agent-context file, so it is deferred to the frontmatter `deferred` list.

## Design Notes

**Typed input, not FormData.** `submitQuery` takes a typed input object, not the `FormData` that AD-22 names. This matches `startBooking` and the repo's `useTransition` pattern, and the behaviour is the same.

**Unknown Query until 1.7.** An unknown Query redirects to an MVP URL that keeps `sq`, so the Guest still sees their words and MVP results. Story 1.7 swaps this for the `fallback=1` URL.

## Verification

**Commands:**
- `npm run lint`, `npm run typecheck`, `npm test` -- expected: all green
- `npm run build` then `npm run test:e2e` -- expected: green across chromium, mobile, the booking projects, smart-desktop and smart-mobile

## Auto Run Result

**Summary.** The Smart search tracer is in place. With the fake Provider (e2e server on 3101), the UJ-1 Query typed on Home is interpreted by `submitQuery`, then `interpretQuery`, then `applyInterpretation`. It lands on `/search` with `sq` and `smart=1`, and the Search bar shows Stellenbosch and 4 adults. With no Provider (3100, `npm test`, a fresh clone), there is no box and the app is the MVP.

**Files changed**
- *Domain*
  - `src/domain/text.ts`: `normaliseText`.
  - `src/domain/interpretation.ts`: the AD-22 `Interpretation` type and `applyInterpretation` (Destination, absolute Stay, Party).
  - `src/domain/types.ts`, `src/domain/criteria.ts`: `SmartCriteria`, and parsing and serialising `sq` and `smart`. `hotelHref` strips them.
- *Search feature*
  - `src/features/search/provider/{types,fake,config}.ts`: the Provider port with `ProviderError`, the fake adapter on `data/eval/fake-provider.json`, and `getProvider()`.
  - `src/features/search/smart-search.ts`: `interpretQuery`.
  - `src/features/search/actions.ts`: `submitQuery`, with a 2.5 s timeout and the outcomes from the matrix.
  - `src/features/search/queries.ts`: `getSmartSearchConfig()`.
- *UI*
  - `src/components/smart-search/*`: `SmartSearchProvider`, its context, `SmartSearchBox` and `SmartPendingResults`.
  - `src/components/search-bar.tsx`, `date-range-field.tsx`, `occupancy-field.tsx`: read-only and `aria-disabled` while a Query is read.
  - `src/app/home-search.tsx`, `src/app/search/search-results.tsx`: render the box only with a Provider.
  - `src/app/hotels/[hotelId]/{room-selection,availability-alert}.tsx`: drop the Smart parameters on `replaceState`.
  - `src/components/icons/icons.tsx`: a `spinner` icon.
- *Config and e2e*
  - `vitest.config.mts`: `CHECKINN_PROVIDER=off`.
  - `playwright.config.ts`, `e2e/support/db.ts`, `e2e/global-setup.ts`: a second server on 3101 with its own database, plus the `smart-desktop` and `smart-mobile` projects.
  - `.env.example`.
  - `e2e/smart/tracer.spec.ts`, `e2e/home.spec.ts`: the tracer spec and the no-box check.
- *Tests* beside each file.

**Review findings breakdown**
- 3 patches applied: 2 medium, 1 low.
- 1 deferred: AGENTS.md.
- 1 rejected: the narrow-width layout, which is low, rare, and would need a layout rework.

**Follow-up review recommended:** true. Two medium entries were patched, with 0 high and 1 low. The unverified risk:
- Both medium patches change client state in `SmartSearchProvider` and `SmartSearchBox`: the error reset on a new URL, and the one-time limit announcement in the shared status region.
- Unit tests in jsdom cover them. No e2e test does, and neither does real navigation in a browser.
- A follow-up pass should confirm the status region never shows a stale limit or error message after a real `/search` navigation.

**Verification**
- Before review: lint, typecheck and `npm test` (722 passed) all green; `npm run test:e2e` (build, then 174 passed and 8 skipped, all of them existing booking skips).
- After the patches, the full re-run is green: lint and typecheck pass, `npm test` has 727 passed across 77 files, and `npm run test:e2e` builds, then 174 passed and 8 skipped.

**Residual risks**
- The Search bar's Search still drops `sq`. Keeping it is story 1.4, and so is reading `boxIsEmpty`.
- An unknown Query redirects to an MVP URL that keeps `sq` until story 1.7 adds the fallback.
- The narrow-width layout is not built.
- AGENTS.md is out of date (deferred).
