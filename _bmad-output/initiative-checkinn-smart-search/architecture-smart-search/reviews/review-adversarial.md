---
review: adversarial
lens: "Construct two units one level down that each obey every AD to the letter yet still build incompatibly. Every pair is a hole to close with a new or tightened AD."
target: ../architecture-smart-search.md
also-read:
  - ../../../initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md
  - ../../prd-smart-search/prd-smart-search.md
  - ../../ux-smart-search/EXPERIENCE.md
  - src/domain/criteria.ts, src/domain/types.ts, src/domain/selection.ts
  - src/features/search/queries.ts, src/features/search/search.repo.ts, src/db/reset.ts
date: 2026-10-19
verdict: NOT BUILD-READY. Close the 6 high findings before slicing epics; the medium ones can be closed in the same edit.
---

# Adversarial review: two compliant units that still clash

The spine is strong on layering, the Provider port, test isolation and the "one entry point" rule. Its holes sit where two units share a value that the spine names but never defines: who computes it, against which set, in what shape, and under which key. Each finding below names two units (epics or stories one level down), shows that both obey every AD, shows how they still clash, and proposes the AD wording that closes the hole.

Severity: **High** means the clash breaks a PRD metric, a guest flow or an e2e spec. **Medium** means rework or a flaky test. **Low** means a naming or ownership gap that one reviewer would catch.

## Summary

| # | Sev | Hole | Units in conflict | Fix in |
|---|---|---|---|---|
| F1 | High | Rooms auto-raise: which Room types, and does it override kept Rooms? Partial Party merge | Interpretation action ↔ Hard filter / eval SM-5 | AD-22, AD-26 |
| F2 | High | Relevance and reasons see non-qualifying Room-type chunks; "fused chunk score" undefined; reasons cache key ignores what was sent | Retrieval/relevance ↔ Match reasons ↔ Best-fit | AD-23, AD-26, AD-27, AD-28 |
| F3 | High | Two fallbacks share `mode: "fallback"` but differ; who catches the embed failure; does the Hard check apply | Hard filter ↔ `searchHotels` mode switch ↔ fallback e2e | AD-20, AD-23 |
| F4 | High | Notices: three shapes (MVP `CriteriaNotice`, `SmartCriteria.notes`, `SearchResult.notices`) and the "ignored" words the schema never asks for | Interpretation ↔ codec ↔ notices UI | AD-20, AD-21, AD-22 |
| F5 | High | Text keys: what is embedded vs what is cached vs what fixtures and golden embeddings are keyed by | Cache ↔ fake provider ↔ `search:index` ↔ e2e | AD-28, AD-30 |
| F6 | High | Golden-query file has no owner or schema; Preferences for golden embeddings don't exist in the PRD's Golden-query contents; eval can't reach interpretation | Eval runner ↔ `search:index` ↔ npm-test golden tests ↔ interpretation | AD-20, AD-22, AD-32 |
| F7 | Medium | `bestFit` has no home in `SearchCriteria`; `serializeCriteria` would leak Smart params onto Hotel page and `/book` | Codec extension ↔ card link ↔ Hotel page ↔ `/book` | AD-21 |
| F8 | Medium | Hotel page pre-selection when Rooms or Party change on the Hotel page; "available" means ≥ 1 or ≥ Rooms | Best-fit ↔ Hotel page room table | AD-26 |
| F9 | Medium | Card price fields in Smart mode: `nightlyRand`/`totalRand` vs `bestFit.*` | Ranking ↔ Listing card UI | AD-20 |
| F10 | Medium | FTS5 row mapping, per-Hotel BM25 aggregation, and the TypeScript BM25 fallback that cannot match FTS5 | Index loader ↔ `index.repo.ts` ↔ relevance ↔ golden tests | AD-24, AD-26 |
| F11 | Medium | Vectors: who normalises the query vector; BLOB bytes; Float32Array alignment | `azure.ts` / `fake.ts` ↔ relevance ↔ loader | AD-24, conventions |
| F12 | Medium | Fake reasons fixtures cite fixed chunk ids that the computed top 3 may not contain | Fake provider ↔ `validateReason` ↔ e2e | AD-30 |
| F13 | Medium | Smart e2e on port 3101 may book Rooms and race on one database | Smart e2e specs ↔ booking e2e projects | AD-30 |
| F14 | Medium | Box and Search bar: who owns "the box is empty at the moment Search is pressed" | Smart search box ↔ Search bar | AD-21 (or a new UI AD) |
| F15 | Low | Empty Preferences: what counts as empty; `ftsQuery` with no tokens; `weakMatch` with zero cards; who writes the Weak-match heading | Relevance ↔ ranking ↔ results page | AD-20, AD-26 |
| F16 | Low | Index loader signature and the `:memory:` test database | `src/db` loader ↔ `test-db.ts` ↔ golden tests | AD-24 |

---

## F1 (High) Rooms auto-raise: against which Room types, and does it override kept Rooms?

**Unit A: Interpretation action.** Implements AD-22 and AD-26: `applyInterpretation(raw, current, catalog, today)` calls `fewestRooms(party, roomTypes)` "over the candidate Room types". The story author reads "candidate" as every Room type in the catalog, because a pure function with a `catalog` argument cannot know Availability and the spine never says which slice of the catalog `actions.ts` loads.

**Unit B: Hard filter.** Implements AD-23: candidates are the MVP Destination and Stay match, then `maxGuests × rooms ≥ guests` per Room type. The author reads AD-26's "candidate Room types" as AD-23's candidate set: Destination-matched and available.

**Clash.** "6 adults in Stellenbosch". If the largest Room type in the catalog sleeps 6 (in Cape Town), A writes `rooms=1`; Stellenbosch's largest sleeps 4, so B filters everything out and the guest sees "Nothing matches". With B's reading, Rooms is 2 and Stellenbosch shows results. SM-5 (Rooms match expected) passes or fails depending on which story landed. Both readings obey AD-26 as written.

**Second clash, same rule.** AD-22 says "keeps Stay and Party when they are not stated" and "auto-raises Rooms". The Guest set Rooms to 3 in the Search bar, then types "quiet hotel in Durban". Unit A1 keeps 3 (Party not stated); unit A2 recomputes `fewestRooms` = 1 because "the Query states no Rooms". Both comply. Likewise "with 2 kids": does `adults` stay from the Search bar, and is Rooms re-raised for the new total? And "for 4": PRD FR-4 says 4 adults, 0 children, but if the Search bar had 2 children, does `children` reset to 0 (whole-Party replacement) or stay 2 (field-wise merge, total 6)?

**Proposed tightening (AD-22 and AD-26).**
- "`fewestRooms(guests, roomTypes)` runs over the Room types of every Hotel the interpreted Destination matches with MVP `matches` (every Hotel when Destination is empty), ignoring Availability, Stay and Max price. `actions.ts` loads them with one catalog read (`listRoomTypesFor(destination)` in `catalog.repo.ts`) and passes them in `catalog.roomTypes`."
- "Party merge: if the Query states any guest count, the Query's Party replaces the whole Party (`adults` from the count, `children` 0 unless stated). If it states none, the current Party is kept unchanged. Rooms: stated Rooms wins; else, if the Party came from the Query, `fewestRooms`; else the current Rooms is kept. Auto-raise never runs on a re-run (chip removal, Search bar Search, Back)."
- "`fewestRooms` returns `min(max(1, smallest ceil(guests / maxGuests)), adults, PARTY_LIMITS.rooms.max)`; with no Room types it returns the current Rooms."
- Name the Golden queries that pin each branch (Rooms stated; Party stated, no Rooms; nothing stated with Rooms 3 in the bar).

## F2 (High) What Relevance, Best-fit and Match reasons may see, and what "fused chunk score" is

**Unit A: Retrieval and relevance.** AD-26: "Retrieval scores the **whole** Prepared index, then keeps only qualifying Hotels." Meaning is "the Hotel's best chunk cosine". The author takes the max over all of a Hotel's chunks, including Room-type chunks of Room types that do not qualify. That keeps Relevance absolute and independent of the candidate set, as AD-26 wants.

**Unit B: Match reasons.** AD-23: "Retrieval, ranking and Match reasons only ever see qualifying Hotels **and Room types**." AD-27: "each Hotel sends its top 3 chunks by fused chunk score". The author filters out non-qualifying Room-type chunks before picking the top 3, and invents a fused score of `0.5·cosine + 0.5·bm25`, because "fused" is not defined anywhere.

**Clash.**
- A Hotel's Relevance comes from its Penthouse chunk ("private plunge pool"), which fails Max price. A ranks it first for "plunge pool"; B's reason, built only from qualifying chunks, cannot mention the pool, so the card ranks first with a reason that does not explain why. SM-1 and SM-4 pull against each other.
- A third story (eval) computes "fused" a third way and the eval's grounding report no longer matches the app.
- AD-28 keys reasons by "normalised Preferences + Hotel id + Prepared index hash". If B filters by qualifying Room types, the chunks sent depend on Stay, Party and Max price, which are not in the key. After the Guest raises the Party, the cached reason still says "family rooms that sleep 4" from a Room type that no longer qualifies. If A's reading wins (all chunks), AD-23's "only ever see qualifying Room types" is broken.
- "Prepared index hash" is undefined: hash of the file bytes, of the chunk hashes, or `CHUNKING_VERSION`?

**Proposed tightening.**
- AD-26: "Chunk score: `chunkScore = 0.75 · meaning(cos) + 0.25 · exact(bm25)` per chunk, with the same maps as Relevance, exported from `relevance.ts` as the only fusion. Hotel Relevance is the max `meaning` and max `exact` over the Hotel's **eligible** chunks. Eligible chunks are every non-room chunk plus the room chunks of qualifying Room types (AD-23). This keeps Relevance independent of which *other* Hotels are candidates, which is what FR-9 asks for." (Or, if the team prefers all chunks, delete "and Room types" from AD-23 and say reasons may cite non-qualifying rooms. Either way, pick one in the spine.)
- AD-27: "The top 3 eligible chunks by `chunkScore`, ties by chunk id ascending."
- AD-28: "Match reasons are keyed by `normaliseText(preferences)` + Hotel id + the sorted ids of the chunks sent + `indexHash`." AD-24: "`search-index.json` carries `indexHash` = SHA-256 of model, dimensions, `CHUNKING_VERSION` and every `id:contentHash` in id order; `search:index` writes it and the stale-index test recomputes it."

## F3 (High) Two fallbacks, one mode, no owner for the embed failure

The spine has one `mode: "fallback"` and two triggers: `smart.fallback` from the URL (interpretation failed) and "the embedding call fails" (render-time). EXPERIENCE treats them differently: the first is "the MVP search for the Search bar values from before the submit, in MVP order, with MVP cards" and no chips; the second keeps "the Hard criteria from that URL still applied and its chips kept".

**Unit A: `runSmartSearch` (pipeline core).** Catches the `ProviderError` from `embed` inside the pipeline, as AD-20's mode rule implies ("the mode is decided in one place"), applies `qualifyingRoomTypes` as AD-23 says ("the fallback applies the same check with whatever Hard criteria its URL holds") and orders by MVP `rank`.

**Unit B: `searchHotels` in `queries.ts`.** Lets `runSmartSearch` throw, catches it in `searchHotels` (where AD-20 says the mode is decided) and calls the existing `searchCatalog`, because EXPERIENCE says the fallback page "is the MVP search".

**Clash.** B's fallback drops Max price and Policy criteria (MVP `searchCatalog` knows neither) and the capacity check, so a reload during a Provider outage shows a Hotel that breaks a Hard criterion, failing SM-3 and FR-6 ("the fallback applies these same checks"). A's fallback passes, but its cards come from which card builder? The MVP card's "from" price is the cheapest available Room type, which may be one that fails capacity or Max price, so the card shows a price for a room the Guest cannot book. Also: in A, which notices carry the fallback notice, since `fallback=1` is not in this URL? And does the URL-fallback (`fallback=1`) also apply the capacity check, which the MVP never did? Then the "MVP search" on a fallback URL gives fewer Hotels than the same URL without `sq`. Both units obey every AD.

**Proposed tightening (AD-20, AD-23).**
- "`runSmartSearch` never throws a `ProviderError`. It catches the embed failure and returns `mode: "fallback"` with `notices` including `fallback`. `searchHotels` does not catch."
- "In `mode: "fallback"` the pipeline runs stages 2 (Hard filter) and builds MVP-shaped cards (no `bestFit`, no reasons), ordered by MVP `rank`. The card's `nightlyRand` and `totalRand` are computed over **qualifying** Room types only, in every mode except `"mvp"`."
- "With `fallback=1` the Hard criteria are the URL's MVP criteria plus the capacity rule, so the fallback page may hold fewer Hotels than the MVP page. Chips render only when Max price or Policy criteria are present (never on a `fallback=1` URL, because `submitQuery` writes none)." Then reconcile EXPERIENCE "the page is the MVP search" with a one-line note: "MVP order and cards, with FR-6's checks".

## F4 (High) Notices: three shapes and a field the schema never asks for

Shapes in play:
- MVP `CriteriaNotice` in `SearchCriteria.notice`, URL `notice` and `rt` (`src/domain/types.ts`, `criteria.ts`).
- `SmartCriteria.notes` (AD-20), never defined.
- `SearchResult.notices` (AD-20), never defined.
- URL params `place`, `ignored`, `fallback` (AD-21).

**Unit A: codec extension.** Parses `place` and `ignored` into `smart.notes: { place: string | null; ignored: string[] }`, `ignored` as a comma list, because AD-21's table calls `policy` a comma list and says nothing about `ignored`.

**Unit B: Notices UI.** Renders `result.notices` as `Array<{ id: "notice-fallback" | "notice-place" | "notice-value"; text: string }>` built by the pipeline, capped at two, as EXPERIENCE requires.

**Unit C: interpretation.** Validates each field and "drops invalid ones into `ignored`". A rejected `checkIn` is the string `"2026-10-13"`; the notice copy is "We couldn't use 'last Tuesday', so check your dates." The JSON schema in AD-22 has no field for the Guest's words behind a value, so C writes the ISO date, B prints "We couldn't use '2026-10-13'", and the PRD's example cannot be produced.

**Clash.** Nobody owns the mapping `notes → notices`; `ignored` with a comma inside ("Tuesday, 3pm") splits wrongly; the MVP `notice` param is also a "notice" and a future story may reuse it; the eval (SM-5) has no stable shape to score "ignored" against.

**Proposed tightening.**
- AD-22: add to the schema `sourceText: { checkIn, checkOut, adults, children, rooms, maxPrice }`, each the Query words the value came from, or null. `applyInterpretation` puts the source words of a dropped value in `ignored`; with no source words it uses a fixed label ("your dates", "the number of guests").
- AD-21: "`ignored` holds one phrase (the first dropped), ≤ 60 characters; `place` ≤ 60 characters. Both are display text only." (One phrase matches "at most two notices".)
- AD-20: "`SmartCriteria.notes` is `{ place: string | null; ignored: string | null }`. `SearchResult.notices` is `SmartNotice[]` with `SmartNotice = { kind: "fallback" } | { kind: "place"; place: string } | { kind: "ignored"; phrase: string }`, already sorted by priority and capped at 2 in `runSmartSearch`. Copy is built from `kind` in one component. The MVP `CriteriaNotice` is unrelated and keeps the `notice` param."

## F5 (High) Text keys: embedded text, cache keys and fixture keys diverge

**Unit A: `cache.ts` and `azure.ts`.** AD-28 keys the embedding cache by `normaliseText(prefs)` but says nothing about what text is sent. The author sends the raw URL `prefs` to `embed`.

**Unit B: `fake.ts`.** AD-30: fixtures map "Queries → interpretations, Preferences → reasons" and golden embeddings map "Preferences → vectors". The author looks up by exact string.

**Unit C: `search:index`.** Embeds "the Golden queries' Preferences" as written in the golden file.

**Clash.**
- A: "Pool, quiet" and "pool, quiet" share a cache key but embed differently. Which vector is cached depends on which URL came first, so the same URL gives a different order after a restart (breaks FR-13).
- B: the codec trims `prefs` (`readText`), the fake's interpretation fixture has a trailing space or different case, and `embed` throws `UNAVAILABLE`. The Smart e2e spec silently tests the fallback, not the Smart page, and stays green on a wrong page unless it asserts the mode.
- B: fixture interpretations with absolute `checkIn` dates go past within a week and are dropped into `ignored`; with `relativeStay` they track the real clock. AD-30 allows either.
- C: if the golden file's Preferences differ by case or spacing from what the fake's interpretation returns, the npm-test golden run and the e2e run use different vectors.

**Proposed tightening.**
- AD-28: "Every Provider text input and every cache or fixture key is `normaliseText(text)`. `embed` is always called with the normalised text, so the cached vector is the vector of the key."
- AD-30: "`fake.ts` looks up every fixture by `normaliseText`. Interpretation fixtures never hold absolute dates; they use `relativeStay` or no dates. A Vitest test checks every fixture interpretation's `preferences` has a vector in `golden-embeddings.json` and every e2e Query has an interpretation fixture. Every Smart e2e spec asserts it is not on the fallback page (no `#notice-fallback`) except the fallback specs."

## F6 (High) The Golden-query file has no owner, and its Preferences come from nowhere

**Unit A: eval runner.** AD-32: "runs every Golden query through `runSmartSearch`". `runSmartSearch` takes `SearchCriteria`, not a Query. To score SM-5 (interpretation accuracy) the runner needs `interpret` + `applyInterpretation`, but the only caller of `Provider.interpret` is `submitQuery` (AD-22), which is `server-only` and ends in `redirect()`. The author re-implements the action body in the script, which AD-20 forbids ("the eval never re-implements a stage") and AD-22 forbids ("`submitQuery` is the only caller").

**Unit B: `search:index`.** Embeds "the Golden queries' Preferences". PRD's Golden-query contents are the expected Hard criteria, acceptable Hotels and expected Best-fit room; there is no Preferences field. The author adds `expectedPreferences`.

**Unit C: npm-test golden tests (AD-30).** Build `SearchCriteria` from the golden file's expected Hard criteria plus `expectedPreferences`, inject the fake.

**Unit D: Golden-query author.** Writes the file before the Enrichment (FR-17) in whatever shape they like, since no AD owns its schema.

**Clash.** Four units invent the format. The live eval ranks with the Provider's Preferences, npm test ranks with hand-written ones, so the two report different SM-1 for the same query. Expected Best-fit is a Room type id or a name? Expected Rooms where? `heldOut` is boolean or a list?

**Proposed tightening.**
- AD-22: "The interpretation core is `interpretQuery(provider, query, current, catalog, today, signal)` in `src/features/search/interpret.ts`, without `server-only`. It calls `Provider.interpret` and `applyInterpretation`, uses the interpretation cache, and returns criteria or throws `ProviderError`. `submitQuery` and `scripts/search-eval.ts` are its only callers; `submitQuery` adds the redirect."
- AD-32: "`src/domain/golden.ts` owns the `GoldenQuery` type and a parser that every reader uses: `{ id, query, today, current: SearchCriteria-in-URL-form, heldOut, kind, expected: { destination, stay, party, maxPriceRand, policies, preferences, acceptableHotelIds, bestFit: { roomTypeId, rooms } | null, nothingFits } }`. `expected.preferences` is the text `search:index` embeds and npm-test golden tests use; the live eval also reports a 'Preferences drift' column when the Provider's Preferences differ."

## F7 (Medium) `bestFit` has no home in `SearchCriteria`, and the codec would leak Smart params

**Unit A: codec extension.** AD-21: "`smart` is non-null exactly when `sq` is present." The author puts `bestFit` in `SmartCriteria` with the other new params, and `serializeCriteria` writes `smart` whenever it is set, as it writes every other field.

**Unit B: Listing card link.** AD-21: "The Listing card link adds `bestFit` and keeps the MVP criteria." The author calls the existing `hotelHref(card.hotelId, linkCriteria)` with `bestFit` added.

**Clash.** On the Hotel page there is no `sq` (it is not carried), so A's parser gives `smart: null` and `bestFit` is lost. If B passes the whole criteria, A's serializer writes `sq`, `prefs`, `maxPrice` and `policy` onto the Hotel page, which AD-21 forbids. The same leak reaches `/book` and its redirects (`book-content.tsx` rebuilds URLs with `hotelHref`, `searchHref` and `roomTableHref` from parsed criteria).

**Proposed tightening (AD-21).** "`SearchCriteria` gains a top-level `bestFit: string | null`, parsed on every page. `serializeCriteria` writes `smart` params only into `searchHref`; `hotelHref` and every `/book` and room-table href drop `smart` and keep `bestFit` only on the Hotel page. A codec test asserts `hotelHref` never contains `sq`, `prefs`, `maxPrice`, `policy`, `fallback`, `place` or `ignored`."

## F8 (Medium) Hotel page pre-selection when Rooms or Party change there

**Unit A: Best-fit.** Picks `bestFit` with the search's Rooms, under `count ≥ rooms` and capacity (AD-23).

**Unit B: Hotel page room table.** AD-26: "pre-selects `bestFit` with the URL's `rooms`. It shows nothing if that Room type is not available." The author uses MVP "available" (`isAvailable`, count ≥ 1).

**Clash.** The Hotel page has its own Stay and Party picker (`stay-party-picker.tsx`). The Guest changes 2 Rooms to 3, or the Stay. B pre-selects 3 of a Room type with 2 left (count ≥ 1 passes), or a Room type that no longer sleeps the Party, and the summary says "Family Room picked for your search" over an invalid selection. Also undefined: does `bestFit` survive a Stay/Party change on the Hotel page, and does `sel` in the URL beat it (EXPERIENCE says yes, the spine is silent)?

**Proposed tightening (AD-26).** "The Hotel page pre-selects `bestFit × party.rooms` only when `sel` is absent and `qualifyingRoomTypes` (without Max price) still includes that Room type for the page's Stay and Party; otherwise nothing is pre-selected and no chip shows. When `sel` is present it wins and `bestFit` only places the chip. Changing Stay or Party on the Hotel page keeps `bestFit` in the URL and re-checks it."

## F9 (Medium) Which price fields a Smart card carries

**Unit A: pipeline/ranking.** Fills `bestFit.nightlyRand` and `bestFit.totalRand`, leaves the MVP `nightlyRand` and `totalRand` as MVP computes them (cheapest available Room type), as AD-20 only adds an optional field.

**Unit B: Listing card UI.** EXPERIENCE: "the price is that room's price for the Rooms shown, with no 'from'". The author keeps reading `card.totalRand`, since `ListingCard`'s fields are "the seam" and must not change meaning.

**Clash.** The card shows the Best-fit line "Family Room · 1 room · sleeps 4" next to the cheapest Room type's total, which may be a room that does not sleep the Party. Tie-break "the lower Best-fit Nightly price" (AD-26) and the MVP card's `nightlyRand` diverge too.

**Proposed tightening (AD-20).** "In `mode: "smart"` the card's `nightlyRand` and `totalRand` equal `bestFit.nightlyRand` and `bestFit.totalRand`, and `bestFit` is always present. In `"fallback"` they are the cheapest **qualifying** Room type (F3). In `"mvp"` they are as in the MVP. The card shows 'from' only when `bestFit` is absent."

## F10 (Medium) FTS5 mapping, per-Hotel BM25, and the TypeScript fallback

**Unit A: index loader.** Creates `search_chunks_fts` as an external-content table (`content='search_chunks'`) keyed by `search_chunks`' integer rowid.

**Unit B: `index.repo.ts`.** Joins FTS hits to chunks by a `chunk_id UNINDEXED` column it assumed exists.

**Clash.** Both obey AD-24 ("a hand-written FTS5 table"), but the join is undefined, and with external content the reset's delete of `search_chunks` without the FTS `'delete'` command corrupts the index even though shadow tables are skipped. Also: "Exact words: FTS5 bm25 over the index" is per chunk; per Hotel, unit C takes the max and unit D the sum. And the "schema not approved" path "scores BM25 in TypeScript; nothing else changes": a TypeScript BM25 cannot reproduce FTS5's `porter unicode61` tokenizer and its bm25 constants, so `BM25_K`, `STRONG_MATCH_THRESHOLD` and the golden tests tuned on one path fail on the other. "Nothing else changes" is false.

**Proposed tightening.**
- AD-24: "`search_chunks_fts` is a regular (not external-content, not contentless) FTS5 table: `fts5(chunk_id UNINDEXED, text, tokenize='porter unicode61')`. `index.repo.ts` joins on `chunk_id`."
- AD-26: "A Hotel's exact score is its best chunk's saturated, negated `bm25` over eligible chunks (F2)."
- AD-24: "The schema approval is decided before the retrieval story starts. Only one exact-words implementation exists; the constants are tuned on that one."

## F11 (Medium) Vector normalisation, BLOB bytes and alignment

**Unit A: `azure.ts`.** Returns the API's vectors as-is (they are unit length for `text-embedding-3-large` with `dimensions`, give or take float error).

**Unit B: `fake.ts`.** Decodes `golden-embeddings.json`, written as JSON number arrays because AD-30 does not name the format.

**Unit C: `relevance.ts`.** Uses the dot product and assumes both sides are unit length, since the convention says "unit-normalised on load", and the query vector is not "loaded".

**Clash.** Cosine silently becomes dot product on unnormalised fake vectors, so `MEANING_BOUNDS` shift in npm test only. Separately, decoding base64 with `Buffer.from` and wrapping it in `new Float32Array(buf.buffer, buf.byteOffset, n)` throws a `RangeError` when `byteOffset` is not a multiple of 4 (pooled Buffers), and it "works on my machine".

**Proposed tightening (conventions and AD-24).** "Every vector, from a file, the database or the Provider, passes through one `toUnitVector(bytes | number[])` in `relevance.ts`, which copies into a fresh `Float32Array`, checks the length equals the index's dimensions and normalises. `golden-embeddings.json` uses the same base64 little-endian float32 encoding as `search-index.json`. The BLOB holds exactly the decoded bytes."

## F12 (Medium) Fake reasons cite fixed chunk ids

**Unit A: fake provider.** AD-30: fixtures map "Preferences → reasons". The author writes `{ hotelId, reason, citedChunkIds: ["h07:review:2"] }`.

**Unit B: `validateReason`.** Keeps a reason only if every cited id is in that Hotel's **sent** chunks (top 3, AD-27).

**Clash.** Any change to the Enrichment, the chunking or the fusion moves `h07:review:2` out of the top 3. Every e2e reason is dropped, the card shows no reason, and the spec that asserts "Why it matches" breaks for a reason unrelated to the change.

**Proposed tightening (AD-30).** "The fake's `reasons` returns the fixture text for each Hotel and cites the first chunk id it was **sent** for that Hotel. Fixtures hold no chunk ids." A Vitest test still runs `validateReason` on every fixture text.

## F13 (Medium) Smart e2e can book and race on one database

**Unit A: Smart e2e (Flow 1).** `e2e/smart/` runs on port 3101 against its own database (AD-30) in the parallel desktop and mobile projects. UJ-1's climax is "she taps Reserve", so the author completes the booking.

**Unit B: Booking e2e rule (AGENTS.md).** Specs that create Bookings run serially in `e2e/booking/`, against 3100 with the Provider off, so the Smart booking cannot go there.

**Clash.** The desktop Smart spec books Winelands' Family Room for next weekend; the mobile Smart spec, in parallel, now finds no qualifying Room type, "Nothing matches" replaces the expected card, and the result depends on run order. AD-30 is silent.

**Proposed tightening (AD-30).** "Specs in `e2e/smart/` are read-only: they stop at Reserve enabled and never confirm. A Smart spec that books lives in `e2e/smart-booking/`, runs serially against 3101 after the read-only projects, and uses `uniqueGuestEmail()`."

## F14 (Medium) Who owns "the box is empty when Search is pressed"

**Unit A: Smart search box.** A client component with its own `useState` for the text (AD-13 allows state in a client component).

**Unit B: Search bar.** Builds its URL with `serializeCriteria` from its own fields plus the Smart params from the URL (AD-21).

**Clash.** EXPERIENCE: "The box counts as cleared when it is empty at the moment Search is pressed", and edited but unsubmitted text is not used. B cannot see A's state, so it can never know the box was cleared and always keeps the Smart params, or A pushes a URL on every clear, which EXPERIENCE forbids ("It does not re-run the search").

**Proposed tightening (AD-21 or a new UI AD).** "The Smart search box and the Search bar share one client state owner, `SmartSearchProvider` in `src/components/smart-search/`, which exposes `boxIsEmpty` and the submitted Query. The Search bar reads `boxIsEmpty` at Search time: empty drops every Smart param; non-empty keeps the URL's `sq` and `prefs`, never the box's unsubmitted text."

## F15 (Low) Empty Preferences paths, weak match with no cards, and who writes the heading

- "Empty Preferences" (AD-26): absent `prefs`, `prefs` that is whitespace, or `prefs` that `ftsQuery` turns into no tokens ("!!!")? The last case calls `embed` but builds `MATCH ''`, which is an FTS5 syntax error. Define: "Preferences are empty when `normaliseText(prefs)` is empty. `ftsQuery` returns null when no word token remains, and exact is 0."
- `weakMatch` with zero qualifying Hotels: is it true (no Strong match) or false? EXPERIENCE needs the no-results state, not the Weak-match heading. Define: "`weakMatch` is true only when `cards.length > 0`, Preferences are not empty and no card is a Strong match."
- Heading owner: does `runSmartSearch` set `heading` to the Weak-match text, or does the page build it from `sq` and `weakMatch`? Define: "`SearchResult.heading` stays the MVP count line; the page renders the Weak-match heading from `weakMatch` and `smart.query`." And the no-results body that names the Hard criteria is built from `criteria`, in one domain function.

## F16 (Low) The index loader and the test database

**Unit A: loader.** Extends `loadSeed()` to read `search-index.json` and `insertCatalog(tx, seed)` to insert chunks, as AD-24 says ("in the seed and reset transaction").

**Unit B: golden tests in npm test.** Use `src/db/test-db.ts` on `:memory:`; if that helper seeds with a trimmed `Seed` fixture (not `loadSeed()`), the index tables are empty and every Relevance is 0, and the tests pass vacuously.

**Proposed tightening (AD-24).** "`Seed` gains `searchIndex`; `loadSeed()` reads it; `insertCatalog` loads it. `test-db.ts` seeds from `loadSeed()` for golden tests. A golden test fails if the index has fewer chunks than `buildChunks` produces." The existing `resetDb` lists tables from `sqlite_master` (`src/db/reset.ts`), which also returns FTS5 shadow tables; the AD-24 switch to `PRAGMA table_list` must land in the same story as the FTS table, not later.

---

## What held up

- The Provider port and its single SDK importer (AD-19, AD-25).
- One entry point and one pipeline core shared with the eval (AD-20), once F6 adds the interpretation core.
- Test isolation by environment and port (AD-30), once F5, F12 and F13 are closed.
- Reset never calling the Provider, and the stale-index test (AD-24).
