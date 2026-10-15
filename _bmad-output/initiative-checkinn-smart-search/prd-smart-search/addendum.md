# Smart Search PRD: Addendum

Material that informs downstream work (UX, architecture) but does not belong in the PRD itself.

## Provider decision (2026-10-15)

The user decided that smart search uses **Azure AI Foundry**, with the **gpt-6-luna** model for query interpretation and match reasons. The user typed "gpt-luna-6". A previous project used Azure deployment `gpt-6-luna`, so the exact deployment name needs confirming.

This is the user's approval of the AI-provider "ask first" item in AGENTS.md.

**For architecture:**

- **Embeddings.** gpt-6-luna is a generation model. Retrieval needs an embedding model as well, such as a `text-embedding-3-*` deployment on the same Foundry resource. Still to be picked.
- **API shape.** On other projects the user wants Azure OpenAI calls made through the **Responses API**, not chat completions; gpt-6-luna rejects function tools with reasoning on chat completions. Assume the same here unless the user says otherwise.
- **Configuration.** The endpoint, key and deployment names come from local environment variables that are never committed. With no key set, the Smart search box is hidden (FR-2).

## Embedding model choice (2026-10-15)

The user asked for the best model in the `text-embedding-3` family. Recommendation: **`text-embedding-3-large`**, called with **`dimensions: 1024`**.

- **Quality.** It is the stronger of the two models; OpenAI's published MTEB average is about 64.6 for large and 62.3 for small. Quality is what the workshop demonstrates, and the corpus is tiny: 12 Hotels × about 8 chunks, under 100 vectors. That makes the cost difference between the models negligible.
- **Size.** `text-embedding-3` vectors can be shortened with the `dimensions` parameter, with only a small loss in quality. At 1024 dimensions the committed vectors stay small, around 400 KB as float32, and comparisons stay fast. The architecture step can test 3072 against 1024 with the eval if it wants.
- **Query latency.** At query time only the Query is embedded, a single short input, and latency is similar for both models.

To verify: that `text-embedding-3-large` can be deployed in the Foundry resource's region.

## RAG patterns to carry into architecture

These are proposed patterns, not decisions. Each maps to the FRs it supports.

1. **Query understanding with structured output (FR-4, FR-6, Untrusted Query).** One gpt-6-luna call through the Responses API with a strict JSON schema returns:
   - `destination`, `outOfCatalogPlace`
   - `checkIn`, `checkOut`
   - `adults`, `children`, `rooms`
   - `maxPrice`
   - `preferences`, a cleaned-up restatement of the non-hard parts of the Query

   Today's date and the 6 City names (with aliases) go into the instructions. The output is validated by the existing criteria code (`src/domain/criteria.ts`) before it is used, and anything invalid is dropped field by field. The Query goes only in the user input, never in the instructions. No tools are exposed.
2. **Filter first, then retrieve (FR-6, FR-9).** Hard criteria are applied in SQL (Destination, Availability, Party capacity, Max price) before Retrieval, so ranking only ever sees eligible Hotels. This is the metadata pre-filtering pattern.
3. **Facet chunking (FR-8).** Each Hotel's Search knowledge is split into small, labelled chunks:
   - an overview
   - facilities and house rules, *written out as sentences from the structured seed data*, so "pet friendly" can match `petsAllowed: true`
   - one chunk per Room type, with its capacity and beds
   - one chunk per review
   - one chunk per nearby highlight

   Each chunk carries `hotelId`, `facet` and a content hash.
4. **Hybrid retrieval with Reciprocal Rank Fusion (FR-9).**
   - *Meaning match:* cosine similarity between the Preferences embedding and the chunk vectors.
   - *Exact-word match:* BM25 over the same chunks with SQLite FTS5, which is built into SQLite with no new dependency. Check that the better-sqlite3 build has FTS5 enabled.
   - *Fusion:* the two rankings are merged with RRF (k≈60) at chunk level, then rolled up to the Hotel with the max or the mean of the top 2. The result is min-max normalised to 0–1 to give Relevance.
   - *Vector store:* fewer than 100 vectors means brute-force comparison in TypeScript is enough. `sqlite-vec` (listed as agreed in AGENTS.md) is optional at this size and adds a native extension. It's the architecture's call, and adding it is an ask-first change.
5. **Blended ranking as pure domain code (FR-11 to FR-13).** `score = wR·Relevance + wS·ratingNorm + wP·priceNorm`, with the weights set per Ranking mode. The rating and price signals are normalised within the candidate set. This lives in `src/domain/` with no Provider calls, so switching modes is instant and fully unit-testable.
6. **Grounded generation with citations (FR-15, FR-16).** One batched gpt-6-luna call for the top N Hotels. Its input is each Hotel's retrieved chunks with their ids. It returns JSON `{hotelId, reason, citedChunkIds}`. CheckInn drops a Match reason if it cites a chunk that doesn't belong to that Hotel, or cites nothing. The instructions forbid prices, dates and availability in reasons. The call streams in behind the results (React Suspense), so a slow reason never holds up the list.
7. **Caching for determinism and cost (FR-13, §5 Cost).** Interpretation and the Query embedding are cached in memory, keyed on the normalised Query plus today's date. Hotel vectors are precomputed.
8. **Prepared Search knowledge is committed (FR-9).**
   - `npm run search:index` (needs the key) writes the chunks and vectors to a committed file next to the Enrichment. The seed file is untouched.
   - `npm run db:reset` loads that file and never calls the Provider.
   - A Vitest test compares the content hashes with the current seed and Enrichment and fails with "run search:index" if they are stale.
9. **Security.** Key, endpoint and deployment names come from environment variables, with `.env.example` committed and `.env` never committed. The client is the `openai` SDK pointed at the Foundry `/openai/v1/` endpoint, which supports the Responses API and embeddings. Adding that SDK is an ask-first dependency.

## Eval design to carry into architecture

- **Two layers.**
  1. *Component evals* score each stage separately: interpretation accuracy, retrieval hit@k / MRR / nDCG@3, ranking-mode deltas, and Match reason grounding.
  2. *End-to-end evals* score the Listing cards the Guest would actually see.

  Separating the layers shows *which* stage regressed.
- **Offline retrieval evals.** The embeddings of the Golden queries' Preferences are committed alongside the hotel vectors. Retrieval and ranking evals can then run in plain Vitest with no key, and could go in CI if the user approves that change. Only interpretation and grounding need live calls.
- **Ablation for the workshop.** The eval runner can score keyword-only, vector-only and hybrid retrieval side by side. Showing "hybrid beats either alone on these Queries" is a strong teaching moment.
- **LLM-as-judge for grounding (FR-19).** gpt-6-luna gets a separate, strict prompt and gives a binary verdict naming any unsupported claim. The judge is calibrated against planted false reasons before its scores are trusted. Its temperature or reasoning is fixed, and each Query runs about 3 times so variance shows up in the report.
- **Held-out Queries (SM-C1).** A few Golden queries are marked held-out. They are reported but never tuned against.
- **Outputs.** A JSON and Markdown report goes to an ignored `.eval-results/` folder, with a short table in the terminal. The run exits non-zero when an SM threshold fails, so it can gate later if the user wants.

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
