---
title: CheckInn Smart Search PRD
status: draft
created: 2026-10-15
updated: 2026-10-15
---

# PRD: CheckInn Smart Search
*Working title. Confirm it.*

## 0. Document Purpose

This PRD defines the base functional requirements for Smart search. Smart search lets a Guest describe the stay they want in plain language and get the most relevant Hotels first. Readers are the workshop presenter and the people who will turn it into UX, architecture and tickets during the workshop.

It builds on the MVP PRD (`_bmad-output/initiative-checkinn-mvp/prd-checkinn/prd-checkinn.md`). It reuses that PRD's Glossary, and every MVP term (Guest, Hotel, Room type, Stay, Party, Search bar, Search results, Listing card, Facility, Review score, Nightly price) keeps its MVP meaning. FR IDs in this document are local to it. MVP requirements are referenced as "MVP FR-n".

This is a workshop exercise, not a real product. Several answers are best guesses and are tagged `[ASSUMPTION]` inline and collected in §10, so they can be confirmed before the build. Research, the repo starting point and the technical notes are in `addendum.md`.

## 1. Vision

Today a Guest finds a Hotel by typing a Destination, picking dates and a Party, and reading a list ordered by Review score. That works when you know where you want to go. It does not help a Guest who knows *what kind* of stay they want: "somewhere quiet with a pool where the kids can play and the dog is welcome".

Smart search adds a single free-text box above the existing Search bar. The Guest types the way they would type into Google. CheckInn works out the hard facts in the sentence (where, when, how many, how much) and puts them into the Search bar where the Guest can see and change them. It then ranks the Hotels that fit by how well each one matches everything else the Guest said. Every Listing card tells the Guest in one line why that Hotel matched, using only what CheckInn knows about it.

The bet is that a Guest who can say what they want, see that they were understood, and see why each result is there will reach a booking faster and trust the result more than one who filters by hand.

## 2. Target User

### 2.1 Jobs To Be Done

- **Functional:** "Find me a place that fits *this* trip" without translating the trip into filters.
- **Functional:** see the best fit first, and decide whether value or reviews matter more for this trip.
- **Emotional:** feel understood. The Guest's words show up as the criteria they meant.
- **Emotional:** trust the result. Nothing on the card is invented.
- **Contextual (workshop):** let an audience watch a RAG pipeline work end to end on a small, readable app.

### 2.2 Non-Users (v1)

- Guests who want a conversation or a trip planner. Smart search is one query and one ranked list, not a chat.
- Hotel staff or admins. There is no tooling for editing the Search knowledge.

### 2.3 Key User Journeys

- **UJ-1. Thandi finds a home for the family and the dog.**
  Thandi, a mother of two planning a long weekend with the family dog, opens CheckInn on her phone. Above the usual Search bar she types *"pet friendly family place in Stellenbosch for 4 next weekend under R2000 a night"* and submits. The Search bar fills itself in with Stellenbosch, Friday to Sunday, 2 adults and 2 children, and a "Max R2,000 / night" chip appears under it. The results are in **Best match** order. The top Listing card is Winelands Family Lodge, with the Family Room shown and the line *"Pets allowed, children's play area, family rooms that sleep 4"*. She opens it and reserves. **Edge case:** Thandi meant 2 adults and 2 children, but "for 4" was read as 4 adults. She changes it in the Search bar and the results update without retyping her query.

- **UJ-2. Sipho trades reviews for value.**
  Sipho, a consultant booking his own work trips, types *"quiet business hotel in Joburg with a gym and meeting rooms"* with dates already in the Search bar. **Best match** puts the strongest fit first. He switches to **Best value** and a cheaper Hotel that still has a gym moves up. He switches to **Top rated** to compare, then books the Best value pick. **Edge case:** neither Johannesburg Hotel is described as quiet. The Match reasons mention the gym and meeting rooms and do not claim "quiet".

- **UJ-3. Lerato asks for something CheckInn doesn't have.**
  Lerato types *"ski chalet with a fireplace"*. No Hotel is a ski chalet. Smart search says it found no strong matches and shows the closest Hotels, each with an honest Match reason. It does not stretch the words to fit. She edits her query to *"cosy mountain getaway"* and gets useful results.

## 3. Glossary

New terms only. MVP terms keep their MVP meaning.

- **Smart search**: the feature as a whole. The Smart search box plus Query interpretation, Retrieval, Smart ranking and Match reasons.
- **Smart search box**: the single free-text field above the Search bar where the Guest types a Query.
- **Query**: the free text the Guest submits in the Smart search box.
- **Search bar**: the MVP Search bar (Destination, Stay, Party), unchanged. In Smart search it acts as the filter.
- **Hard criteria**: the parts of a Query that are rules, not preferences: Destination, Stay, Party and Max price. Hard criteria are never broken in Search results.
- **Max price**: an upper limit on Nightly price, in ZAR. A new Hard criterion, shown as a Max price chip.
- **Max price chip**: a small removable chip under the Search bar showing the Max price (e.g. "Max R2,000 / night"). Removing it clears Max price.
- **Preferences**: everything in a Query that is not a Hard criterion, e.g. "quiet", "pool", "near the beach", "romantic". Preferences rank Hotels and do not exclude them.
- **Query interpretation**: turning a Query into Hard criteria (pre-filled into the Search bar) and Preferences.
- **Search knowledge**: everything Smart search may know about a Hotel: its seed data plus its Enrichment.
- **Enrichment**: extra fictional text per Hotel (a longer description, guest reviews, nearby highlights) held in a new committed file next to the seed file. The seed file stays unchanged.
- **Retrieval**: finding the Hotels whose Search knowledge best matches the Preferences, among the Hotels that meet the Hard criteria.
- **Relevance**: how well a Hotel's Search knowledge matches the Preferences, on a 0-to-1 scale. One of the three ranking signals.
- **Ranking mode**: one of three named blends of Relevance, Review score and Nightly price: **Best match** (default), **Best value** and **Top rated**.
- **Best-fit room**: the Room type on a Listing card that best fits the Query and sleeps the Party.
- **Match reason**: one short sentence on a Listing card saying why that Hotel matched. It is written by the Provider only from that Hotel's Search knowledge.
- **Provider**: the hosted AI service Smart search calls for Query interpretation, Relevance and Match reasons. Requires network access and an API key.

## 4. Features

### 4.1 Smart search box

**Description:** A single free-text box sits above the existing Search bar on the Home page and the Search results page. The Guest types a Query and submits. The Search bar below keeps working exactly as in the MVP. When no Provider is configured or reachable, the Smart search box is not shown at all and CheckInn behaves like the MVP. Realizes UJ-1, UJ-2, UJ-3.

#### FR-1: Smart search box placement

A Guest sees the Smart search box above the Search bar on the Home page and the Search results page. Realizes UJ-1.

**Consequences (testable):**
- The box has a visible label and placeholder text with an example Query, e.g. "Try: quiet hotel with a pool in Cape Town this weekend".
- Submitting by pressing Enter or the search button runs Smart search.
- An empty or whitespace-only Query cannot be submitted.
- The box works on mobile and desktop viewports and meets WCAG 2.1 AA, as in the MVP.

#### FR-2: Hidden without a Provider

A Guest never sees the Smart search box when Smart search cannot run.

**Consequences (testable):**
- With no Provider API key configured, the Smart search box is not rendered and no error is shown.
- If the Provider is configured but unreachable when the page renders, the box is not rendered. `[ASSUMPTION: availability is checked per page render, not once at start-up]`
- If the Provider fails after a Query has been submitted, the Guest gets Search results from the Search bar's criteria in the MVP order, with a short notice that smart ranking is unavailable. `[ASSUMPTION: this mid-search case falls back rather than hiding the results]`
- A fresh clone with no API key runs with `npm install && npm run dev` and behaves exactly like the MVP.

#### FR-3: Query is kept

A Guest can share, reload or go back to a Smart search and get the same Search results.

**Consequences (testable):**
- The Query and the Ranking mode are kept in the URL alongside the MVP search criteria (MVP FR-4).
- Reloading the page shows the same Query in the box and the same Search results, as long as Availability has not changed. `[ASSUMPTION: Match reasons may be re-generated on reload and differ in wording]`

### 4.2 Query interpretation

**Description:** When a Query is submitted, Smart search pulls out the Hard criteria and writes them into the Search bar, where the Guest can see what was understood and change it. Whatever is not a Hard criterion becomes Preferences. Hard criteria the Query doesn't mention keep the Search bar's current values. Realizes UJ-1.

#### FR-4: Extract Hard criteria into the Search bar

The system extracts Destination, Stay, Party and Max price from a Query. It pre-fills the Search bar with the first three and shows Max price as a Max price chip. Realizes UJ-1.

**Consequences (testable):**
- *"Stellenbosch for 4 next weekend under R2000"* sets Destination Stellenbosch, a Friday-to-Sunday Stay for the coming weekend, and a Party of 4 Guests, and shows a "Max R2,000 / night" chip.
- A place that is not one of the 6 Cities (e.g. "Kruger") leaves Destination empty and shows a short note, e.g. "We don't have hotels in Kruger, so we're showing all cities". The place's words still count as Preferences.
- Relative dates ("this weekend", "next Friday", "for 3 nights from the 12th") resolve against today's date in the app's time zone.
- A Hard criterion the Query does not mention keeps its current Search bar value, or its MVP default when there is none.
- Values that can't be valid (a past date, a Stay longer than the MVP maximum, 0 Guests) are not applied. The Search bar keeps its previous value for that field.
- City aliases resolve as in MVP FR-3 ("Joburg" means Johannesburg, "PE" means Gqeberha). `[ASSUMPTION: the Provider normalises nicknames to a seed City]`

**Out of Scope:**
- Hard criteria other than Destination, Stay, Party and Max price. "Must have a pool" is a Preference in v1. `[ASSUMPTION]`

#### FR-5: Guest corrects the interpretation

A Guest can change any pre-filled Hard criterion in the Search bar, or remove the Max price chip. The Search results update and keep the Query's Preferences. Realizes UJ-1 edge case.

**Consequences (testable):**
- Changing the Party from 4 adults to 2 adults and 2 children re-runs the search with the same Query, without retyping it.
- Removing the Max price chip re-runs the search with no Max price.
- Submitting a new Query replaces the previous Preferences and re-extracts Hard criteria.

#### FR-6: Hard criteria are never broken

Every Hotel in Smart search results meets every Hard criterion.

**Consequences (testable):**
- No Hotel outside the Destination appears.
- A Hotel appears only if a Room type is available for every Night of the Stay (MVP FR-5).
- A Hotel appears only if it has a Room type whose Nightly price is at or below Max price, when Max price is set.
- A Hotel appears only if it can sleep the Party with the Rooms requested, using Room type capacity. Unlike MVP FR-5, Smart search filters by Party.
- These checks are made by CheckInn against the catalog, never left to the Provider.

### 4.3 Search knowledge and Retrieval

**Description:** Smart search ranks Hotels by what CheckInn knows about them: the seed data plus a new Enrichment file of fictional long descriptions, guest reviews and nearby highlights. Retrieval scores the Hotels that meet the Hard criteria by how well their Search knowledge matches the Preferences. Realizes UJ-1, UJ-2.

#### FR-7: Enrichment file

Each Hotel in the seed data has Enrichment in a new committed file next to the seed file.

**Consequences (testable):**
- All 12 seed Hotels have a longer description (about 80–150 words), 3 to 5 fictional guest reviews, and 2 to 4 nearby highlights. `[ASSUMPTION: sizes]`
- Enrichment never contradicts the seed data. A Hotel without a pool is never described as having one, and pet policy matches `petsAllowed`.
- Enrichment uses only fictional names and places. No real people, businesses or reviews. The repo is public.
- The seed file `data/seed/hotel-booking-demo.json` is unchanged.

#### FR-8: Search knowledge covers structured facts

Relevance considers each Hotel's structured facts as well as its text, so a Preference like "pool" or "pet friendly" matches the Facilities and policies in the seed data.

**Consequences (testable):**
- "Pet friendly" ranks the one Hotel that allows pets above the ones that don't.
- "Pool" ranks Hotels with Swimming pool above ones without, when all else is equal.
- Search knowledge includes Category, Facilities, Room types and their capacity, house rules, the City description, and the Enrichment.

#### FR-9: Relevance from Retrieval

The system gives every Hotel that meets the Hard criteria a Relevance score between 0 and 1 against the Query's Preferences.

**Consequences (testable):**
- A Query with no Preferences, only Hard criteria, gives every Hotel equal Relevance, so ranking falls back to Review score and Nightly price.
- Search knowledge is prepared so that a Query does not re-process all Hotels each time. `[ASSUMPTION: Hotel embeddings are built ahead of time and rebuilt by `npm run db:reset`; mechanism in addendum]`

#### FR-10: Weak or no matches

When no Hotel matches the Preferences well, the Guest is told so and still sees the closest Hotels. Realizes UJ-3.

**Consequences (testable):**
- If the best Relevance is below a set threshold, the Search results heading says no strong matches were found and suggests rephrasing. `[ASSUMPTION: threshold set by tuning against the golden queries in SM-1]`
- Hotels that meet the Hard criteria are still listed, in the current Ranking mode.
- If no Hotel meets the Hard criteria, the MVP no-results behaviour applies (MVP FR-8).

### 4.4 Smart ranking

**Description:** Search results are ordered by a blend of three signals: Relevance, Review score and Nightly price. The Guest picks one of three Ranking modes. Each mode uses all three signals with different weights. Switching modes re-orders the same results without re-running the Query. Realizes UJ-2.

#### FR-11: Three Ranking modes

A Guest can order Smart search results by Best match, Best value or Top rated. Realizes UJ-2.

**Consequences (testable):**
- **Best match** is the default and weights Relevance most.
- **Best value** weights a lower Nightly price most.
- **Top rated** weights Review score most.
- Every mode includes all three signals. No mode is a plain sort on one field. `[ASSUMPTION: starting weights 0.6/0.2/0.2 with the lead signal rotating; tuned in the workshop]`
- The selected mode is visibly marked and reachable by keyboard.

#### FR-12: Switching Ranking mode

A Guest can switch Ranking mode and see the same Hotels re-ordered.

**Consequences (testable):**
- Switching mode makes no new Provider call and does not change which Hotels appear.
- Switching mode keeps the Query, the Search bar and the Match reasons as they are.

#### FR-13: Stable order

The same Query, Search bar criteria and Ranking mode give the same order.

**Consequences (testable):**
- Ties break by Review score, then lower Nightly price, then Hotel name.
- Re-running an identical search returns an identical order. `[ASSUMPTION: Relevance for a given Query is deterministic or cached]`

### 4.5 Smart search results

**Description:** Smart search results reuse the MVP Listing card with two additions: the Best-fit room and a Match reason. The Match reason is the "generation" step of RAG. The Provider writes one sentence per Hotel using only that Hotel's Search knowledge. Realizes UJ-1, UJ-2, UJ-3.

#### FR-14: Best-fit room on the Listing card

Each Listing card shows the Room type that best fits the Query and sleeps the Party. Realizes UJ-1.

**Consequences (testable):**
- The Best-fit room is available for the Stay, sleeps the Party, and is within Max price when Max price is set.
- When several Room types qualify, the one that best matches the Preferences is shown. Ties go to the lower Nightly price.
- The card's prices are for the Best-fit room, using the MVP price rules (MVP FR-20).
- Opening the Hotel page from the card keeps the search criteria, and the Best-fit room is already selected in the room table, with enough Rooms for the Party. The Guest can change the selection before reserving. `[ASSUMPTION: Room quantity is the fewest Rooms of that Room type that sleep the Party]`

#### FR-15: Match reason

Each Listing card shows a Match reason of one short sentence saying why the Hotel fits the Query. Realizes UJ-1, UJ-2.

**Consequences (testable):**
- The Match reason is at most about 120 characters. `[ASSUMPTION]`
- It mentions only features present in that Hotel's Search knowledge.
- A Hotel's card can render without its Match reason, and it appears when ready. A slow Match reason does not hold up the Search results. `[ASSUMPTION: results appear first and reasons stream in]`
- If the Provider can't produce a Match reason, the card shows without one. There is no error on the card.

#### FR-16: Match reasons stay grounded

A Match reason never claims something CheckInn does not know about the Hotel. Realizes UJ-2 edge case, UJ-3.

**Consequences (testable):**
- For *"quiet hotel with a gym"*, a Hotel whose Search knowledge never mentions quiet does not get a Match reason that says it is quiet.
- Match reasons never state prices, dates or availability. Those come from the catalog on the card itself.
- Match reasons for a weak match (FR-10) say what does fit rather than stretching the Query.

## 5. Cross-Cutting NFRs

- **Runs from a fresh clone.** No API key means no Smart search box. The app still works fully as the MVP (FR-2).
- **Secrets.** The Provider API key comes from a local environment variable that is never committed, as AGENTS.md requires. `.env` files stay gitignored.
- **Network.** Smart search needs network access and the Provider. This overrides the MVP's works-offline rule *for Smart search only*. The rest of CheckInn still works offline.
- **Speed.** Search results for a Query appear within 3 seconds on a laptop with a normal connection. Match reasons may follow within a further 3 seconds. Switching Ranking mode is instant (no network). `[ASSUMPTION: targets]`
- **Cost.** One Query makes a bounded number of Provider calls (one for interpretation, one for Query relevance, one batched call for Match reasons). Hotel Search knowledge is prepared ahead of time, not on every Query. `[ASSUMPTION]`
- **Privacy.** Only the Query text and Hotel Search knowledge are sent to the Provider, never Booking or Guest details.
- **Swappable.** Smart search enters through the existing search seam (architecture AD-7), so the MVP search remains the fallback and can be compared side by side in the workshop.
- **Accessibility.** WCAG 2.1 AA as in the MVP. Match reasons arriving after the results are announced politely, not as interruptions.

## 6. Non-Goals (Explicit)

- No chat or multi-turn conversation, and no follow-up questions from CheckInn.
- No booking from the Smart search box. Booking stays the MVP flow.
- No local or bundled AI model. The user ruled this out.
- No personalisation, search history or learning from clicks.
- No Facility filters, map, autocomplete or voice input.
- No real review data. Enrichment is fictional.
- No admin tool for editing Search knowledge.

## 7. MVP Scope

### 7.1 In Scope

- The Smart search box, hidden without a Provider (FR-1 to FR-3).
- Query interpretation into a visible, editable Search bar plus a removable Max price chip (FR-4 to FR-6).
- The Enrichment file and Retrieval over Search knowledge (FR-7 to FR-10).
- Three Ranking modes with instant switching (FR-11 to FR-13).
- Listing cards with the Best-fit room, pre-selected on the Hotel page, and a grounded Match reason (FR-14 to FR-16).

### 7.2 Out of Scope for v1

- Hard criteria beyond Destination, Stay, Party and Max price (e.g. "must have a pool" as a rule). Deferred.
- Smart search inside the Hotel page's room table. Deferred.
- A summary answer above the Search results. The user chose per-card Match reasons only.
- An offline fallback for Smart search. The user chose to hide the box instead.

## 8. Success Metrics

This is a workshop build, so success is judged against a fixed set of test Queries rather than live traffic.

**Primary**
- **SM-1: Golden-query hit rate.** A committed set of about 10 golden Queries, each with the Hotel a person would pick. Target: that Hotel ranks first in Best match for at least 8 of 10, and in the top 3 for all 10. Validates FR-8, FR-9, FR-11. `[ASSUMPTION: set and targets]`
- **SM-2: Zero Hard-criteria breaches.** Across the golden Queries and all three Ranking modes, no Hotel shown breaks a Hard criterion. Validates FR-6.

**Secondary**
- **SM-3: Grounded Match reasons.** Across the golden Queries, zero Match reasons claim a feature missing from the Hotel's Search knowledge (checked by hand or by a test). Validates FR-15, FR-16.
- **SM-4: Interpretation accuracy.** For the golden Queries, the pre-filled Search bar matches the expected Hard criteria for at least 9 of 10. Validates FR-4.
- **SM-5: Ranking modes differ.** For at least half of the golden Queries, Best value or Top rated produces a different top Hotel than Best match. Validates FR-11.

**Counter-metrics (do not optimize)**
- **SM-C1: Over-fitting to golden Queries.** Do not tune weights or Enrichment until the golden set passes. A fresh Query typed live in the workshop should behave as well. Counterbalances SM-1.
- **SM-C2: Relevance swamping value.** Best match should not always pick the most expensive Hotel. Counterbalances SM-1 and SM-5.

## 9. Open Questions

1. Which Provider? Embeddings and text generation may come from different providers. This is an "ask first" change under AGENTS.md. Recommendation goes in the architecture.
2. Should Smart search apply to the Home page box only, or also re-rank a plain Search bar search when a Query is present?

## 10. Assumptions Index

- FR-2: Provider availability is checked per page render. A mid-search Provider failure falls back to MVP-ordered results with a notice.
- FR-3: Match reasons may be re-generated on reload with different wording.
- FR-4: The Provider normalises City nicknames. Only Destination, Stay, Party and Max price are Hard criteria.
- FR-7: Enrichment sizes (80–150-word description, 3–5 reviews, 2–4 highlights).
- FR-9: Hotel embeddings are built ahead of time and rebuilt by `npm run db:reset`.
- FR-10: The weak-match threshold is tuned against the golden Queries.
- FR-11: Starting weights are 0.6 / 0.2 / 0.2, with the lead signal rotating by mode.
- FR-13: Relevance for a given Query is deterministic or cached.
- FR-14: The pre-selected Room quantity is the fewest Rooms of the Best-fit room that sleep the Party.
- FR-15: Match reasons are at most about 120 characters and stream in after the results.
- §5: Speed targets of 3 s for results and a further 3 s for Match reasons. A bounded number of Provider calls per Query.
- §8: A golden set of about 10 Queries and its targets.
