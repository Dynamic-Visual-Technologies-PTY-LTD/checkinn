# Smart Search PRD: Addendum

Material that informs downstream work (UX, architecture) but does not belong in the PRD itself.

## Starting point in the repo (2026-10-15)

Source: a repo-extraction subagent.

**Seam.** Architecture AD-7 defines `searchHotels(criteria: SearchCriteria): Promise<SearchResult>` in `src/features/search/queries.ts` as the only entry point for listing Hotels. A replacement keeps the signature and the types. AD-8 routes the URL `q` parameter through `src/domain/criteria.ts` only.

**Inherited constraints** (MVP PRD §5, initiative):

- no API key or external service
- works with the network blocked, because it runs on a presenter laptop at AI Expo Africa 2026
- renders within 1 s on a laptop
- WCAG 2.1 AA, on mobile and desktop

AGENTS.md makes each of these "ask first": a new dependency (sqlite-vec, an embedding model), a schema or seed change, and an AI provider.

**Today's search.**

- *Matching*: a case-insensitive substring match of `q` against city, alias, province, area and hotel name.
- *Filtering*: a hotel is kept only if a room type is available every night. Party size does not filter.
- *Ranking*: review score, then lowest price.
- *Output*: `SearchResult { heading, cards }`, with no relevance score or match reason.

**Corpus.**

- *Size*: 6 cities and 12 fictional hotels, with 2 room types each.
- *Structured fields*: category, stars, review score, price (690–2450 ZAR), 11 amenity keys, policies (children, pets, smoking, cancellation) and room capacity.
- *Free text*: thin. Each hotel description is one sentence of about 70 characters, and each city has a one-liner. There is no review text, no coordinates and no landmarks.

The subagent's inference: semantic ranking has little text to work with unless the seed is enriched, and enriching it is an ask-first change.

## Landscape research (2026-10-15)

Source: a web-research subagent. Confidence is medium; most sources are 2024–2026 launch coverage.

**Two product shapes exist.**

- *Natural-language box that sets filters*, results stay a normal list: Booking.com Smart Filter maps "hotels in Amsterdam with a great gym and canal views" onto its existing filters.
- *Chat that returns a list or itinerary*: Expedia Romie, Kayak AI Mode (Oct 2025), Google AI Mode with in-flow booking (Aug 2026).

Both shapes parse dates, guests and location into structured fields and match the rest by meaning. No source found on how any of them shows *why* a result matched, so that is an open UX gap.

**Guest-facing failure modes.**

- A Sept 2026 traveller survey found 1 in 6 AI users were sent to something that does not exist. The commonest errors were wrong prices or details (27%) and unavailable options (21%). Trust drops sharply after an error.
- Hard pre-filters can empty the candidate set and produce zero results. A known mitigation is to expand the query before search and verify relevance after.
- Mitigations suggested by the subagent (not sourced): only quote catalog data and never generate amenity claims; validate extracted filters against the schema; show the interpreted filters to the guest in editable form.

**Technical notes (for architecture).**

- *Hybrid pattern*: extract hard constraints and apply them as metadata filters, then rank the remaining text by embedding similarity.
- *Local embeddings*: all-MiniLM-L6-v2 (384 dimensions) through `@huggingface/transformers`. The first run downloads the model, which conflicts with "no external services" unless the model is vendored or cached.
- *sqlite-vec*: pre-v1 with breaking changes expected. Loading it through better-sqlite3 on Windows with Node 24 is unverified. `@photostructure/sqlite-vec` ships prebuilt binaries.
- *Alternative*: for a catalog of hundreds of hotels, in-process cosine similarity over stored vectors avoids the native extension.

**Candidate metrics** (general practice, no benchmarks found):

- zero-result rate
- reformulation or abandonment rate
- click-through and the rank of the clicked or booked hotel
- search-to-view and search-to-booking conversion
- time to book
- share of interpreted filters the guest edits
- constraint-violation rate (should be 0 by design)
