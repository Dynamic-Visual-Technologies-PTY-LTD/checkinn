---
title: 'Best-fit pre-selection on the Hotel page'
type: 'feature'
ticket: '6'
created: '2026-10-20'
status: 'built'
baseline_revision: '9abe8c309591fe810198b9d024b9b7af49341a83'
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
  - '{project-root}/_bmad-output/initiative-checkinn-smart-search/ux-smart-search/mockups/key-hotel-bestfit.html'
  - '{project-root}/AGENTS.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Since 1.5, a Smart search card links to the Hotel page with `bestFit`, but the page ignores it. The Guest who opens Winelands from UJ-1 lands on an empty room table and has to find the Family Room again (FR-14).

**Approach:** On the Hotel page, when a Provider is configured and the URL's `bestFit` Room type still qualifies for the page's Stay and Party (AD-23 without Max price), mark that row with the Best-fit chip.
- When `sel` is absent, also pre-select it at the URL's Rooms, with the booking-summary line.
- `bestFit` survives the Hotel page's own URL rewrites, so reload, Back and a shared link reproduce the chip. It never reaches `/book`.

## Boundaries & Constraints

**Always:**
- AD-26 Hotel page:
  - Pre-select `bestFit` × the URL's `rooms` only when `sel` is absent, a Provider is configured, and `qualifyingRoomTypes(hotel.rooms, availability, party, null)` includes it.
  - With `sel` present, `sel` wins and `bestFit` only places the chip, provided it still qualifies.
  - Otherwise nothing is pre-selected and no chip shows. That covers no Provider, an unknown id, a sold-out type or too small a type.
  - A Stay or Party change keeps `bestFit` in the URL and re-checks it on the server.
- AD-21:
  - The Hotel page URL never carries a Smart parameter.
  - Every `/book` URL, the `/book` back link to the room table (`roomTableHref`) and the Reserve path drop `bestFit`.
  - The Hotel page's own `replaceState` rewrites keep it. These are the selection change and the clearing of the room-ran-out notice.
  - So do the Stay and Party picker's push and the Share link.
- Max price is never enforced on the Hotel page.
- EXPERIENCE Room table (changed), Best-fit chip, Booking summary (changed):
  - The room-name cell becomes `<th scope="row">` on every row, holding the `h3` name and, on the Best-fit row, the display-only root `chip` "Best fit for your search".
  - The chip has a stable id. That row's Rooms select gets `aria-describedby` pointing at the chip.
  - The chip stays on its row when the selection changes.
  - While the pre-selection is untouched, the booking summary shows "{Room type name} picked for your search. Change it in the table." in muted body-sm before the total, in the phone bar's full summary too. Any quantity change removes it.
  - Focus on arrival is unchanged (the hotel name). Reserve is enabled when the Party fits, by the MVP `reserveBlock`.
- The pre-selection is not written to the URL until the Guest changes a quantity. A reload with no `sel` pre-selects again.

**Never:**
- Changes to the Search results card, the ranking, `bestFit()` or the codec's parse of `bestFit` (1.5).
- Writing `bestFit` from `serializeCriteria` (1.5 design note), or putting it in any `/book` URL or booking action input.
- Fallback mode, caches or Relevance (1.7, 2.5).
- Seed, schema or dependency changes.

## I/O & Edge-Case Matrix

Winelands (`hotel-010`): Standard 1 450, sleeps 2. Family (`hotel-010-family`) 2 000, sleeps 4.

| Scenario | URL / state | Expected |
|----------|-------------|----------|
| UJ-1 arrival | Provider on, `bestFit=hotel-010-family`, 4 adults, 1 Room, no `sel` | Family Room × 1 selected, chip on its row, summary line, Reserve enabled |
| Rooms from URL | `bestFit=hotel-010-standard`, 4 adults, 2 Rooms | Standard × 2 selected, chip, summary line |
| Guest changes quantity | From UJ-1 arrival, set Standard to 1 | Summary line gone, chip stays, URL gains `sel` and keeps `bestFit` |
| Guest clears the pick | From UJ-1 arrival, set Family to 0 (nothing selected) | Summary line gone, chip stays, URL has no `sel` and keeps `bestFit`; a reload pre-selects the Family Room again (user decision, 2026-10-20: the MVP `sel` codec, AD-8, is unchanged) |
| Reload after change | `sel=…&bestFit=hotel-010-family` | `sel` selection; chip on Family; no summary line |
| No Provider | Same URL as UJ-1, `CHECKINN_PROVIDER=off` | MVP: nothing pre-selected, no chip, no line |
| Unknown id | `bestFit=nope` | Nothing pre-selected, no chip |
| No longer qualifies | `bestFit=hotel-010-standard`, 4 adults, 1 Room (sleeps 2 < 4); or Availability < Rooms | Nothing pre-selected, no chip |
| Over Max price | Best-fit type dearer than the search's Max price | Still pre-selected: the Hotel page ignores Max price |
| Stay or Party change | Change the Party in the picker | URL keeps `bestFit`. The server re-checks: still qualifying → chip and, without `sel`, pre-selection; else neither |
| Reserve | Reserve from UJ-1 arrival | The `/book` URL has no `bestFit` and no Smart parameter. The `/book` back link has no `bestFit` |
| Room-ran-out notice cleared | Notice URL with `bestFit` | `replaceState` drops `notice` and `rt`, and keeps `bestFit` |

</intent-contract>

## Code Map

**Domain**
- `src/domain/criteria.ts`
  - `hotelHref` (around L403) appends `bestFit` to `serializeCriteria`'s output.
  - Extract that into an exported `hotelQuery(criteria)`: the Hotel page query string, meaning `serializeCriteria` with `smart: null` plus `bestFit` last. `hotelHref` uses it.
  - Keep `serializeCriteria` unchanged.
- `src/domain/best-fit.ts`: add a pure `hotelBestFit(bestFitId, rooms, availability, party, selInUrl, providerOn)`, where `selInUrl` is true when the URL has a `sel`, valid or not. It returns `{ chipRoomTypeId: string | null; preselect: RoomSelection[] | null }` and uses `qualifyingRoomTypes` from `src/domain/hard-criteria.ts` with `maxPriceRand` null. Test it against the matrix rows.
  - `RoomOption` (`src/domain/types.ts` L313) has `id`, `maxGuests` and `nightlyRand`. `availability` is a `Map` from `getAvailability`. `qualifyingRoomTypes` takes a `ReadonlyMap`.
- `src/domain/hotel.ts`: `roomTableHref` uses `hotelHref`. The `/book` callers in `src/app/book/book-content.tsx` pass explicit criteria with no `bestFit`. Confirm that, and add a test that `roomTableHref` without `bestFit` has none.

**Hotel page**
- `src/app/hotels/[hotelId]/hotel-details.tsx`
  - `HotelContent` (L42–70) parses criteria.
  - `sharePath` adds `bestFit: criteria.bestFit`.
  - Read the Provider flag with `getSmartSearchConfig()` from `src/features/search/queries.ts`, after `io()`. Pass it into the `AvailabilityContext`.
- `src/app/hotels/[hotelId]/availability-section.tsx`
  - `AvailabilityContext` gains `smartSearch: boolean`.
  - `AvailabilityResults` (after `getAvailability`): when `criteria.sel` is null and `hotelBestFit` gives `preselect`, use it as `initialSelection`. Otherwise keep `clampSelection`.
  - Pass `bestFitRoomTypeId` (the chip row) and `preselected: boolean` to `RoomSelectionPanel`.
  - Pass `bestFit={criteria.bestFit}` to `StayPartyPicker`.
- `src/app/hotels/[hotelId]/room-selection.tsx`
  - `replaceSelectionInUrl` (L64) and its 3 callers: build the query with `hotelQuery({ ...criteria, sel })`, so `bestFit` survives.
  - Hold `preselectionTouched` state, false on arrival, reset when `initialSelection` changes (the `seenKey` block). `onQuantityChange` sets it.
  - Pass `bestFitRoomTypeId` to `RoomTable`. Pass the summary note, the room name + " picked for your search. Change it in the table.", to `BookingSummary` and `MobileSummaryBar` while preselected and untouched.
- `src/app/hotels/[hotelId]/availability-alert.tsx`: `clearNoticeFromUrl` (L19) uses `hotelQuery`.
- `src/app/hotels/[hotelId]/stay-party-picker.tsx`: `commit` (L104–114) passes `bestFit: criteria.bestFit`, read from the same parsed URL, to `hotelHref`.
- `src/app/hotels/[hotelId]/room-table.tsx`
  - The name `td` (around L111) becomes `<th role="rowheader" scope="row">` on every row. Keep its classes, and add `text-left font-normal`.
  - Add an optional `bestFitRoomTypeId` prop. That row adds the chip, a `span` with the root chip classes (check `DESIGN.md` and existing chip classes, e.g. the Facilities pill), and gets an id like `best-fit-chip-${room.id}`.
  - Its `<select>` gets `aria-describedby` with that id.
- `src/components/booking-summary.tsx`: an optional `note?: string`, rendered as a muted body-sm `<p>` before the total. Find the phone bar's full summary (`MobileSummaryBar`) and pass the same note through.

**E2E**
- New `e2e/smart/best-fit-hotel.spec.ts` on the smart projects, read-only (it never confirms a booking). Follow `e2e/smart/best-fit.spec.ts` (`runUj1`) and `e2e/room-table.spec.ts` for the room-table helpers.
- MVP specs in `e2e/hotel.spec.ts` and `e2e/room-table.spec.ts` may query the room name as a `cell`. Update them to `rowheader` only if the `th` change breaks them, and record that in Implementation Notes.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/criteria.ts` + test -- `hotelQuery`; `hotelHref` uses it -- AD-21
- [x] `src/domain/best-fit.ts` + test -- `hotelBestFit` covering the matrix's arrival, Rooms, sel, no Provider, unknown, no-longer-qualifies and Max price rows -- AD-26
- [x] `src/domain/hotel.test.ts` -- `roomTableHref` never carries `bestFit` when not given -- AD-21
- [x] `src/app/hotels/[hotelId]/hotel-details.tsx`, `availability-section.tsx` + tests -- the Provider flag, pre-selection, chip id and `sharePath`
- [x] `src/app/hotels/[hotelId]/room-selection.tsx`, `availability-alert.tsx`, `stay-party-picker.tsx` + tests -- the URL rewrites keep `bestFit`; the summary note until the first change
- [x] `src/app/hotels/[hotelId]/room-table.tsx` + test -- the row header, the chip and `aria-describedby`
- [x] `src/components/booking-summary.tsx` + test -- the `note`
- [x] `e2e/smart/best-fit-hotel.spec.ts`
  - UJ-1: the Example query, then open Winelands from its card. The Family Room select shows 1 and is described by "Best fit for your search". The summary line shows, and Reserve is enabled.
  - Change the Family quantity. The line is gone, the chip stays, and the URL has `sel` and `bestFit`.
  - Reload: same state, no line.
  - Reserve from a fresh arrival: the `/book` URL has no `bestFit`, `sq`, `smart`, `prefs`, `maxPrice` or `policy`. Use the `e2e/booking` rules if the spec creates a Booking. Otherwise stop at the `/book` URL check, since Reserve only starts a Booking.
  - Open the same URL with `bestFit=nope`: no chip, nothing selected.
- [x] MVP e2e specs -- adjust only `cell` to `rowheader` queries if needed; no assertion weakened

**Acceptance Criteria:**
- Given the UJ-1 card, when the Guest opens Winelands Family Lodge, then the Family Room is selected at 1 Room with the Best-fit chip, the booking summary says "Family Room picked for your search. Change it in the table.", and Reserve is enabled, on desktop and phone.
- Given that page, when the Guest changes a quantity, then the summary line goes, the chip stays, and a reload keeps the Guest's selection with the chip.
- Given that page, when the Guest reserves, then the `/book` URL carries no Smart parameter and no `bestFit`.
- Given no Provider, then every MVP Hotel page and booking spec passes unchanged.

## Implementation Notes

- `hotelQuery(criteria)` in `src/domain/criteria.ts` is the Hotel page query; `hotelHref` uses it. `serializeCriteria` is unchanged. `replaceSelectionInUrl` and `clearNoticeFromUrl` now build with `hotelQuery`, so they keep `bestFit` (and still drop every Smart parameter).
- `hotelBestFit(bestFitId, rooms, availability, party, selInUrl, providerOn)` in `src/domain/best-fit.ts` returns `{ chipRoomTypeId, preselect }`, using `qualifyingRoomTypes(..., null)`.
- `AvailabilityContext.smartSearch` is required; `AvailabilityResults` takes `smartSearch` as an optional prop defaulting to `false` (MVP behaviour), so MVP callers and tests need no change.
- `StayPartyPicker.commit` reads `bestFit` from the same parsed URL as `sel` (Code Map, stay-party-picker line). No `bestFit` prop was added to the picker: it would duplicate the URL value the Code Map tells `commit` to read.
- The chip id is `best-fit-chip-${room.id}` (exported as `bestFitChipId`). Chip classes follow the root `chip` token and the Facilities pill: `rounded-full border border-primary bg-surface px-space-md py-space-xs text-label-md text-on-surface uppercase`, without `whitespace-nowrap` so it wraps.
- The room-name cell is `<th role="rowheader" scope="row">` with the `td` classes plus `text-left font-normal`. No MVP e2e spec queried the name as a `cell`, so `e2e/hotel.spec.ts` and `e2e/room-table.spec.ts` are unchanged.
- The summary note is `BookingSummary`'s `note` prop; `MobileSummaryBar` already renders the same `summary` element in its sheet, so the phone full summary shows it with no change there.
- "Guest clears the pick" (user decision, Plan Change Log 2026-10-20): the `sel` codec is unchanged, with `parseSelection` accepting positive quantities only. `replaceSelectionInUrl` writes no `sel` for an empty selection and keeps `bestFit`, so a reload pre-selects the Best-fit room again. The e2e test "clearing the pick…" covers this. The `:0` marker work was dropped and the MVP tests are back to their baseline inputs.
- Review fixes:
  - Pre-selection now needs `sel` to be truly absent. `hotelBestFit` takes `selInUrl: boolean` instead of `sel`. `HotelContent` passes `selInvalid` (the `sel-invalid` problem) through `AvailabilityContext` to `AvailabilityResults`, which calls it with `criteria.sel !== null || selInvalid`. An invalid `sel` still gets the chip when `bestFit` qualifies. Unit tests: `best-fit.test.ts`, `availability-section.test.tsx`, `page.test.tsx`.
  - The doc comments on `serializeCriteria`, `hotelHref`, `hotelQuery` and `SearchCriteria.bestFit` now name `hotelQuery` as the one writer of `bestFit`.
  - The unknown-`bestFit` e2e test checks every Rooms select is 0 and the summary has 0 rooms and no lines.
- Review fix (stale `seenKey`): `RoomSelectionPanel` now tracks the last server `initialSelection` by identity, because each server render sends a new array. A new one replaces the local selection, and resets `touched`, only when its content differs from the local selection. So a Party change after the Guest cleared the pick brings the Best-fit pre-selection and the summary line back, and an echo of the Guest's own `sel` changes nothing. The suggested "set `seenKey` in `onQuantityChange`" fix was not used: with the key check in render, it reset every local change straight back to the server selection, and three tests failed. Covered in `room-selection.test.tsx`.

## Plan Change Log

### 2026-10-20 — Intent gap resolved by the user
- **Trigger:** the review's medium finding. Persisting a cleared Best-fit pre-selection changed the MVP `sel` codec (AD-8).
- **User decision:** a reload after the Guest clears the pre-selection pre-selects the Best-fit room again. No codec change.
- **Amended:** the matrix row split into "Guest changes quantity" (Standard to 1) and "Guest clears the pick" (no `sel`, re-pre-selects on reload).
- **Known-bad state avoided:** `parseSelection` accepting `:0`, the `sel=<bestFit>:0` marker, and the two MVP test inputs changed from `:0` to `:-1`.
- **KEEP, from the saved patch:**
  - `hotelQuery` and `hotelHref` using it.
  - `hotelBestFit` and its server decision in `AvailabilityResults`.
  - The Provider flag and the Share link with `bestFit`.
  - The URL rewrites (`replaceSelectionInUrl`, `clearNoticeFromUrl`, the picker) keeping `bestFit`.
  - The room-table row header, the chip and `aria-describedby`.
  - The `BookingSummary` `note` and the touched state.
  - The e2e spec, minus the Family-to-0 test.
  - The tests beside each file.
- **Also apply** the three low review findings: pre-select only when `sel` is truly absent, not invalid; fix the stale "only writer of `bestFit`" doc comments; make the unknown-`bestFit` e2e check every select and the summary.

## Review Triage Log

### 2026-10-20 — Review pass
- verdicts: 6 findings — high 0, medium 1, low 4, false 1, maybe-false 0
- Attempted change saved as [story-best-fit-pre-selection-on-the-hotel-page-plan.patch](story-best-fit-pre-selection-on-the-hotel-page-plan.patch), relative to `baseline_revision`. The code is reverted.
- findings:
  - `[medium]` `[intent_gap]` `parseSelection` now accepts and drops `:0` lines, and `hotelQuery` writes a `sel=<bestFit>:0` marker. This changes the MVP `sel` contract: AD-8 says "every quantity is a positive integer".
    - It was made to satisfy the matrix row "set Family to 0 → URL gains `sel`".
    - Side effect: a 0 line naming another Hotel's Room type now passes `hotelSelection` in `startBooking`, because the line is dropped before the ownership check.
    - Confirmed at `_bmad-output/initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md:133` and `src/features/booking/actions.ts:108`.
    - Every way to persist "the Guest cleared the pre-selection" changes AD-8 or AD-21, or drops that half of the matrix row. Choosing one is an architecture decision the plan cannot make.
  - `[low]` `[intent_gap]` Same root cause (the marker): `hotelQuery` writes the marker whenever `bestFit` is set, even with no Provider, an unknown id, or on the server-lowered path. `params.set` also puts `sel` after `notice`/`rt`, against the codec's fixed order. It is confirmed in the diff, and it goes away or changes with the decision above.
  - `[low]` `[patch]` (moot under the intent gap) A malformed `sel` parses to null, which `hotelBestFit` treats as absent, so it pre-selects. AD-26 says pre-select only when `sel` is absent. Fix on re-derivation: pass `problems.includes("sel-invalid")` through, and pre-select only when `sel` is truly absent.
  - `[low]` `[patch]` (moot) Stale doc comments in `serializeCriteria`, `hotelHref` and `types.ts` still say `hotelHref` is the only writer of `bestFit`; `hotelQuery` now writes it too.
  - `[low]` `[patch]` (moot) The e2e "an unknown bestFit…" checks only the Family select. It should also check the Standard select and the summary count for "nothing selected".
  - `[false]` `[reject]` "AC 'no Provider, every MVP spec passes' not verified". Refuted: the orchestrator ran the full `npm run test:e2e` after the build, with 198 passed and 8 skipped, including every MVP and booking spec on the no-Provider server on port 3100. The no-Provider row also has unit tests.

**Open questions (intent gap).** After the Guest clears a Best-fit pre-selection (every quantity 0), what should a reload show?
1. **Nothing selected.** The URL must record an explicit empty selection. Either allow `sel=<id>:0` in the codec (amends MVP AD-8; the ownership check must then still cover 0 lines), or add a Hotel-page-only parameter (amends AD-21's parameter table).
2. **The pre-selection again.** No codec change. The matrix row's "Family to 0" half is dropped, and EXPERIENCE's "the MVP selection rule wins on reload" is read as "an empty choice is not a choice".


### 2026-10-20 — Review pass (after the intent gap)
- verdicts: 1 finding — high 0, medium 1, low 0, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` After the Guest cleared the pre-selection, a Party change with the same Stay left the room table showing nothing.
    - Why: `seenKey` held the server's arrival key, and the server sent the same pre-selection again, so the panel never reset. The URL and a reload meant Family × 1. This broke the matrix's "Stay or Party change" row.
    - The suggested `seenKey` update on local changes snapped every local change back, and broke 3 tests.
    - Fixed in `room-selection.tsx`: the panel now remembers the last server `initialSelection` by identity. A new server array replaces the local selection, and resets `touched`, only when its content differs. A plain echo of the Guest's own `sel` changes nothing.
    - Tests: the bug sequence, and the MVP echo.

## Design Notes

**Where the decision lives.** The server decides both the chip and the pre-selection in one pure function, after Availability is read, so reload, Back and a shared link agree. The client only tracks "touched" to drop the summary line. It never re-checks `bestFit`.

**`hotelQuery`, not `serializeCriteria`.** 1.5 kept `bestFit` out of `serializeCriteria` so that `/book` URLs can't carry it. The Hotel page's own rewrites call `hotelQuery`, which is the same query plus `bestFit`. `/book` builders keep `serializeCriteria`.

## Verification

**Commands:**
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` -- expected: green
- `npm run test:e2e` -- expected: green, including `e2e/smart/best-fit-hotel.spec.ts` on smart-desktop and smart-mobile, with every MVP spec passing

## Auto Run Result

**Summary.** Opening a Hotel from a Smart search card now pre-selects its Best-fit room (AD-26, FR-14).
- **The rule.** With a Provider configured and no `sel` in the URL, the Best-fit room is selected at the URL's Rooms when it still qualifies (AD-23 without Max price).
- **What the Guest sees.** The row carries the "Best fit for your search" chip, which describes its Rooms select. The booking summary says "{Room} picked for your search. Change it in the table." until the first quantity change.
- **When `sel` is in the URL.** `sel` wins, and `bestFit` only places the chip. An invalid `sel` gets no pre-selection.
- **Where `bestFit` goes.** It survives the Hotel page's own URL rewrites, the Stay and Party picker and Share. It never reaches `/book` or the `/book` back link.
- **A cleared pick.** After the Guest clears it, a reload pre-selects again (user decision, 2026-10-20). The MVP `sel` codec is unchanged.

**History.**
- The first review found the codec change against MVP AD-8. That was an intent gap: the run halted blocked, the code was reverted and saved as `story-best-fit-pre-selection-on-the-hotel-page-plan.patch`, and the user decided.
- The work was re-derived from the patch without the codec change, and with the three low fixes.
- A second review found one medium bug, now patched.

**Files changed**
- *Domain*
  - `src/domain/criteria.ts`: `hotelQuery`, which `hotelHref` uses.
  - `src/domain/best-fit.ts`: `hotelBestFit`.
  - `src/domain/types.ts`: doc comments.
- *Hotel page*
  - `hotel-details.tsx`: the Provider flag, `selInvalid`, and Share with `bestFit`.
  - `availability-section.tsx`: the server decision.
  - `room-selection.tsx`: URL rewrites that keep `bestFit`, the note, `touched`, and the identity-based reset.
  - `room-table.tsx`: the row header, the chip and `aria-describedby`.
  - `availability-alert.tsx` and `stay-party-picker.tsx`: keep `bestFit`.
- *Shared*
  - `src/components/booking-summary.tsx`: the `note`.
- *Tests*
  - Unit tests beside each file.
  - New `e2e/smart/best-fit-hotel.spec.ts`.

**Review findings breakdown**
- Pass 1: 6 findings.
  - 1 medium and 1 low were intent gaps, resolved by the user.
  - 3 low patches were applied on re-derivation.
  - 1 false: the no-Provider AC was verified by the full e2e run.
- Pass 2: 1 medium patch applied.
- 0 deferred.

**Follow-up review recommended:** false. This pass patched one medium entry and no high.

**Verification.** After the final patch, lint and typecheck were clean. `npm test` passed 970 tests in 90 files. Build OK. `npm run test:e2e` (CI=1) had 198 passed and 8 skipped (the existing project skips), including `best-fit-hotel.spec.ts` on smart-desktop and smart-mobile and every MVP and booking spec.

**Residual risks**
- The panel's reset relies on each server render sending a new `initialSelection` array, by reference identity. A future memoised server prop would break it silently; unit tests cover the current behaviour.
- A Stay or Party change and clearing the room-ran-out notice are covered by unit tests only, not e2e.
