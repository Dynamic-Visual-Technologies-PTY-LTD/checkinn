---
title: 'Expand the demo catalog for broader hotel searches'
type: 'feature'
ticket: ''
created: '2026-10-23'
status: 'built'
baseline_revision: '28cc4235dc3de569088d1eb45c354648aa578558'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['C:/Users/Basso/source/repos/DVT/checkinn/AGENTS.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

The current catalog has 12 hotels, 24 room types and six destinations, limiting useful search examples. Expand it to 120 fictional hotels across 20 South African destinations with varied prices, policies, capacities and detailed, internally consistent descriptions. The user approved this expansion and leaving existing worktrees untouched on 2026-10-23.

## Boundaries & Constraints

Preserve the original 12 hotels and six cities verbatim, including order, identifiers and room inventory. Append new records using the existing schema. Each new hotel has two or more room types and two illustrative images with honest credits. Reuse existing illustrative stock photos rather than introducing external calls or unverified destination photographs. Images are optional in the request; new AI images are not required for acceptance.

Use diverse stay types: budget, business, family, luxury, wellness, self-catering, coastal and rural retreats. Cover policy combinations, single travellers, couples and larger families; include both refundable and non-refundable choices. Use existing amenity keys. Hotel descriptions should explain concrete facilities, atmosphere, nearby setting and intended stay without claiming facilities absent from structured data. All reviews, properties and prices remain explicitly fictional.

No dependencies, schema, provider, search algorithm, infrastructure or configuration changes. Existing ordinary search matches names, areas, cities, aliases and provinces; semantic description ranking remains planned work. Do not reset the user's live database automatically: resets erase bookings. Document how an existing installation loads the expanded catalog.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Fresh catalog | Empty temporary database | 20 cities, 120 hotels and all room types load and are searchable by destination | Tests catch duplicate IDs and broken references |
| Existing database | Previously seeded database | Existing records and bookings remain until explicit reset | No automatic destructive reset |
| Expanded search | New destination and eligible party | Matching hotel cards can open and rooms can be selected | Existing fallback and empty results behavior preserved |
| Catalog integrity | Complete committed JSON | Unique IDs, known city/amenity references, positive inventory, coherent prices and capacities | Validation tests fail on inconsistency |

</frozen-after-approval>

## Code Map

- `data/seed/hotel-booking-demo.json`: authoritative JSON catalog; append without changing original records. `src/db/seed.ts` defines `Seed` and bulk insertion; use it unchanged unless a demonstrated scale issue requires a minimal fix.
- `src/domain/search.ts`: current location/name search; descriptions do not participate. `src/domain/hard-criteria.ts`: policy, budget, party and availability constraints.
- `src/db/client.test.ts`, `src/db/reset.test.ts`, `src/features/hotels/catalog.repo.test.ts`, `src/features/hotels/credits.repo.test.ts`: real catalog tests with hardcoded original counts.
- `src/features/search/{search.repo,smart-search,queries}.test.ts`: catalog-backed count/order assertions need expanded expected sets; keep isolated fixtures unchanged.
- `e2e/search.spec.ts`, `e2e/offline.spec.ts`, `e2e/booking/{uj-1,uj-2,offline-booking,reset}.spec.ts`, `e2e/smart/{fallback,hard-criteria}.spec.ts`: original catalog counts or ordering assumptions.
- `README.md`: catalog loading and reset documentation. Existing architecture AD-6's original unchanged-seed constraint is superseded for this explicitly approved expansion only; preserve runtime insertion semantics.

## Tasks & Acceptance

- [x] Expand JSON to 120 hotels in 20 destinations; aim for three room types per new hotel with meaningful capacities and pricing. Add reproducible generation source under `scripts/` if helpful, preserving originals and avoiding needless dependencies.
- [x] Add `src/db/seed.test.ts` catalog integrity and diversity checks, including capacity versus beds, minimum room price, references, policies and image attribution.
- [x] Update catalog-backed expectations to exact expanded sets or independently computed expected subsets; never relax assertions merely to pass. Add a browser journey for a new destination and hotel/room selection.
- [x] Update README data section with counts, fictional content, image reuse, current search limits and reset implications.
- [x] Run required verification and repair regressions without weakening tests.

Acceptance: Given a fresh database, when the catalog loads, then guests can search 120 hotels across 20 destinations. Given a newly added destination, when a guest searches and opens a result, then the hotel and its rooms are available. Given a previously seeded database, when it reopens, then it is not reseeded. Given the full JSON, when integrity tests run, then all references, prices and capacities are coherent and original records are preserved.

## Implementation Notes

User approval in conversation covers the concrete expansion and preserving existing worktrees; proceed without another approval request. Risk is medium because additional results change ordering and count assumptions across booking and search tests. Keep all work local and do not push or open a PR.

Implemented 120 hotels, 20 destinations and 348 room types, with reproducible append generation, preserved original record hashes, integrity checks and expanded integration/browser expectations. Existing original databases and bookings are explicitly covered by a reopen regression test. No live database reset was performed.

Verification: lint and typecheck passed; all 93 unit/component files passed (1,033 tests). Production build and test:e2e fail at Turbopack's CSS worker startup: `node process exited before we could connect to it with exit code: 0`. Reproduced outside the sandbox and after setting aside generated build/cache directories under `.next/`; e2e never reaches browser test execution. A separate Next.js upgrade reminder also appeared, but retrying past it did not resolve the worker failure. No dependencies or configuration were changed. Full verification remains incomplete, so do not mark this plan built or done.

## Plan Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence / action |
|---|---|---|---|
| Fixed expanded homepage counts conflict with retained original databases | medium | patch | `openDb` leaves existing catalog intact; the new preservation regression confirms 12 hotels remain. Replace fixed introductory counts with count-free copy and update its unit/browser expectations. |

Patch completed: homepage now says "Hotels across South Africa". Homepage unit tests passed, then lint, typecheck and all 1,033 tests passed again. No remaining code findings; production build/browser verification remains blocked as recorded above. Changes remain uncommitted because the required build gate has not passed.

2026-10-23 PR handoff: user explicitly requested a PR despite the reported build limitation. Isolated the data changes on `codex/expand-demo-catalog`, based on `origin/feature/rag-search-init` at `eae2c877c5224823cde22429a793147bb603a08b`, leaving the unrelated Azure CLI authentication commit on its original branch. Lint, typecheck and 1,031 tests across 93 files pass on this base (two authentication tests belong to the excluded commit). PR screenshot/search capture reproduces the same CSS-worker failure before any browser test runs. Publish as a draft into `feature/rag-search-init`; full verification remains outstanding.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`

All must pass; no paid provider calls. Browser suite uses temporary databases and fake/off providers.

User correction on 2026-10-23: PR must target main. Rebuilt from main with only the catalog commit; omitted five Smart-search-specific test files absent from main and adapted the two shared repository tests to MVP APIs. Lint, typecheck and all 655 tests across 71 files pass. Rebase onto current origin/main before publishing; keep the Smart search feature and Azure-auth work excluded.

Final main-based verification: npm run build passed with local worktree dependencies, lint/typecheck passed, all 655 unit/component tests passed, and CI=1 npm run test:e2e passed all 71 browser tests. PR page capture passed two desktop pages (Home and Hermanus); main's capture script assumes a missing mobile project, so capture was explicitly limited to chromium. PR #30 now targets main with only the data changes. The earlier build/browser blocker is resolved on this main-based checkout.
