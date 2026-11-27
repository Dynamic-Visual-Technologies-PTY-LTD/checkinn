---
review: reconcile-inputs
target: ../architecture-smart-search.md
inputs:
  - ../../prd-smart-search/prd-smart-search.md
  - ../../prd-smart-search/addendum.md
  - ../../prd-smart-search/.memlog.md
  - ../../ux-smart-search/EXPERIENCE.md
  - ../../ux-smart-search/.memlog.md
date: 2026-10-19
---

# Reconcile: architecture spine against PRD and UX inputs

## Verdict

**Needs fixes before build.** No input decision is overturned without reason. The user's fixed decisions all land: Azure Foundry and gpt-6-luna, Responses API, `text-embedding-3-large` at 1024 dimensions, no local model, box hidden without a Provider, Enrichment beside an unchanged seed, one Ranking blend picked from three, strict Policy criteria, Rooms auto-raise, URL as the only state, and the ask-first items left pending. Most quiet requirements land too: the 2.5 s and 5 s timeouts, the 300-character cap, at most 3 Provider calls, a debug flag that a URL cannot turn on, `db:reset` and `npm test` never calling the Provider, the shadow-table reset hazard, and fallback URL contents.

The gaps cluster in four places:

1. The eval cannot share the interpretation and reasons stages as written.
2. Fallback-mode behaviour is under-specified: order, card, and a Search bar Search on a fallback URL.
3. The Match-reason delivery shape conflicts with the UX cache and announcer rules.
4. A handful of interpretation outputs (ignored words, place words, Rooms) are not derivable or are ambiguous.

Severity: **High** means a builder will build the wrong thing or must invent a design. **Medium** means ambiguous, so two builders would diverge. **Low** means a gap or wording fix.

## Findings

### F1. High: the eval cannot run interpretation or Match reasons through shared code (AD-20, AD-22, AD-27, AD-32)

AD-20 says the eval "never re-implements a stage" and calls `runSmartSearch`. But `runSmartSearch` starts from `SearchCriteria`, which comes after interpretation. Two stages live only in `server-only` files:

- **Interpretation:** prompt building, `Provider.interpret` and `applyInterpretation` wiring live in `actions.ts`.
- **Match reasons:** chunk selection, the `reasons` call, `validateReason` and caching live in `queries.ts` `getMatchReasons`, wrapped in React `cache`.

The eval needs both:

- SM-5 interpretation accuracy needs the Search bar, Rooms and chips (FR-18, §11).
- SM-4 and FR-19 grounding need the reasons.

So `scripts/search-eval.ts` would have to duplicate the instructions, the schema, the top-3 chunk selection and the validation. **Fix:** name two more non-`server-only` cores in `src/features/search`, for example `interpretQuery(provider, query, current, catalog, today)` and `generateReasons(provider, index, preferences, hotelIds)`. `submitQuery`, `getMatchReasons` and the eval all call them. AD-32's eval row should say it uses them.

### F2. High: fallback-mode order, cards and Best-fit are not stated (AD-20, AD-23)

PRD FR-2 says fallback results are "in the MVP order", Match reasons are not shown, and every already-known Hard criterion is applied. EXPERIENCE Fallback says the cards are MVP cards: no Best-fit room line, no chips, no skeletons. The spine sets `mode: "fallback"` and says AD-23's check applies, but:

- It never says fallback orders by MVP Review score then price rather than `RANKING_BLEND`.
- It never says `ListingCard.bestFit` is absent and the MVP cheapest-price line is used.
- In the embed-failure fallback (a reload of a normal Smart search URL), EXPERIENCE keeps the chips and applies the URL's Max price and Policy criteria. The spine does not say whether chips render when `mode: "fallback"` comes from an embedding failure rather than `fallback=1`.

**Fix:** add one rule to AD-20 for each of order, card shape, chips and notices in `"fallback"`. Also say whether Party capacity filters in fallback. PRD FR-6 says yes; EXPERIENCE says "the MVP search for the Search bar values", which reads as no. The spine follows the PRD implicitly and should say so explicitly.

### F3. High: a Search bar Search on a fallback URL contradicts EXPERIENCE (AD-20, AD-21)

EXPERIENCE Fallback URL says a Search bar Search on the fallback page "runs the MVP search, drops the marker and the notice, and keeps the Query in the box". Under the spine:

- `smart` is non-null whenever `sq` is present.
- `fallback` is not said to be dropped.
- The fallback URL has no `prefs`.

The next Search therefore either stays in `"fallback"` (if the marker is kept) or becomes `"smart"` with empty Preferences: blend order, Best-fit line, Party filter. Neither is "the MVP search". AD-21 only defines the empty-box case. **Fix:** state that a Search bar Search always drops `fallback`, `place` and `ignored`. Then either decide what an `sq` with no `prefs` and no chips means (MVP mode, to match the UX) or record the deviation and update EXPERIENCE.

### F4. High/Medium: one shared reasons promise cannot meet the UX cache and announcer rules (AD-20, AD-27, AD-28)

AD-20 has every card await one shared `getMatchReasons(preferences, hotelIds)` promise. AD-28 caches reasons per Hotel. EXPERIENCE Re-running needs two things:

- Cached reasons render **with the cards**, with no skeleton and no "Match reasons added".
- Only uncached Hotels go through Reason loading.

With one shared promise, a single cache miss makes every card wait, cached ones included, so they show skeletons. The spine also does not say:

- whether a partial cache hit sends a batch for the missing Hotels only
- how a cached reason is resolved synchronously, so it renders in the shell and not behind a Suspense fallback
- how the client learns whether at least one reason "streamed in", which the "Match reasons added" rule needs

**Fix:** resolve cached reasons per Hotel before the cards render and pass them inline. Batch only the misses into one call, keeping the at-most-3-calls rule. Stream only the misses, and mark each streamed block so the announcer can count settled versus streamed. The announcer internals can stay deferred, but the data shape cannot.

### F5. Medium: the `ignored` notice cannot name the Guest's words from the schema (AD-21, AD-22)

PRD FR-4 and EXPERIENCE say "We couldn't use 'last Tuesday', so check your dates." AD-22's strict schema returns only typed values: `checkIn`, `adults` and so on. When `applyInterpretation` drops a past `checkIn`, it has a date, not the phrase "last Tuesday", so `ignored` cannot hold "the Query words that could not be used". **Fix:** add per-field source spans to the schema (for example `checkInText`, or one `sourceText` map), or define the notice copy from the field name ("your dates") and update EXPERIENCE.

### F6. Medium: out-of-catalog place words are not added to Preferences (AD-22)

PRD FR-4 says that for an unknown place such as "Kruger", "the place's words still count as Preferences". AD-22 fills `place` and leaves Destination empty, but never says `applyInterpretation` adds the place to `preferences`. It may assume the model will, but the output is untrusted and the rule should be deterministic. **Fix:** append the place to Preferences in `applyInterpretation` unless it is already there.

### F7. Medium: Rooms auto-raise conflicts with "Party keeps its current value" (AD-22, AD-26)

PRD FR-4 says Stay and Party, "including Rooms" per the Glossary, keep their Search bar values when the Query does not mention them. It also says that when no Rooms are stated, Rooms is the fewest that sleep the Party. AD-26 runs `fewestRooms` whenever the Query states no Rooms. A Query that says nothing about the Party would therefore overwrite a Guest's chosen Rooms, for example 2 rooms for 2 adults becoming 1. **Fix:** state the precedence. Suggested: auto-raise only when the Query states a guest count or the current Rooms cannot sleep the Party; otherwise keep the current Rooms.

### F8. Medium: Hotel page precedence between `bestFit` and the MVP `sel` parameter (AD-21, AD-26)

The MVP codec already has a `sel` parameter for the room selection. EXPERIENCE says that once the Guest changes a quantity, "the MVP selection rule applies and wins over `bestFit` on reload; `bestFit` then only places the chip". AD-26 says only "pre-selects `bestFit` with the URL's `rooms`". It does not say:

- that pre-selection applies only when `sel` is absent
- that the chip still shows when `sel` is present
- what "not available" means: count = 0, or count < `rooms`, which MVP `clampSelection` would lower with an alert
- that `bestFit` is ignored when no Provider is configured (the EXPERIENCE off switch)
- what "checked against `hotel`" means: the route `hotelId`, or the codec's existing `hotel` parameter

**Fix:** add these four rules to AD-26.

### F9. Medium: URL text in notices is a content-spoofing surface (AD-21)

`place` and `ignored` are free text read from the URL and shown inside trusted notice copy ("We don't have hotels in …"). On a shared stand with visitors' phones and shared links, a crafted URL can put any wording into CheckInn's voice, for example a phone number or a "free stay" claim. The only rule in AD-21 is "Invalid value: Dropped", and "invalid" is never defined. **Fix:** give both parameters a length cap (for example 40 characters) and a character allowlist (letters, spaces, apostrophes, hyphens). Drop values with digits, `@`, `/` or currency, the same patterns `validateReason` rejects.

### F10. Medium: the timeout budget exceeds the 3 s results NFR (Consistency Conventions "Timeouts", AD-22)

PRD §9 says Search results appear within 3 s. On a cold Query the interpretation timeout (2.5 s) and the embedding timeout (1.5 s) run in sequence: interpretation in the action, embedding at render. Together they allow about 4 s plus the redirect before the fallback. **Fix:** cap the embedding at the remaining budget (for example `min(1.5 s, 3 s - elapsed)`), or start the Preferences embedding inside `submitQuery` right after interpretation and warm the cache before the redirect. Or record the worst case as accepted.

### F11. Medium: shared pending state across the box, Search bar, Example queries, Try again and the listing (AD-13, AD-29)

FR-1 and EXPERIENCE Submitting require five separate components to react while `submitQuery` runs:

- the Search bar
- the clear button
- the Example queries
- Try again (inside the notice, below the heading)
- the listing (three skeletons with `aria-busy`)

The Search bar must also know whether the box is empty at the moment Search is pressed (FR-5, AD-21). These are siblings in different parts of the page. The spine only says the box gets a boolean prop. **Fix:** name one client provider, for example a `SmartSearchProvider` context around the search area. It holds the action's pending state and the box's current text, Try again submits through it, and it sits outside the per-search Suspense boundary. That boundary is also what EXPERIENCE's chip-focus restore and the results status live region depend on, so the chip row and those regions must not be re-keyed per URL.

### F12. Medium: where the Golden queries' Preferences text comes from (AD-30, AD-32)

AD-32's `search:index` "embeds the Golden queries' Preferences", and AD-30's `npm test` and fake Provider use those vectors. Preferences are normally the model's interpretation output. The spine does not say whether `golden-queries.json` holds a human-written expected `preferences` string, or whether the vectors come from a live interpretation at index time. A live interpretation would leak into goldens that must be written before the Enrichment (FR-17). It also does not say that the e2e fixture Queries' Preferences must match a golden entry exactly after `normaliseText`. **Fix:** add an expected `preferences` field to each Golden query, written by hand, and make the fake's interpretations reuse those strings.

### F13. Medium/Low: no-results state naming the Hard criteria (AD-20)

PRD FR-10 and EXPERIENCE No results say the MVP no-results state names the Hard criteria in force ("We looked for Pets allowed and Max R 2 000 per night in Stellenbosch"), and the chips stay. The spine never says where that sentence is built, alongside the existing `heading`, nor that `weakMatch` is false when there are no cards. **Fix:** one line in AD-20.

### F14. Low: `.env` against `.env.local` (AD-29, PRD §7)

PRD §7 and §9 say the presenter's machine has the configuration in "a local `.env`". AD-29 puts it in `.env.local`, and scripts load only `.env.local`. A presenter following the PRD gets a working app, because Next.js loads `.env`, but the `search:*` scripts would see no key. **Fix:** have scripts load `.env` and then `.env.local`, as Next does, or correct the PRD wording.

### F15. Low: "this weekend" on a Sunday is a zero-night Stay (AD-22, PRD FR-4)

FR-4 says that on Saturday or Sunday "this weekend" is "today until Sunday", which is zero nights on a Sunday. AD-22 inherits the rule. **Fix:** define the Sunday case in the domain date rules (for example Sunday to Monday, or treat the value as ignored and raise the `ignored` notice).

### F16. Low: what the interpretation cache holds (AD-22, AD-28)

The interpretation is keyed by Query plus today, but `applyInterpretation` depends on `current`: Stay and Party are kept, and Rooms auto-raise reads the current Party. If the cache stored the applied result, a second Guest with different Search bar values would get the first Guest's Stay and Party. **Fix:** say the cache holds the raw, schema-valid Provider output, and `applyInterpretation` runs on every submit.

### F17. Low: Preferences from the URL are untrusted input to `reasons` and `embed` (AD-27, PRD §9 Untrusted Query)

Any URL can set `prefs` without going through interpretation. AD-22 keeps the Query in `input`, but AD-27 does not say the same for the Preferences in the reasons call. Each new `prefs` value in a crafted URL also costs an embed call and a reasons call. Rate limiting is deferred, but this route around the 3-call budget is not mentioned. **Fix:** one line in AD-27, and a mention under Deferred.

### F18. Low: same URL, same order across process restarts (AD-28, FR-3, FR-13)

Order is stable only while the embedding is cached in process. After a restart or an LRU eviction, a re-embed can return slightly different floats and flip near-ties. If the re-embed fails, the page becomes a fallback with MVP order. Tie-breaks also compare floats by exact equality. **Fix:** round the blend score (for example to 4 decimals) before comparing and tie-breaking, and note the restart caveat.

### F19. Low: the PRD §8 seam wording differs from AD-20 (AD-20)

PRD §8 says the search result "gains the Best-fit room, Relevance and Match reason". AD-20 deliberately keeps Match reasons out of `SearchResult` and exposes Relevance only in the debug `breakdown`. The reasoning (streaming, FR-15) is sound, but the spine should record it as an intended deviation from PRD §8, so a reviewer does not "fix" it back.

### F20. Low: eval report contents not landed (AD-32, FR-17 to FR-19)

The following are missing from AD-32:

- The report records the model deployments, the weights and the fixed today.
- The terminal prints one line per Golden query.
- Held-out queries are reported separately, for SM-C1.
- Every *not grounded* verdict is listed for a person to check.
- The judge sees only the reason and that Hotel's Search knowledge.
- Calibration means flagging **every** planted false reason and passing every true one, and the spine does not say what happens when calibration fails.
- Each Golden query's "Hotel that must not rank first".
- The `.eval-results/` entry for `.gitignore`, which does not exist yet.

### F21. Low: Enrichment checks not landed (AD-24, FR-7)

The FR-7 quiet-coverage rule (at least 4 Hotels never mention quiet) and the 80 to 150 word description length have no named test. The spine names only the Facility and policy contradiction test. Add both to `chunks.test.ts`. The stale-index test should also compare the embedding model and dimensions recorded in `search-index.json` with the configured ones.

### F22. Low: other ambiguities in AD-21 and AD-27

- `sq` is labelled "display only", but its presence is what switches Smart mode on (AD-21). Relabel it.
- A stale URL with `sq` over 300 characters drops `sq`, so `smart` becomes null and the valid `maxPrice` and `policy` chips silently vanish too. EXPERIENCE does not say they should. Decide which is intended.
- AD-27's "fused chunk score" for choosing each Hotel's top 3 chunks is not defined. Say whether it is the Relevance formula applied per chunk, or RRF as in addendum pattern 4.
- FR-16's "never repeat instructions from the Query" has no rule in AD-27. It is prompt-only, so say so.

## Checked and landed (no action)

- **Fallback URL contents:** pre-submit Search bar values, `sq`, `fallback=1`, no Max price, Policy criteria or Preferences. `fallback` is ignored without `sq` (AD-21, AD-22).
- **At most 3 Provider calls per new Query, errors never cached, `maxRetries: 0`** (AD-19, AD-22, AD-28).
- **Reasons:** 120-character rejection with no truncation, citations, no prices, dates, links or contact details, 5 s timeout, never blocks the cards, none for empty Preferences or outside `"smart"` (AD-27).
- **Weak match:** a `weakMatch` flag, false for empty Preferences, absolute threshold (AD-26). The heading copy is UX-owned.
- **Best-fit:** chosen among qualifying Room types, cosine with ties to the lower price, never splits a Party, carried as `bestFit` with the URL's `rooms`, Max price not enforced on the Hotel page (AD-21, AD-23, AD-26).
- **Debug flag:** server environment only, never a URL (AD-29).
- **Off switch:** no box, no Example queries, Smart parameters ignored. A fresh clone runs the MVP and makes no outbound request (AD-29, AD-31).
- **Privacy:** only the Query, the Preferences and Search knowledge are sent. Logs carry the code and status only. `store: false` (AD-19, AD-29, AD-31).
- **Relevance:** absolute fusion. Whole-index scoring makes it independent of the candidate set (AD-26).
- **Ranking:** fixed scales and the tie-break order (AD-26).
- **Ranking blend:** one constant; the other two candidates live only in the eval (AD-26).
- **Testing and the index:** e2e runs the fake on its own server; `db:reset` loads the Prepared index without the Provider; the reset skips shadow tables (AD-24, AD-30).
- **Ask-first items:** the schema change, `openai` and `sqlite-vec` all stay pending, each with a fallback design (AD-24, AD-25).
