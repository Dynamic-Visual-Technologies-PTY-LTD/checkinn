---
title: 'Hotel page'
type: 'feature'
ticket: '8'
created: '2026-10-13'
status: 'built'
baseline_revision: 'e3756b65dfcbd907923373aa1fb740a8690d716d'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md'
  - '{project-root}/DESIGN.md'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/mockups/key-hotel.html'
warnings: ['oversized']
deferred:
  - summary: >-
      Slow interaction tests (story 1.4 calendar, Home search bar) time out intermittently under load in full `npm test` runs.
    evidence: |-
      "DateRangeField on phone > emits a complete range on Done and discards a partial one on Close" failed in 3 full runs on 2026-10-13 (around 6.5 s, timing out) and passed alone and on every rerun. A later run also failed `date-range-field` "picks a range by click", `range-calendar` "moves focus by week, month…" and `home-search` "share the live, unsubmitted Stay and Party"; the next run was 355/355. Pre-existing; none touched by this story. Likely fix: raise those tests' timeout or speed up their userEvent setup.
    location: >-
      src/components/date-range-field.test.tsx:228
    severity: low
---

<intent-contract>

## Intent

**Problem:** Listing cards link to `/hotels/<id>`, which 404s. Guests can't see a Hotel's details, save it or share it.

**Approach:** Build `/hotels/[hotelId]` from a `hotel.repo.ts` view model: header (FR-9) with Save, Share, the "We Price Match" chip and See rooms; 2 photos (FR-10, no viewer); review panel (FR-12); facilities (FR-13); description and house rules (FR-14); a stub `#availability` section. Ship a reusable toast and clipboard helper with a fallback dialog (entry 12 reuses them).

## Boundaries & Constraints

**Always:** `params` and `searchParams` are awaited only inside Suspense (Cache Components, no `generateStaticParams`). Reads go through a `queries.ts` function that calls `await io()` first (AD-2). Unknown id → `notFound()`. Title "Harbourlight Retreat · CheckInn". Order: header, photos, review panel + facilities (side by side on desktop), "About this property" + "House rules", then `section#availability` with h2 "Availability" (`tabIndex=-1`) and nothing else. The hotel-name h1 takes focus on client navigation (reuse the `ResultsHeading` pattern). Header per DESIGN.md L749-753: category eyebrow, name + stars ("5-star hotel"), pin + "V&A Waterfront, Cape Town, Western Cape"; actions Save, Share, "We Price Match" chip button, secondary "See rooms" button. Save: `aria-pressed`, name "Save Harbourlight Retreat", heart filled when saved; stored in `localStorage` key `checkinn:saved` as a JSON array of Hotel ids; no toast. Share: copies an absolute URL rebuilt with `hotelHref(hotelId, parsed criteria)`; success → toast "Link copied" (`role="status"`, 5 s, held while hovered or focused, bottom centre). Clipboard missing or `writeText` rejecting → fallback dialog. See rooms scrolls to `#availability` and focuses its h2, instantly under reduced motion. Review panel: "Guest reviews", "4.8" + "/ 5", "Superb", "248 reviews" (labels via `reviewLabel`). Facilities: "Most popular facilities", every amenity with icon + seed label, 2 columns desktop, 1 on phone. House rules `<dl>`: Check-in "From 14:00", Check-out "Until 10:00", Children, Pets, Smoking, Cancellation. Photos through `RemoteImage`, seed alt text. Dialogs use the `Dialog` primitive, focus starts on Close. Tokens only. Remove `prefetch={false}` from Listing card links.

**Copy (user, 2026-10-13):** Price match dialog: title "We Price Match", body "CheckInn is a demo, so no price matching happens. Prices shown are fictional.", button "Close". Share fallback dialog: title "Copy this link", body "Your browser blocked copying. Select the link and copy it.", read-only field labelled "Hotel page link" with the URL selected, button "Close". Cancellation: "Free cancellation until 48 hours before check-in." / "Non-refundable. This booking can't be cancelled." Children "Children are welcome" / "Children are not allowed"; Pets "Pets are welcome" / "Pets are not allowed"; Smoking "Smoking is allowed" / "Smoking is not allowed".

**Never:** No photo viewer (entry 9), room table, Stay/Party picker, stale-link message or booking (entries 10-11). No saved-Hotels list. No new dependencies. No `"use cache"` on DB reads. No `generateStaticParams`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Harbourlight | `/hotels/hotel-001` | Seed values above; 5 facilities incl. "Free Wi-Fi"; "Non-refundable. This booking can't be cancelled." | — |
| No pool | `/hotels/hotel-002` | No "Swimming pool" | — |
| Pets allowed | `hotel-010` | "Pets are welcome" | — |
| Unknown | `/hotels/nope` | "We can't find that page." | Status may be 200 once streaming starts (Next docs); assert the heading, not the status |
| Share, clipboard OK | click Share | Clipboard = absolute hotel URL with criteria; toast "Link copied" | — |
| Share, clipboard blocked | `navigator.clipboard` absent or rejecting | Fallback dialog, URL selected, focus on Close, Escape closes, focus returns to Share | — |
| Save | click Save, reload | `aria-pressed="true"` persists; click again → false | Corrupt `checkinn:saved` value reads as empty |
| Price match | click chip | Dialog with the copy above | — |
| See rooms | click | h2 "Availability" focused | — |

</intent-contract>

## Code Map

- `src/db/schema.ts` -- `hotels` L45-72 (description, starRating, reviewScore/Count, amenities JSON, checkInTime/OutTime, `policies` `HotelPolicies` L19-24); `hotel_images` L74-90; province on `cities` L30 (join).
- `src/features/search/search.repo.ts:24-30` -- memoised `loadSeed()` read of `amenityLabels` (labels are not in the DB); reuse, don't duplicate.
- `src/features/hotels/queries.ts` -- `server-only` + `await io()` wrappers (`getAvailability`, `getPhotoCredits`). Add `getHotelPage(hotelId)`. Repos are sync `(db: Db)`, tests `// @vitest-environment node` with `createTestDb()` (`src/db/test-db.ts`).
- `src/domain/types.ts` -- add a serializable `HotelPage` view model. `src/domain/search.ts` `reviewLabel` L85 (reuse); `cardFacilities` is NOT for FR-13 (caps at 3, skips Wi-Fi).
- `src/components/listing-card.tsx` -- private `Stars` L33, `Score` L52, `Rand`: extract `Stars` to a shared component; L122-123 drop `prefetch={false}` and its comment.
- `src/components/dialog.tsx` -- `Dialog({open,onClose,title,children,initialFocusRef?,returnFocusRef?})`; caller supplies Close; `[data-autofocus]` sets initial focus.
- `src/components/icons/icons.tsx` -- `heart` (no filled variant: add one or fill via class), `share`, `location-pin`, amenity icons; map seed keys (`air_conditioning`→`snowflake`, `meeting_rooms`→`meeting-room`, `play_area`→`play-area`).
- `src/components/remote-image.tsx`, `button-styles.ts` (`secondaryButton`, `iconButton`), `src/app/search/results-heading.tsx` (focus-on-client-nav pattern).
- `src/domain/criteria.ts` -- `parseCriteria(params, today, {defaultStay:false})` L183, `hotelHref` L265.
- `src/app/search/page.tsx` + `search-results.tsx` -- the Suspense + `generateMetadata` pattern to copy. `layout.tsx` title template; no toast region yet.
- Next docs: `01-app/03-api-reference/03-file-conventions/dynamic-routes.md` L151-181; `04-functions/not-found.md` L85-121, L193-195; `04-functions/generate-metadata.md` L197, L1272-1283.
- Harbourlight seed values: luxury, 5 stars, V&A Waterfront, Cape Town, Western Cape, 4.8/248, "A fictional coastal retreat with spacious rooms and a relaxed pool terrace.", wifi/pool/spa/restaurant/parking, 14:00/10:00, children yes, pets no, smoking no, non_refundable.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/types.ts`, `src/domain/hotel.ts` + test -- `HotelPage` type; pure house-rule and cancellation wording.
- [x] `src/features/hotels/hotel.repo.ts` + test, `queries.ts` -- `hotelPage(db, id): HotelPage | null`; `getHotelPage`. Cover Harbourlight, hotel-002, hotel-010, unknown.
- [x] `src/lib/clipboard.ts` + test -- `copyText(text): Promise<boolean>`, false when the API is missing or rejects.
- [x] `src/components/toast.tsx` + test -- reusable toast (status role, 5 s, hold on hover/focus).
- [x] `src/components/copy-fallback-dialog.tsx` + test -- reusable select-and-copy dialog (title/body props).
- [x] `src/components/stars.tsx` -- extracted from `listing-card.tsx`.
- [x] `src/app/hotels/[hotelId]/page.tsx`, `hotel-details.tsx`, `hotel-actions.tsx` (client: Save, Share, Price match, See rooms) + tests -- the page and sections.
- [x] `src/components/listing-card.tsx` -- drop `prefetch={false}`.
- [x] `e2e/hotel.spec.ts` -- Search → card → Harbourlight page; Save persists over reload; Share with clipboard permission → "Link copied"; Share with clipboard removed via `addInitScript` → fallback dialog; price-match dialog; See rooms focus; `/hotels/nope` shows not-found.

**Acceptance Criteria:**
- Given Search results for Cape Town, when a guest opens Harbourlight Retreat, then the Hotel page shows its seed values and the title "Harbourlight Retreat · CheckInn".
- Given `npm run build` with no database file, then `/hotels/[hotelId]` builds as Partial Prerender.

## Implementation Notes

- `labels()` in `search.repo.ts` is now exported and reused by `hotel.repo.ts`, so the seed is still read once.
- `HotelPage` carries `houseRules` already worded (from `src/domain/hotel.ts`) and facilities as `{ key, label }`; the key-to-icon map lives in `hotel-details.tsx` (unknown keys fall back to `check`).
- The h1 reuses `ResultsHeading` directly from `src/app/search/results-heading.tsx`.
- Save state is read with `useSyncExternalStore` over `localStorage` (server snapshot `null`, so the first paint is unsaved); writes dispatch a same-tab event.
- `generateMetadata` titles an unknown id "Page not found"; the body calls `notFound()` inside Suspense.
- Review fix: element ids carry the Hotel id (`availability-<hotelId>`, `availability-heading-<hotelId>`, …), because Next can keep a previous Hotel page hidden in the DOM (Activity). This replaces the plain `section#availability` the Boundaries asked for. See rooms targets the scoped heading id.
- e2e: Cache Components keeps the previous Search results route hidden in the DOM after client navigation, so top-level `getByText` checks in `hotel.spec.ts` filter to visible matches.

- Orchestrator fix after the review patches: `availabilityHeadingId` moved from the `"use client"` `hotel-actions.tsx` to `src/domain/hotel.ts`. The server page called it across the client boundary, so every Hotel page failed to render in dev and production (unit tests can't see the boundary; e2e caught it). The e2e review assertions now use exact text, because the new sr-only score sentence also contains "Superb".

## Plan Change Log

## Review Triage Log

### 2026-10-13 — Review pass
- verdicts: 8 findings — high 0, medium 3, low 5, false 0, maybe-false 0
- findings:
  - `[low]` `[patch]` Toast "held while focused" can never fire: the panel has nothing focusable; the test passed only via a synthetic focus event — removed the focus state and that test; comments say held while hovered.
  - `[low]` `[patch]` `writeSaved` catch comment claimed in-memory persistence that doesn't exist — comment corrected (blocked storage means the Hotel can't be saved). No fallback added: blocked `localStorage` is rare and a fallback adds state.
  - `[medium]` `[patch]` Review panel score had no text equivalent (EXPERIENCE.md L92); a screen reader heard "4.8 slash 5" — visual parts `aria-hidden`, one sr-only "Rated 4.8 out of 5, Superb, 248 reviews".
  - `[medium]` `[patch]` Fixed element ids clash with a previous Hotel page that Next keeps hidden in the DOM (Activity), so See rooms' `getElementById` could hit the hidden page — every id now carries the Hotel id.
  - `[medium]` `[patch]` Dialogs passed no `returnFocusRef`; where a click doesn't focus a button (Safari, Firefox on macOS), focus went to body on close — refs passed for the chip and Share.
  - `[low]` `[patch]` `page.test.tsx` queried `section#availability` and `section` by selector, against AGENTS.md — switched to `getByRole("region", …)`.
  - `[low]` `[reject]` A hovered toast replaced by a second toast starts its timer under the pointer — needs repeated Share clicks while hovering; a fix adds pointer-tracking state.
  - `[low]` `[patch]` "We Price Match" chip used `px-space-md`, not the DESIGN.md `chip` token `spacing.sm` — now `px-space-sm`.

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green.
- `npx playwright test --workers=1` -- expected: all pass, including `e2e/hotel.spec.ts` (parallel launch fails locally with spawn UNKNOWN).

## Auto Run Result

**Summary:** `/hotels/[hotelId]` built from a `hotel.repo.ts` view model: header (name, stars, location, Save, Share, "We Price Match", See rooms), 2 photos, review panel, facilities, about and house rules, and a stub Availability section. Reusable `copyText`, `Toast` and `CopyFallbackDialog` for entry 12. Listing card links now prefetch. Run outside the skill's render step at first (RTK hid its output); the user chose ticket 1.8 and settled 4 copy/behaviour questions before planning.

**Files:**
- `src/app/hotels/[hotelId]/page.tsx` -- route, `generateMetadata`, Suspense shell.
- `src/app/hotels/[hotelId]/hotel-details.tsx` -- server sections; reads params, criteria and the Hotel inside Suspense; `notFound()`.
- `src/app/hotels/[hotelId]/hotel-actions.tsx` -- client Save, Share, price-match dialog, See rooms.
- `src/features/hotels/hotel.repo.ts`, `queries.ts` -- `hotelPage`, `getHotelPage`.
- `src/domain/hotel.ts`, `types.ts` -- house-rule wording, `HotelPage`, `availabilityHeadingId`.
- `src/components/toast.tsx`, `copy-fallback-dialog.tsx`, `stars.tsx`; `src/lib/clipboard.ts` -- reusable pieces.
- `src/components/listing-card.tsx` -- `Stars` extracted, `prefetch={false}` dropped.
- `src/features/search/search.repo.ts` -- `labels()` exported.
- `e2e/hotel.spec.ts` and unit tests beside each file.

**Review:** 8 findings. Patched 7 (3 medium, 4 low), rejected 1 low (hovered-toast replacement), none deferred from review. Deferred separately: the flaky slow unit tests above.

**Follow-up review recommended:** true -- 3 medium entries patched (score text equivalent, scoped ids, dialog focus return). The specific unverified risk: focus return to Share/chip on close was fixed by refs but is only exercised in Chromium, never in Safari/Firefox where the defect showed; and the patch round introduced a client-boundary crash that only e2e caught.

**Verification:** lint clean; typecheck clean; `npm test` 355/355 (one earlier run had 4 load timeouts in untouched tests, rerun green); `npm run build` green with `/hotels/[hotelId]` as Partial Prerender; `npx playwright test --workers=1` 81 passed, 3 skipped, 0 failed. Every I/O matrix row covered by a passing test.

**Residual risks:** the Save heart shows unsaved for a moment on load before `localStorage` is read; the Hotel is read twice per request (title and body); unknown ids may return HTTP 200 once streaming starts (by design per Next docs; the not-found page shows).
