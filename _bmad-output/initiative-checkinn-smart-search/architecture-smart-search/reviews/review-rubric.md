---
title: Rubric review — Architecture spine, CheckInn Smart search
spine: ../architecture-smart-search.md
parent: ../../../initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md
reviewer: rubric walker
date: '2026-10-19'
verdict: revise — no critical findings, 5 high
---

# Rubric review — Smart search architecture spine

## Verdict

The spine is strong and mostly build-ready. It keeps the MVP seam, codec and layering, isolates the Provider behind a port, and correctly shows the ask-first items as pending. It is not ready to slice into stories yet. Five high findings would let separately built units diverge or break a stated invariant:

- the eval cannot reach the interpretation and Match reason stages without re-implementing them
- "fused chunk score" is undefined
- the FTS5 content mode can corrupt the index on reset
- existing databases silently get an empty index
- the Match reason wiring breaks AD-1 and the 3-call cost cap

No critical findings. A fresh clone, `npm run db:reset` and `npm test` never need the Provider, provided `search-index.json` is committed before the loader lands (M9).

## What was checked

- The spine against the MVP AD-1..AD-18 (full text read), PRD FR-1..FR-20, §7–§11 and §10 Approvals, and EXPERIENCE.md (Fallback, Fallback URL, Re-running, Stale URL, Hotel page).
- Code: `src/db/client.ts`, `reset.ts`, `seed.ts`, `schema.ts`, `test-db.ts`, `reset.test.ts`, `src/features/search/queries.ts`, `search.repo.ts`, `search.repo.test.ts`, `src/features/hotels/availability.repo.ts`, `src/domain/criteria.ts`, `types.ts`, `scripts/db-reset.ts`, `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/support/db.ts`, `network.ts`, `e2e/offline.spec.ts`, `vitest.config.ts`, `src/test/setup.ts`, `package.json`, `.env.example`, `.gitignore`, `.github/workflows/ci.yml`.
- Next 16 docs: `io.md` and `environment-variables.md` in `node_modules/next/dist/docs/`.
- Tech verified locally on 2026-10-19:
  - better-sqlite3 13.0.3 reports `sqlite_version()` = **3.53.4**.
  - `CREATE VIRTUAL TABLE … USING fts5(x, tokenize='porter unicode61')` works.
  - `PRAGMA table_list` reports FTS5 shadow tables as `type: 'shadow'` and the FTS table as `'virtual'`. It also lists `sqlite_schema` and `temp.sqlite_temp_schema` as `'table'`.
  - npm `openai`: 7.28.0 was published 2026-10-04 (15 days old). The latest is 7.39.0 (published 2026-10-19).

## Checklist summary

| Criterion | Result |
| --- | --- |
| Fixes the real divergence points, misses none | Mostly. Gaps: eval reach (H1), chunk scoring (H2), fallback behaviour (M3), reasons caching (M7) |
| Every AD Rule enforceable and prevents its divergence | Mostly. AD-24 drift (H4) and AD-31 egress (M11) are not actually enforced. The import rules in AD-19 have no mechanism (M2) |
| Nothing under Deferred lets units diverge | Pass. Deferred items are tuning constants, prompt wording, hosting, Entra ID, rate limiting and out-of-scope features |
| Named tech verified-current | Pass, with notes (L1, L3) |
| Ratifies the brownfield code | Mostly. `resetDb` change is correctly identified. Risks to existing tests: M8, L4. AD-1 component rule: H5 |
| No new AD weakens an inherited AD | Mostly. AD-11 shape (M1) and the AD-1 diagram (M2) are changed without being declared. AD-17 is amended explicitly and with the user's backing (PRD §8) |
| Every dimension decided, deferred or open | Operations and provider-key handling are thin (M10). Environments are well covered (AD-30) |
| Ask-first items shown as pending | Pass: schema (AD-24), `openai` (AD-25), `sqlite-vec` not requested, CI unchanged. The Provider and Enrichment are correctly marked approved (PRD §10, 2026-10-15) |
| Fresh clone / `db:reset` / `npm test` never need the Provider | Pass, conditional on M9 |

## Critical

None.

## High

### H1 — The eval cannot run Query interpretation or Match reasons through the shared pipeline

**Where:** AD-20, AD-22, AD-27, AD-32.

**Problem:** PRD §11 needs the eval to score SM-5 (Interpretation accuracy) and SM-4 (grounded Match reasons). The spine blocks both paths:

- AD-22 makes `submitQuery` in `actions.ts` "the only caller of `Provider.interpret`". `actions.ts` carries `server-only`.
- The reasons stage lives in `getMatchReasons` in `queries.ts`, also `server-only`, behind `io()` and React `cache`.
- AD-32 says the eval runs Golden queries "through `runSmartSearch`", which starts *after* interpretation and does not produce reasons.

So `scripts/search-eval.ts` must either break AD-22 and AD-1 (`server-only`) or re-implement the stages, which AD-20 forbids ("the eval never re-implements a stage"). Two units will build two interpretation and reasons paths.

**Fix:**

- Add two functions to `src/features/search/smart-search.ts`, with no `server-only` and no `io()`:
  - `interpretQuery(provider, query, current, catalog, today, signal)` calls `Provider.interpret` and then `applyInterpretation`.
  - `matchReasonsFor(provider, preferences, hotels, chunks, signal)` does the batching, the call and `validateReason`.
- Make `submitQuery` and `getMatchReasons` thin wrappers around them.
- Reword AD-22: "`interpretQuery` is the only caller of `Provider.interpret`. Its only callers are `submitQuery` and `scripts/search-eval.ts`."
- Make the same change for reasons in AD-27, and list both functions in AD-32's eval row.

### H2 — "Fused chunk score" and the per-Hotel exact-word score are undefined

**Where:** AD-26, AD-27.

**Problem:**

- AD-27 sends "top 3 chunks by fused chunk score" but no AD defines a chunk-level fused score.
- AD-26 defines Meaning as the Hotel's *best* chunk cosine, but does not say how chunk bm25 values become one Hotel exact score (max, sum, or best-chunk-only).
- `getMatchReasons(preferences, hotelIds)` gets neither the embedding nor the retrieval output. It must recompute retrieval itself, so the reasons unit and the ranking unit will each pick their own "top chunks".

This hits FR-16 grounding and SM-4 directly.

**Fix:** In `src/domain/relevance.ts`, define:

- `chunkScore(cosine, bm25) = 0.75·meaning(cosine) + 0.25·exact(bm25)`, using the same bounds and saturation.
- Hotel Meaning = max chunk meaning, and Hotel Exact = max chunk exact. Or define Relevance = max `chunkScore`. Pick one and state it.
- `topChunks(hotelId, scores, n = 3)`.

State that `getMatchReasons` recomputes the scores from the AD-28 cached embedding through these same functions, via `index.repo.ts`, and never re-ranks by another rule.

### H3 — The FTS5 content mode is left open, and the reset can corrupt the index

**Where:** AD-24.

**Problem:** AD-24 rightly makes `resetDb` skip `shadow` entries. It does not fix the FTS5 table's content mode, though.

`resetDb` deletes tables in name order: `search_chunks`, then `search_chunk_vectors`, then `search_chunks_fts`. The result depends on the mode:

- With an external-content table (`content='search_chunks'`, a common choice to avoid storing the text twice), a plain `DELETE FROM search_chunks_fts` runs after the content rows are gone. FTS5 then cannot remove the old tokens, the index goes out of step with its content, and later `MATCH` queries return ghosts or report corruption.
- With a contentless table, a plain `DELETE` is an error.

This is the exact failure AD-24 says it prevents.

**Fix:** Add one of these to the Rule:

- (a) "`search_chunks_fts` is a regular FTS5 table that stores its own copy of `text` (no `content=` or `contentless` option)". This is simplest, and correct with the current reset.
- (b) The reset clears it with `INSERT INTO search_chunks_fts(search_chunks_fts) VALUES('delete-all')` before the generic deletes.

Also add a `reset.test.ts` case: reset twice, then a `MATCH` query returns the expected row count and `INSERT INTO search_chunks_fts(search_chunks_fts) VALUES('integrity-check')` passes.

### H4 — Existing databases silently get an empty or stale Prepared index

**Where:** AD-24, MVP AD-6.

**Problem:** `openDb` seeds only when `hotels` is empty (`src/db/client.ts`, and MVP AD-6).

- After the migration lands, every existing database gets empty search tables: each developer's `data/checkinn.db` and the presenter laptop's. Smart search then shows Relevance 0 for every Hotel, a weak-match heading on every Query, and no error.
- Likewise, re-running `npm run search:index` updates the JSON, but no existing database sees it until someone runs `db:reset`, which also wipes Bookings.

The stale-index Vitest test checks the *file*, not the database. AD-24's "Prevents: an index that silently drifts" is not delivered.

**Fix:**

- Store the Prepared index hash (or `CHUNKING_VERSION` plus the file's SHA-256) in a one-row `search_meta` table.
- In `openDb` (still `src/db`, so AD-5 holds), reload *only* the search tables in one transaction when the row is missing or differs from the file.
- Add a client test: open a database seeded before the index existed, and expect chunks to be loaded.

Alternatively, choose the in-memory path from AD-24, which reads the file per process and cannot drift.

### H5 — The Match reason wiring breaks AD-1 and can break the 3-call cost cap

**Where:** AD-20, AD-27; MVP AD-1; PRD §9 Cost.

**Problem:** AD-20 has "each card's Match reason block" await `getMatchReasons(preferences, hotelIds)`, and AD-20's layer table puts the block in `src/components/smart-search/`. Two problems follow:

1. MVP AD-1 forbids `src/components` importing `queries.ts`.
2. React `cache` memoises by argument identity (`Object.is`). A `hotelIds` array built per card, or rebuilt by any caller, is a new key each time. That means one `Provider.reasons` call per card, breaking AD-27 ("one call per Preferences and Hotel set") and the PRD's "at most 3 Provider calls per Query".

**Fix:**

- The `/search` page (in `src/app/search/`) calls `getMatchReasons` once, after `searchHotels`.
- It passes the resulting promise, or a `Map<hotelId, Promise<MatchReason | null>>`, down as a prop. Each block reads it inside its own `<Suspense>`.
- If React `cache` is kept, key it by a primitive (`preferences + "|" + sortedIds.join(",")`).
- State that components under `src/components/smart-search/` only receive promises or values, never import `queries.ts`.

## Medium

### M1 — `submitQuery` failure shape is not stated against MVP AD-11

AD-22 says `submitQuery` "rejects an empty Query or one over 300 characters", but not how. MVP AD-11 fixes the shape: success redirects, and an expected failure returns `{ ok: false, code: "VALIDATION", … }`. Unexpected errors are caught, logged and returned as `SERVER_ERROR`.

The spine's inherited-row text ("ends in `redirect()`, including the fallback") covers Provider errors only.

**Fix:** State that validation returns the AD-11 `VALIDATION` result, `ProviderError` redirects to the fallback, and any other error follows AD-11 `SERVER_ERROR`. Also cover a crafted POST when `getProvider()` is null: redirect to the MVP URL for the current criteria.

### M2 — The AD-1 dependency diagram is amended without saying so, and the import rules have no enforcement

MVP AD-1 says "Follow the dependency diagram above". In that diagram, `scripts` may import only `src/db`. The new diagram adds `scripts → features` and `scripts → domain`, but the Inherited Invariants row presents this as unchanged.

AD-19 also says "only `azure.ts` imports `openai`" and "nothing outside `src/features/search` and `scripts/search-*.ts` imports `provider/`", with no way to check either. An ESLint `no-restricted-imports` rule would be an ESLint config change, which is ask-first.

**Fix:** Mark the AD-1 row "extended: `scripts/search-*.ts` may import `src/features/search` (non-`server-only` modules) and `src/domain`". Name a Vitest test (for example `src/features/search/provider/imports.test.ts`) that scans source files for those imports. That needs no ESLint change.

### M3 — Fallback mode behaviour is under-specified and conflicts with EXPERIENCE.md

EXPERIENCE.md Fallback says the page is "the MVP search … in MVP order, with MVP cards: no chips, no Best-fit room line, no Match reasons", for example "All destinations: 12 properties found". The spine has gaps and conflicts:

- **Filter:** AD-23 makes fallback apply `qualifyingRoomTypes`, including the new Party and Rooms occupancy check. That follows PRD FR-6, but it is not the MVP search EXPERIENCE describes, and can show fewer Hotels than the MVP.
- **Order and card:** no AD says fallback uses MVP `rank` and the MVP `fromPrice` card rather than the Ranking blend and `bestFit`.
- **Search bar on a fallback URL:** EXPERIENCE says this "runs the MVP search, drops the marker … keeps the Query in the box". Under AD-20 the result is `sq` present with no `fallback`, so `mode: "smart"` with empty Preferences: Ranking blend order with Best-fit cards, not the MVP search.
- **Embedding failure:** fallback on a normal URL keeps chips per EXPERIENCE. The spine does not say whether the Max price and Policy filters still apply. They should.

**Fix:** Add a fallback row to AD-20 or AD-23. Fallback means `qualifyingRoomTypes` with the URL's Hard criteria, then MVP `rank`, MVP card (no `bestFit`, no reasons), `notices` with the fallback notice. Decide, and record as a user decision, whether the Party and Rooms occupancy check applies in fallback. Define the mode for `sq` with empty `prefs`, no `maxPrice` and no `policy`. Either `"mvp"` with the box filled, matching EXPERIENCE, or `"smart"`, and update EXPERIENCE to match.

### M4 — The interpretation cache must hold raw validated output, not applied criteria

AD-22 and AD-28 cache "interpretation" keyed by Query + today. `applyInterpretation` depends on `current` (it keeps the Stay and Party) and on `catalog`. Caching the *applied* criteria would return the first guest's Stay and Party to the second guest.

Concurrent identical requests also both miss and both call the Provider.

**Fix:** "The interpretation cache stores the Provider's raw JSON, after schema parsing and before `applyInterpretation`. `applyInterpretation` runs on every submit." Cache in-flight promises, evicting on rejection, so concurrent misses share one call. Apply the same to embeddings and reasons.

### M5 — Nothing checks that the Query embedding matches the Prepared index

The index file records the embedding model and dimensions. At runtime the Query is embedded with whatever `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` points at. A different model, or the 3072-dimension option in Deferred, gives meaningless cosines with no error. The fake's `golden-embeddings.json` has the same coupling.

**Fix:** In AD-19 or AD-24: `embed` returns vectors whose length must equal the index's `dimensions`, or it throws `ProviderError("INVALID_OUTPUT")`, which leads to fallback. `search:preflight` compares the index's recorded model against a `CHECKINN_EMBEDDING_MODEL` value, or against the deployment's reported model. `search:index` writes both files with the same model and dimensions.

### M6 — The "if the schema is not approved" path does not mean "nothing else changes"

AD-24 says the in-memory path "scores BM25 in TypeScript; nothing else changes". But FTS5's `bm25()` with `porter unicode61` stems and normalises differently from a hand-written BM25. Exact-word scores, `BM25_K`, `STRONG_MATCH_THRESHOLD` and the Golden-query tests in `npm test` would all shift. `ftsQuery()` would also have no consumer.

**Fix:** Say the two paths are alternatives chosen once, at the schema-approval decision, not interchangeable at runtime. Record which tokeniser and stemmer the TypeScript path uses, and note that the constants and golden tests are re-baselined if the path changes. Better still, record the decision as a story-zero gate so no story builds against both.

### M7 — Partially cached Match reasons and "served from cache with the cards" are not designed

EXPERIENCE Re-running says that with the same Preferences, reasons come "from the cache with the cards: no skeleton, no streaming". A card whose reason isn't cached loads on its own.

AD-20 always streams through one shared promise. AD-28 caches per Hotel, but AD-27 calls once per Hotel *set*. The spine does not say what happens when part of the set is cached.

**Fix:** `getMatchReasons` returns per-Hotel values synchronously when cached. It makes one batched `reasons` call for the misses only, which counts as the one call. Cached values render without `<Suspense>` fallback, and misses use the shared promise.

### M8 — The Room type link in the ERD would break an existing reset test

The ERD draws `ROOM_TYPE ||--o{ SEARCH_CHUNK`, but AD-24 gives only an FK to `hotels`. `reset.test.ts`'s `mutate()` deletes `hotel-001-standard` with `foreign_keys = ON`. If a builder follows the ERD and adds an FK on `room_type_id`, that delete fails, and so does "restores the seed catalog …".

**Fix:** State the columns in AD-24:

- `search_chunks.hotel_id` has an FK to `hotels` with `ON DELETE CASCADE`.
- `room_type_id` is a plain nullable text column, or carries an FK with `ON DELETE CASCADE`.
- `search_chunk_vectors.chunk_id` has an FK to `search_chunks` with `ON DELETE CASCADE`.

Then run the existing `reset.test.ts` unchanged as an acceptance check.

### M9 — Bootstrap order and behaviour when `search-index.json` is absent

`insertCatalog` loads `search-index.json` on every seed and reset, including every `createTestDb()`. Producing that file needs a key (`search:index`). If the loader lands before the file is committed, a fresh clone, `db:reset` and `npm test` all fail.

After it lands, any Enrichment or chunking edit fails `npm test` ("run npm run search:index") for keyless contributors. That is intended, but it should be said.

**Fix:** In AD-24, the file is a precondition of the loader. The story that adds the loader (or the in-memory path) also commits `hotel-enrichment.json`, `search-index.json` and `golden-embeddings.json`, produced by a key holder. Say that editing the Enrichment or chunking needs a key holder to re-run `search:index` in the same PR.

### M10 — Operations and Provider-key handling are not decided

PRD §7 and EXPERIENCE ("Shared Provider key and rate limit") have attendees using "a key from the presenter". The spine does not decide:

- whether attendees get the presenter's key or a separate one
- the Azure deployment TPM/RPM quota, which is the real spend cap and rate limit
- key rotation or revocation after the event
- a budget alert
- who owns these

Rate limiting per visitor is deferred, but the spend control it depends on is not.

**Fix:** Add a short operations AD, or a Deferred entry with an owner and a trigger:

- one key per audience (presenter, attendees), with separate deployments or quotas
- the deployment TPM cap as the cost ceiling
- rotate both keys after the event
- `search:preflight` reports the deployment names, not the key

### M11 — AD-31's "no outbound request without a Provider" is not tested

AD-31 relies on "the MVP offline e2e spec stays green on the 3100 server". `e2e/support/network.ts` `blockNetwork` intercepts only *browser* requests, so server-side egress is invisible to it.

**Fix:** Add a Vitest test. With `CHECKINN_PROVIDER=off`, stub `globalThis.fetch` to throw, then run `getProvider()` and the `searchHotels` core (`runSmartSearch` path selection) and assert that nothing was called. Or name an existing mechanism that checks it.

## Low

- **L1 — `openai` 7.28.0.** Published 2026-10-04, so it passes the two-weeks-old rule. Twelve newer releases exist, up to 7.39.0 today. Record why 7.28.0 is pinned, or move to the newest version at least 14 days old when approval is given.
- **L2 — `resetDb` via `PRAGMA table_list`.** Filter `schema = 'main'`. Keep excluding `sqlite_%` (the pragma lists `sqlite_schema` as `type: 'table'`) and `__drizzle_migrations`. Keep the existing "empties tables it does not know about" test.
- **L3 — Model name unconfirmed.** PRD `.memlog.md` says "user said gpt-luna-6; deployment name to confirm". The Stack table states `gpt-6-luna` as fact. Mark it as needing confirmation by `search:preflight`; the env var carries the deployment name anyway.
- **L4 — Type growth vs existing tests.**
  - Adding a required `SearchCriteria.smart` needs `defaultCriteria` and the literals in `criteria.test.ts` updated.
  - Adding required `mode`, `weakMatch` and `notices` to `SearchResult` would break `search.repo.test.ts`'s `toEqual({ heading: null, cards: [] })` if `searchCatalog` returned them.
  - State that `searchCatalog` keeps its MVP shape and `searchHotels` adds the new fields.
- **L5 — AD-2 inherited row wording.** It says "every … Provider call … after `await io()`". MVP AD-2 says server actions need no `io()`, and `submitQuery` calls the Provider. Reword: "in rendering".
- **L6 — `place` and `ignored` render URL-supplied text.** React escapes it, but a shared link can carry any text in a CheckInn notice. Cap the length (around 60 characters) and restrict to letters, spaces and basic punctuation in the codec.
- **L7 — `npm test` guard.** Vitest does not load `.env.local`, but a shell-exported `AZURE_OPENAI_*` value would reach `getProvider()` in any test that calls it. Set `CHECKINN_PROVIDER=off` in `src/test/setup.ts`, or in `vitest.config.ts` `test.env`.
- **L8 — Housekeeping.**
  - Add `.eval-results/` to `.gitignore`.
  - `.env.example` replaces its placeholder comment with the AD-29 names.
  - PRD §10 approves only the "Enrichment file next to the seed". `data/seed/search-index.json` is derived data. Say that it rides on the schema-change approval, or place it under `data/search/` to keep `data/seed/` to approved content.
- **L9 — Best-fit totals.** `bestFit.totalRand` and `nightlyRand` must come from `src/domain/pricing.ts` (MVP AD-9), not be computed in `best-fit.ts`.
- **L10 — Fake fixtures.**
  - `fake-provider.json` interpretations must use `relativeStay`, or none, rather than absolute dates, so the e2e specs pass on any day.
  - Every Preferences string the fake yields must exist in `golden-embeddings.json`, or the "smart" specs silently become fallback specs. Add a Vitest check.
- **L11 — Playwright wiring.**
  - `webServer` becomes an array: 3100 with `CHECKINN_PROVIDER=off`, 3101 with `fake`. Only the first runs `npm run build` locally.
  - `e2e/support/db.ts` gains a second path constant.
  - `chromium` and `mobile` add `testIgnore: "smart/**"`.
  - New `smart-desktop` and `smart-mobile` projects set `use.baseURL` to 3101.
  - CI needs no workflow change, which is confirmed: `ci.yml` runs `npm run build` then `npm run test:e2e` with `CI` set.
- **L12 — Fake adapter in production builds.** `CHECKINN_PROVIDER=fake` works on any `next start`. That is acceptable for a demo, but say so. Optionally log a startup warning when the fake is active outside e2e.

## Counts

- Critical: 0
- High: 5
- Medium: 11
- Low: 12
