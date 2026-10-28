# Reconcile: Smart Search PRD against its inputs

Date: 2026-10-15. Inputs checked: the user's own words this session (A1-A11), the MVP PRD (`_bmad-output/initiative-checkinn-mvp/prd-checkinn/prd-checkinn.md`), `AGENTS.md`, and the seed file `data/seed/hotel-booking-demo.json` (checked to confirm the journeys' facts).

Severity: **High** = wrong against the seed or a user decision, or changes MVP behaviour without saying so. **Med** = ambiguous enough to split implementers. **Low** = wording or bookkeeping.

---

## (a) User decisions dropped, distorted or contradicted

### A-1. UJ-2 claims a fact the seed does not support (High)
- **Source:** A8 ("most relevant rooms / hotels"), the grounding intent (FR-16), seed.
- **PRD location:** §2.3 UJ-2.
- **What's wrong:** "He switches to Best value and a cheaper Hotel that still has a gym moves up." Johannesburg has two Hotels. Only Goldleaf Business Hotel (R1 650, 4.6) has `gym` and `meeting_rooms`. Urban Nest Suites (R1 350, 4.5) has neither. The journey describes the very kind of ungrounded claim the PRD forbids, and a Golden query built from it would encode a wrong expectation.
- **Fix:** Rewrite UJ-2 so it is true against the seed. One option: drop Destination ("business hotel with a gym and meeting rooms"), so Goldleaf (Johannesburg) and Jacaranda Garden Hotel (Pretoria, R1 200, 4.4, gym and meeting rooms) both qualify. Best value then lifts Jacaranda. Another option is to keep Joburg and have Best value surface Urban Nest with a reason that says only "cheaper, central" and no gym. Either way, check every journey and FR example against the seed.

### A-2. City aliases "Joburg" and "PE" are not MVP FR-3 behaviour (High)
- **Source:** MVP FR-3, MVP Glossary (Destination), seed `cities[].aliases`.
- **PRD location:** FR-4 last bullet, FR-17 ("Joburg"), UJ-2.
- **What's wrong:** FR-4 says aliases resolve "as in MVP FR-3 ('Joburg' means Johannesburg, 'PE' means Gqeberha)". In the seed, Johannesburg has no aliases and Gqeberha's only alias is "Port Elizabeth". In the MVP today, "Joburg" and "PE" match nothing. The PRD presents new nickname resolution by the Provider as existing behaviour.
- **Fix:** Say plainly that nickname resolution is new and done by Query interpretation, and that it maps only onto the 6 seed City names. Keep it apart from MVP FR-3. Make sure the Search bar shows the resolved City name ("Johannesburg"), not "Joburg", or the MVP matcher returns no results when the Guest edits and re-runs the search.

### A-3. "Re-rank the search bar search" vs Destination as a City (High)
- **Source:** A6 ("the current search bar is basically a filter"), A11 ("a query should re-rank the searchbar search"), MVP FR-3, MVP Glossary.
- **PRD location:** FR-4, FR-6 bullet 1, §3 Hard criteria, addendum pattern 2 ("Destination... in SQL").
- **What's wrong:** In the MVP, Destination is free text, matched as a partial match against City, alias, province, area and Hotel name ("cape" returns 6 Hotels, "Waterfront" returns 1). The PRD treats Destination as a City ("Destination Stellenbosch", "No Hotel outside the Destination appears", "not one of the 6 Cities"). The user's model is that the Query re-ranks whatever the Search bar returns. If a Guest types "Waterfront" or "Western Cape" in the Search bar and a Query in the box, it is not defined which candidate set gets re-ranked.
- **Fix:** Add a consequence that the Smart search candidate set is exactly the MVP FR-3 and FR-5 result for the Search bar's Destination, minus the new Party and Max price filters, re-ranked by Smart ranking. Query interpretation may write a City name, a province, an area or a Hotel name into Destination, and the MVP matcher applies to it unchanged. Use "Destination" in its MVP sense (the text) throughout.

### A-4. Party filter can empty the results for ordinary Queries (High)
- **Source:** A10 (filter by Party capacity), A4 (Google-like: expect relevant results), seed (every Room type sleeps at most 4).
- **PRD location:** FR-4, FR-6 bullet 4.
- **What's wrong:** The Rooms default is 1. "Family of 5 in Durban" would read as 5 Guests in 1 Room, and no Room type sleeps 5, so every Hotel is filtered out. The Guest who typed a normal sentence gets MVP no-results. FR-4 does not say whether Rooms is extracted or inferred. The addendum schema has `rooms`, but the PRD does not.
- **Fix:** Add Rooms to the extracted Hard criteria. When the Query gives no room count, raise Rooms to the fewest that can sleep the Party, while keeping MVP FR-1's rule of no more Rooms than adults. Add a Golden query for it. Also say whether a Party can be slept by mixing Room types (MVP UJ-2 books a Family Room plus a Standard Double), because the Best-fit room in FR-14 is a single Room type.

### A-5. "Most relevant rooms / hotels" is measured for Hotels only (Med)
- **Source:** A8 (the user's own success test), A10 (best-fit room card, room pre-selected).
- **PRD location:** §8 SM-1 to SM-5, FR-17.
- **What's wrong:** The user's success test names rooms as well as Hotels. Golden queries record expected Hotels only, and no metric checks the Best-fit room or the pre-selected quantity. Nor does §8 quote the user's own criterion.
- **Fix:** Have FR-17 record the expected Best-fit room (and Rooms) per Golden query, and add a metric such as "SM-6: Best-fit room correct for at least 90% of Golden queries". Quote A8 as the primary success statement in §8.

### A-6. Search bar values carried over from an earlier search (Med)
- **Source:** A4 ("type ... the same way they would in Google and expect to see the most relevant results").
- **PRD location:** FR-4 bullet 4, FR-5 last bullet.
- **What's wrong:** A Hard criterion the Query doesn't mention keeps its current Search bar value. If the Guest's last search was Cape Town and they now type "beach hotel with a pool", Destination silently stays Cape Town and Durban is never considered. That is not Google-like, and it conflicts with FR-5's "re-extracts Hard criteria".
- **Fix:** Decide and state the rule. Suggestion: a new Query resets Destination and Max price to empty when it doesn't mention them, and keeps Stay and Party. Add a UJ edge case or a Golden query for it.

### A-7. Google-like Query behaviour is not specified beyond Enter-to-submit (Low)
- **Source:** A4.
- **PRD location:** FR-1, FR-4.
- **What's wrong:** Google-like behaviour suggests that a Query of just a place ("Durban") or just a Hotel name works like a normal search, and that typos are tolerated. These are only implied by the Golden query categories, not stated as guest-facing consequences.
- **Fix:** Add consequences to FR-4 or FR-9. "Durban" alone gives the same Hotels as the MVP search for Durban, in Best match order. A Query that names a Hotel puts that Hotel first.

### A-8. Branch rule not recorded (Low)
- **Source:** A2 ("keep it in this branch... not merge without my explicit permission. This should stay separate from main.").
- **PRD location:** frontmatter, §0.
- **What's wrong:** Nothing in the PRD, addendum or initiative records this. AGENTS.md's default flow is a PR to `main`, so a later agent or a ticket build could open and merge one.
- **Fix:** Add a line to §0 (or to the initiative file): "User decision: all smart-search work stays on `docs/rag-search-planning` (or its child branches) and is not merged to `main` without the user's explicit permission."

### A-9. Addendum has stale model notes (Low)
- **Source:** A11 ("gpt-6-luna is correct; text-embedding-3 works, pick the best one").
- **PRD location:** addendum "Provider decision" (bullets 1 and 2).
- **What's wrong:** It still says the deployment name "needs confirming" and that the embedding model is "Still to be picked". The user confirmed `gpt-6-luna`, and the next section picks `text-embedding-3-large`.
- **Fix:** Mark both as resolved: gpt-6-luna confirmed by the user, embeddings `text-embedding-3-large` at 1024 dimensions as recommended (architecture to confirm the region). Name both models in the PRD's Provider glossary entry, not only "details in addendum".

### A-10. Ranking modes match the user's choice (no gap)
FR-11 and FR-12 match A5's "3 blended signals" (Best match, Best value, Top rated). Optional: state in FR-11 that this was the user's choice, so later reviewers do not "simplify" it into plain sorts.

---

## (b) Conflicts with the MVP PRD that the new PRD doesn't acknowledge

### B-1. Ranking modes and Max price override MVP non-goals and FR-7 (High)
- **MVP:** §6 "No filters, sort controls..."; FR-7 "There is no sort control"; FR-5 "The Party's size does not hide a Hotel".
- **PRD location:** FR-11, FR-6, §3 Max price.
- **What's wrong:** FR-6 acknowledges the change to MVP FR-5. Ranking modes (a sort control) and Max price (a filter) override MVP §6 and FR-7 without saying so.
- **Fix:** Add a short section, "§7.3 Changes to MVP behaviour", that lists each MVP FR changed and how: FR-5 (Party filter), FR-6 (price line), FR-7 (order and sort control), FR-18 (pre-selection), FR-25 (shown content), §5 (offline, 1 s), §6 (filters, sort, NL search). Say that each change applies only while a Query is present.

### B-2. Which behaviour applies when the box is shown but empty (High)
- **MVP:** FR-5, FR-7.
- **PRD location:** FR-5 bullet 4, FR-6, FR-11.
- **What's wrong:** "Clearing the Smart search box returns the MVP order" covers order only. With a Provider configured and no Query, it isn't said whether the Party filter, the Ranking mode control and the Best-fit room apply. FR-6 says "Smart search results", but that term is not defined.
- **Fix:** Define "Smart search results" as results while a Query is present. With no Query, every MVP rule applies unchanged (no Party filter, no mode control, MVP card). State it in FR-5 and in §7.3.

### B-3. Listing card price line changes MVP FR-6 silently (Med)
- **MVP:** FR-6 ("lowest Nightly price among available Room types... 'from R 4 900'"), SM-4 (totals agree everywhere).
- **PRD location:** FR-14 bullet 3.
- **What's wrong:** In Smart search the card prices the Best-fit room, which may not be the cheapest Room type. The "from" wording becomes misleading, and the MVP FR-6 change is not named (only FR-20 is cited).
- **Fix:** Name MVP FR-6 as changed. Specify the price line wording for the Best-fit room (for example "Family Room · 2 nights, 4 guests: R 4 000", without "from"). Check that SM-4 consistency holds with the pre-selected room table.

### B-4. Pre-selection changes MVP FR-18 and the URL rules in MVP FR-4 (Med)
- **MVP:** FR-18 (quantities start at 0, Reserve disabled while nothing is selected), FR-4 (criteria in the URL, shareable).
- **PRD location:** FR-14 bullet 4, FR-3.
- **What's wrong:** It isn't said whether the pre-selection lives in the URL (shareable and survives reload, per MVP FR-4), what happens on a shared link, or whether the Query and Ranking mode carry onto the Hotel page and back to Search results. MVP FR-21 "Back" keeps the selection, but the round trip to results is undefined.
- **Fix:** Add consequences. The pre-selection is a URL parameter. The Hotel page carries the Query and Ranking mode so that going back returns the same Smart search results. Opening the Hotel page without a Query keeps MVP FR-18 unchanged.

### B-5. Enrichment content vs MVP FR-25 and the §6 "no guest review quotes" non-goal (Med)
- **MVP:** FR-25 ("Every Hotel, ... Facility and policy shown in the app matches the seed file"; footer states fictional content); §6 left out "Guest review quotes" and "Property highlights with detail text"; "Data changes go through the seed file".
- **PRD location:** FR-7, FR-15, §3 Enrichment.
- **What's wrong:** Match reasons will show Enrichment-only content (review themes, nearby highlights), which MVP FR-25 forbids and the MVP non-goals deliberately left out. The PRD doesn't say whether Enrichment is ever shown directly (on the Hotel page, say). Nor does it say whether Enrichment reviews must agree with the Hotel's Review score.
- **Fix:** State that Enrichment is a second, user-approved data source that amends MVP FR-25 for Match reasons only, and that it is not shown on the Hotel page in v1. Extend the footer note to cover Enrichment and AI-written Match reasons. Add to FR-7 that the tone of a Hotel's reviews fits its Review score.

### B-6. Speed target relaxes MVP 1 s without saying so (Med)
- **MVP:** §5 "Search results and the Hotel page render within 1 second".
- **PRD location:** §5 Speed (3 s plus 3 s), FR-2 bullet 2 (Provider checked per page render).
- **What's wrong:** Raising the target to 3 s is an unacknowledged change. Checking the Provider on every render would also add a network round-trip to every Home and Search results render, including the MVP path, which breaks the 1 s target even without a Query.
- **Fix:** Say that 3 s applies only to Smart search results with a Query, and that the 1 s target still holds otherwise. Make the availability check cheap and cached (configured key plus last-known health), not a live call per render.

### B-7. Guest-facing Smart search flows have no testable path (Med)
- **MVP / AGENTS.md:** "an end-to-end test for a flow a guest can see"; e2e runs offline against a temp database.
- **PRD location:** FR-18 bullet 4, FR-2.
- **What's wrong:** Without a key the box is hidden, so Playwright cannot cover the box, the pre-filled Search bar, the chip, mode switching, Match reasons or pre-selection. Only the deterministic domain parts are tested.
- **Fix:** Add an NFR for a deterministic test Provider (fixtures for interpretation, Query embeddings and Match reasons), enabled only in tests, so that Vitest component tests and e2e can exercise the guest flows offline. Its interaction with "no Provider means hidden" needs stating.

### B-8. Glossary misuse and drift (Low)
- **MVP:** Glossary.
- **PRD location:** §0, §3.
- **What's wrong:**
  - §0 lists "Search bar" as an MVP term, but the MVP Glossary does not define it (only §4.1 describes it). The PRD then re-defines it in §3, which contradicts "New terms only".
  - "Destination" is used to mean a City (see A-3).
  - FR-4 "a Party of 4 Guests" doesn't say adults, children or Rooms, while UJ-1 says 4 adults.
  - "guest reviews" in Enrichment risks confusion with Review score and the MVP's "No writing reviews".
- **Fix:** Note that "Search bar" is newly defined here. Use Destination as MVP text throughout. Write "4 adults, 0 children, 1 Room". Call the Enrichment item "Enrichment reviews (fictional)".

### B-9. Validation limits cover the Stay only (Low)
- **MVP:** FR-1 (at most 30 Nights; 1-10 adults; 0-6 children; 1-5 Rooms; Rooms no more than adults; check-in not in the past).
- **PRD location:** FR-4 bullet 5.
- **What's wrong:** Only "Stay longer than the MVP maximum" and "0 Guests" are listed.
- **Fix:** Refer to all MVP FR-1 rules: an extracted value that breaks any of them is not applied.

### B-10. Relative date wording is ambiguous (Low)
- **PRD location:** UJ-1 ("next weekend" gives Friday to Sunday), FR-4 bullet 1 ("the coming weekend"), FR-4 bullet 3 ("this weekend").
- **What's wrong:** "This weekend" and "next weekend" are both mapped to "the coming weekend". It isn't defined what happens on a Saturday, or what a weekend Stay is (Friday-Sunday is 2 Nights).
- **Fix:** Define both phrases, including the edge case when today is Friday to Sunday, and add them to the Golden queries.

### B-11. Home page and City tiles (Low)
- **MVP:** FR-27 (Home tiles run a City search with the current Stay and Party).
- **PRD location:** FR-1.
- **What's wrong:** It isn't said whether a tile click carries a typed but unsubmitted Query, or what submitting the box on Home does (navigate to Search results with `q` and the Query).
- **Fix:** One consequence each in FR-1.

### B-12. Accessibility of automatic changes (Low)
- **MVP:** §5 WCAG 2.1 AA ("states are not shown by colour alone").
- **PRD location:** §5 Accessibility, FR-4, FR-5.
- **What's wrong:** Only late Match reasons are covered. The Search bar filling itself in, the unknown-place note and the weak-match heading also change without the Guest acting, and the Max price chip needs an accessible remove name.
- **Fix:** Add a polite live-region announcement of the interpreted criteria ("Showing Stellenbosch, 2 nights, 4 adults, max R2,000") and an accessible name on the chip's remove control ("Remove max price R2,000").

---

## (c) AGENTS.md "ask first" items the PRD should flag

The PRD only implies these, or leaves them to the addendum. Suggested fix: add a "§5.1 Ask-first changes" list to the PRD that marks each item **approved by the user** (with date and quote) or **still to ask**.

| Item | AGENTS.md rule | Status from the user's words | Where it is now |
|---|---|---|---|
| Azure AI Foundry, gpt-6-luna and text-embedding-3 | Calling a paid or external service, including AI providers | Approved (A9, A11) | Addendum only |
| Enrichment file in or next to `data/seed/` | Changing seed data | Approved in principle (A9: "add a separate enrichment file"). The content is not approved yet | FR-7, not flagged |
| Database schema: chunk, vector and FTS5 tables, Enrichment tables | Changing the database schema | **Still to ask** | Not mentioned in the PRD. Implied by addendum patterns 4 and 8 |
| Committed prepared Search knowledge (vectors) and `db:reset` loading it | Seed and schema | **Still to ask** | FR-9 |
| `openai` SDK | Adding a dependency | **Still to ask** | Addendum pattern 9 only |
| `sqlite-vec` (stack lists it as "agreed, not installed") | Adding a dependency | **Still to ask**, if architecture picks it | Addendum |
| Evals or retrieval tests in CI | Anything in `.github/workflows/` | **Still to ask**. FR-18 assumes no CI | FR-18 assumption |
| `next.config.ts` changes (streaming or Suspense under `cacheComponents`, environment exposure) | Changing `next.config.ts` | Unknown. Flag for architecture | Not mentioned |

Related housekeeping, not ask-first:
- AGENTS.md's "Current state" and stack tables will need updating (Provider, embedding model, vector search choice) once the decisions are final. Do that through `bmad-project-context`, not by hand-editing generated paths.
- `.env.example` is fine to commit. `.env` must never be committed (AGENTS.md "Never"). The PRD covers this.
- The real event name "AI Expo Africa 2026" in the addendum is not client material, but check it against the "no internal material" rule since the repo is public.
