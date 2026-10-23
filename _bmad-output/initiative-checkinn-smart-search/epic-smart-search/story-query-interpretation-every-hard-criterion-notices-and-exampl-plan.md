---
title: 'Query interpretation: every Hard criterion, notices and Example queries'
type: 'feature'
ticket: '3'
created: '2026-10-20'
status: 'built'
baseline_revision: 'b1e7a92c18454714276b41215885ceb4707f9355'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
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

**Problem:** Query interpretation only applies Destination, an absolute Stay and the Party. Story 1.3 adds the rest:
- relative dates
- nicknames
- the out-of-catalog place
- ignored values
- Rooms auto-raise
- Max price
- Policy criteria
- Preferences

None of these reach the URL yet. The place and ignored notices don't exist. On stage the presenter has to type, because there are no Example queries.

**Approach:**
- Complete `applyInterpretation` as AD-22 and FR-4 describe. Rooms auto-raise follows AD-26.
- Carry the result through new codec parameters: `prefs`, `maxPrice`, `policy`, `place`, `ignored`, and `ignoredKind` (`dates` | `party`), which extends AD-21's table so the notice can name what to check (AD-21).
- Render the place and ignored notices after the result heading.
- Add the three Example queries on Home.
- Fill the nickname map in the interpretation context from a domain table.
- Handle stale or invalid Smart search URLs as EXPERIENCE says.

## Boundaries & Constraints

**Always:**
- AD-21, AD-22 and AD-26 (Rooms auto-raise), with the FR-4 date rules:
  - "this weekend" is the coming Friday to Sunday. On a Friday it is today to Sunday, on a Saturday Saturday to Sunday, and on a Sunday Sunday to Monday, 1 night (user decision).
  - "next weekend" is the Friday-to-Sunday after that weekend's Friday.
  - "tonight" is today to tomorrow.
  - Relative dates beat the model's dates.
- Destination is checked with the MVP `matches` against the catalog after nickname mapping.
- A new Query starts Destination, Max price and Policy criteria empty, and keeps Stay and Party unless it states them.
- The Provider output stays untrusted: validate every field, and never throw.
- EXPERIENCE copy is exact:
  - "We don't have hotels in {place}, so we're showing all cities."
  - "We couldn't use '{phrase}', so check your dates." for a Stay.
  - "We couldn't use '{phrase}', so check who's staying." for a Party (user decision, 2026-10-20).
  - The lead-in "Try an example".
  - The three PRD Queries, verbatim.
- Notices come after the result heading in DOM and visual order, with ids `notice-place` and `notice-value`, at most 2, priority place then ignored. The heading's `aria-describedby` lists them.
- The port shape is unchanged.
- Fixture Preferences strings are final: 2.1 adopts them.

**Never:**
- Criteria chips, the Hard-criteria filter (Max price and Policy criteria do no filtering yet), the Best-fit room or the Ranking blend (1.4, 1.5).
- The `fallback` parameter or caching (1.7).
- Changes to the Azure adapter's request shape.
- Seed changes.
- New dependencies.

## I/O & Edge-Case Matrix

Today is Thu 15 Oct 2026, and the current criteria are Cape Town, 16–17 Oct, 2 adults, 0 children, 1 Room.

| Scenario | Raw interpretation | Result |
|----------|--------------------|--------|
| UJ-1 | Stellenbosch; `next-weekend`; adults 4; maxPrice 2000; pets true; prefs "pet friendly family place" | Stellenbosch, Fri 23 to Sun 25 Oct, 4 adults, 0 children, 1 Room (`fewestRooms`), maxPrice 2000, policy pets, prefs kept |
| This weekend on Sun 18 Oct | `this-weekend` | Sun 18 to Mon 19 Oct |
| This weekend on Sat 17 Oct | `this-weekend` | Sat 17 to Sun 18 Oct |
| Tonight | `tonight` | 15 to 16 Oct |
| Nickname | destination "Joburg" | Destination "Johannesburg" (also "Jozi", "PE", "Cape", "Durbs") |
| Area as Destination | destination "Sandton" | Destination "Sandton", no place notice |
| Out of catalog | destination "Kruger", or outOfCatalogPlace "Kruger" | Destination empty; `place=Kruger`; " Kruger" appended to prefs; notice |
| Invalid dates | checkIn 12 Oct, stayPhrase "last Tuesday" | Current Stay kept; `ignored=last Tuesday` (`ignoredKind` dates, the default); notice |
| Invalid Party | adults 0, partyPhrase "for 0" | Current Party kept; `ignored=for 0&ignoredKind=party`; notice "…so check who's staying." |
| Rooms stated | adults 4, rooms 2 | Rooms 2 (capped by adults and the codec limit) |
| Rooms not stated, Party stated | adults 5, Durban | Rooms 2, from `fewestRooms` with the Durban Room types |
| Party not stated | adults and children null | Current Party, Rooms included |
| Bad Max price | maxPrice 0, -5, 1.5 or "2000" | No `maxPrice` |
| Codec stale | `maxPrice=abc`, `policy=pets,wifi`, `place` over 60 characters or with `<`, `prefs` over 300 characters | Each dropped silently; `policy=pets` kept; Query stays in the box |

</intent-contract>

## Code Map

**From story 1.1, to extend**
- `src/domain/interpretation.ts`
  - `applyInterpretation(raw, current, today)` returns `InterpretedCriteria { q, stay, party }`.
  - `partyFrom` already keeps the current adults when only children are stated, and clamps Rooms.
  - Add a catalog parameter and the new outputs.
- `src/domain/types.ts`
  - `SmartCriteria { query, interpreted }`: add `preferences`, `maxPriceRand`, `policies: PolicyCriterion[]`, `place`, `ignored`, each nullable or empty.
  - `PolicyCriterion = "pets" | "children" | "smoking"`.
  - `SearchResult` gains `notices: SmartNotice[]`, where `SmartNotice = { kind: "place"; place } | { kind: "ignored"; text }`. MVP results give `[]`.
- `src/domain/criteria.ts`
  - `parseSmart`, `serializeCriteria` (the `sq` and `smart` block) and `MAX_QUERY_LENGTH`.
  - Add the new parameters after `smart`, in AD-21 order, with its validation:
    - `place` and `ignored`: 60 characters at most, letters, digits, spaces and `' - , .` only
    - `maxPrice`: a positive whole number
    - `policy`: a comma list with unknown entries dropped
  - `hotelHref` already strips `smart`.
- `src/domain/dates.ts`: `addDays`, `weekdayIndex` (Monday is 0) and `MAX_NIGHTS`. Add `relativeStay(kind, today)` here or in `interpretation.ts`.
- `src/domain/search.ts`: `matches(query, SearchableHotel)` and `SearchableHotel`.

**Search feature**
- `src/features/search/smart-search.ts`
  - `interpretQuery(provider, query, current, catalog, today, signal)` sets `nicknames: {}`. Fill it from the new domain table.
  - `InterpretationCatalog` gains `hotels: (SearchableHotel & { roomTypes: { maxGuests: number }[] })[]`.
- `src/features/search/actions.ts`
  - `queryTarget` builds the catalog from `listCityNames(getDb())`. Add a catalog repo call.
  - `searchHref({ ...interpreted, smart: {...} })` must carry the new fields.
- `src/features/hotels/catalog.repo.ts`: `listCityNames(db)`. Add `listInterpretationCatalog(db)`: every Hotel with name, area, City name and aliases, province, and its Room types' `maxGuests`.
- `src/features/search/search.repo.ts` `searchCatalog` returns `{ heading, cards }`. Add `notices: []`. `queries.ts` `searchHotels` builds the notices from `criteria.smart` when it is set.

**UI**
- `src/app/search/search-results.tsx`: `Results` renders the heading and cards. Add the notices after the heading, and its `aria-describedby`.
- The existing MVP `notice` style: find it in `src/components` (e.g. the stale-link or availability notice) and reuse its classes and info icon.
- `src/components/smart-search/smart-search-box.tsx`, `smart-search-provider.tsx`: the box and `submit(query, current)`. Example queries on Home use `submit`, after setting the box value.
- `src/app/home-search.tsx`: the box sits in the hero. Put the Example queries under it, on Home only.

**Fixtures and e2e**
- `data/eval/fake-provider.json`: add these entries, with no absolute dates:
  - UJ-2: "quiet business hotel in Gauteng with a gym and meeting rooms", giving destination "Gauteng" and prefs "quiet business hotel with a gym and meeting rooms".
  - UJ-3: "ski chalet with a fireplace", giving destination null and prefs "ski chalet with a fireplace".
  - "relaxed lodge with a pool near Kruger", giving outOfCatalogPlace "Kruger" and prefs "relaxed lodge with a pool".
- `e2e/smart/tracer.spec.ts`: the pattern to follow. Its UJ-1 assertions must now expect next weekend's dates, Rooms 1, and the `maxPrice`, `policy` and `prefs` parameters.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/nicknames.ts` + test -- `CITY_NICKNAMES` (joburg, jozi → Johannesburg; pe → Gqeberha; cape → Cape Town; durbs → Durban), keyed by `normaliseText` -- FR-4
- [x] `src/domain/dates.ts` + test -- `relativeStay(kind, today)` with the rules above -- FR-4, user Sunday rule
- [x] `src/domain/rooms.ts` + test
  - `fewestRooms(party, roomTypes)`: the smallest `ceil(guests / maxGuests)` over the Room types.
  - Capped by adults and `PARTY_LIMITS.rooms.max`.
  - An empty list keeps the current Rooms.
  - Rationale: AD-26.
- [x] `src/domain/types.ts`, `src/domain/criteria.ts` + tests -- the extended `SmartCriteria` (including `ignoredKind`), `PolicyCriterion` and `SmartNotice`; parse and serialize the six parameters; drop invalid values silently -- AD-21
- [x] `_bmad-output/initiative-checkinn-smart-search/ux-smart-search/EXPERIENCE.md`, `.../architecture-smart-search/architecture-smart-search.md` -- add the Party ignored copy row and the `ignoredKind` note -- record the user decision
- [x] `src/domain/interpretation.ts` + test
  - `applyInterpretation(raw, current, catalog, today)` returns `{ q, stay, party, preferences, maxPriceRand, policies, place, ignored }`.
  - Covers every matrix row.
- [x] `src/features/hotels/catalog.repo.ts` + test, `src/features/search/smart-search.ts`, `src/features/search/actions.ts` + test
  - The interpretation catalog and nickname context.
  - Actions redirect with every Smart parameter.
  - The UJ-1 redirect test expects Fri 23 to Sun 25 Oct, Rooms 1, `maxPrice=2000`, `policy=pets` and `prefs`.
- [x] `src/features/search/queries.ts`, `search.repo.ts` -- `notices` on `SearchResult`: place, then ignored, at most 2, only when `smart` is set -- AD-20
- [x] `src/app/search/search-results.tsx` + test -- notices after the heading, with ids and the heading's `aria-describedby` -- EXPERIENCE Notices
- [x] `src/components/smart-search/example-queries.tsx` + test, `src/app/home-search.tsx`
  - A list of 3 buttons labelled by "Try an example" (`aria-labelledby`).
  - One click fills the box and submits through the provider.
  - The buttons are `aria-disabled` while pending, and focus stays on the clicked one.
  - Home only.
- [x] `data/eval/fake-provider.json` -- the UJ-2, UJ-3 and Kruger fixtures -- AD-30
- [x] `e2e/smart/tracer.spec.ts`, `e2e/smart/interpretation.spec.ts`
  - Click the UJ-1 Example query and see the Search bar filled: Stellenbosch, next weekend's dates computed from today with `relativeStay`, 4 adults, 1 room. The URL has `maxPrice=2000`, `policy=pets` and `prefs`.
  - The Kruger Query shows the place notice after "All destinations: … found".

**Acceptance Criteria:**
- Given Home with the fake Provider, when the Guest clicks the UJ-1 Example query, then `/search` opens with the Search bar showing Stellenbosch, next weekend's Friday to Sunday, 4 adults and 1 room, on desktop and phone.
- Given the Kruger Query, when results load, then "We don't have hotels in Kruger, so we're showing all cities." shows after the heading, which reads "All destinations: …", and the heading is described by it.
- Given a Smart search URL with an invalid `maxPrice`, an unknown `policy` entry or an over-long `place`, when it loads, then those values are dropped with no error and the Query stays in the box.
- Given no Provider, then no Example queries render and every MVP spec passes.

## Implementation Notes

- `applyInterpretation` takes the Search bar criteria as `SearchBarCriteria` (`{ q, stay, party }`); `InterpretedCriteria` is that plus the Smart values. `smartCriteria(query, interpreted, values)` in `criteria.ts` builds a `SmartCriteria` with every optional value empty.
- `RELATIVE_STAYS` moved to `dates.ts` beside `relativeStay`; `interpretation.ts` re-exports it, so the Azure adapter is unchanged.
- Ignored value: the Stay is checked before the Party. A value whose phrase is missing or not plain notice text cannot be named, so the next unusable value is named instead; with none nameable there is no notice.
- Place: a Destination that matches nothing after nickname mapping, else `outOfCatalogPlace`, names the place, only while Destination is empty and only when it is plain notice text and itself matches nothing. Model Preferences over 300 characters are cut to 300, not dropped.
- Rooms stated as a whole number of at least 1 win; anything else counts as not stated. The final Rooms are always capped by adults and `PARTY_LIMITS.rooms.max`.
- Notices also follow the no-results heading, which they describe, so an ignored value still explains an empty result.
- The box adopts the provider's `submittedQuery` when it changes, which is how an Example query fills it; `submit` also sets `boxIsEmpty`.
- `src/app/search/page.test.tsx` "shows the skeleton cards in place of results while a Query is read" fails when run alone, also at the baseline; the new stale-URL test is placed after it to keep the file's order green.

## Plan Change Log

## Review Triage Log

### 2026-10-20 — Review pass
- verdicts: 4 findings — high 0, medium 1, low 3, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` Clicking the same Example again after a failed submit and an edit left the edited text in the box while the Example's text was submitted. The box only adopted `submittedQuery` when it changed. Fixed: the provider's `submitCount` refills the box on every submit, with a repeat-click test.
  - `[low]` `[patch]` A crafted URL with a Destination and `place` showed "…showing all cities" over that City's Hotels. Fixed: `smartNotices(smart, q)` adds the place notice only when `q` is empty, with domain and query tests.
  - `[low]` `[patch]` `e2e/smart/interpretation.spec.ts` used `#notice-place` id selectors, against the AGENTS.md rule to query by role and name. Fixed: it now locates by the notice text and the heading's accessible description.
  - `[low]` `[patch]` The no-results branch doubled the space before the notices. Fixed: `Notices` takes its margin as a prop, and that branch passes none.

## Design Notes

**Two kinds of ignored value (user decision, 2026-10-20).**
- An unusable Stay gives "We couldn't use '{phrase}', so check your dates."
- An unusable Party gives "We couldn't use '{phrase}', so check who's staying."
- The URL carries the phrase in `ignored` and its kind in `ignoredKind`: `dates` (the default when it is absent or invalid) or `party`.
- Only the first unusable value is recorded, with the Stay checked before the Party.
- Add the Party line to the EXPERIENCE.md voice table, and add `ignoredKind` as a note under AD-21 in the architecture spine.
- `SmartNotice` ignored becomes `{ kind: "ignored"; text; about: "dates" | "party" }`.

**Preferences for an unknown place.** Preferences are the interpreted `preferences` plus the place's words, joined by a space, trimmed, and at most 300 characters.

## Verification

**Commands:**
- `npm run lint`, `npm run typecheck`, `npm test` -- expected: green
- `npm run test:e2e` -- expected: green, including the new smart specs, on smart-desktop and smart-mobile

## Auto Run Result

**Summary.** Query interpretation now covers every Hard criterion, and the result is carried in the URL:
- relative dates, including the user's Sunday rule
- City nicknames
- the out-of-catalog place
- ignored Stay or Party values (user decision: separate copy for each)
- Rooms auto-raise
- Max price, Policy criteria and Preferences

The place and ignored notices show after the result heading. The three Example queries on Home run UJ-1 to UJ-3 in one click each. Stale or invalid Smart search URLs drop bad values silently.

**Files changed (main ones)**
- *Domain*
  - `src/domain/interpretation.ts`: complete `applyInterpretation`, plus `smartNotices`.
  - `src/domain/{nicknames,rooms}.ts` (new), `src/domain/dates.ts` (`relativeStay`).
  - `src/domain/types.ts`, `src/domain/criteria.ts`: the six new parameters.
- *Search feature*
  - `src/features/hotels/catalog.repo.ts`: `listInterpretationCatalog`.
  - `src/features/search/{smart-search,actions,queries,search.repo}.ts`.
- *UI*
  - `src/app/search/search-results.tsx`: the notices, and `PageHeading`'s new `describedBy` prop.
  - `src/components/smart-search/{example-queries,smart-search-box,smart-search-provider,smart-search-context}.tsx`.
  - `src/app/home-search.tsx`.
- *Fixtures and e2e*
  - `data/eval/fake-provider.json`: the UJ-2, UJ-3 and Kruger fixtures.
  - `e2e/smart/tracer.spec.ts`, `e2e/smart/interpretation.spec.ts`.
- *Docs*
  - `EXPERIENCE.md`: the Party ignored-value copy.
  - Architecture spine: the `ignoredKind` note under AD-21.

**Review findings breakdown**
- 4 patches applied: 1 medium, 3 low.
- 0 deferred.
- 0 rejected.

**Follow-up review recommended:** false. This was a first pass, no high was patched, and only one medium was.

**Verification**
- Before review: lint and typecheck were clean. `npm test` passed 838 tests in 85 files. `npm run test:e2e` built, then passed 180 with 8 skipped (the existing booking skips).
- After the patches: lint and typecheck were clean. `npm test` passed 841 tests in 85 files. `npm run test:e2e` built, then passed 180 with 8 skipped.

**Residual risks**
- Max price and Policy criteria are in the URL but do not filter yet (story 1.4, chips and the Hard filter).
- The real `gpt-6-luna` interpretation quality is unmeasured until the eval (2.7).
- An existing order-dependent test in `src/app/search/page.test.tsx` ("skeleton cards…") is fragile when run alone.
