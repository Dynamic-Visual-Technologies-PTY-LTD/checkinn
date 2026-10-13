---
title: 'Photo viewer'
type: 'feature'
ticket: '9'
created: '2026-10-13'
status: 'built'
baseline_revision: '2a31aadcb8743ec0922813df1ab349f4d028ea6c'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'auto'
lenses_ran: ['quick']
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md'
  - '{project-root}/DESIGN.md'
warnings: []
deferred:
  - summary: >-
      Slow interaction unit tests time out at 5 s in full `npm test` runs, and it is getting worse (13 failures in one run).
    evidence: |-
      Seen on 2026-10-13 in `date-range-field`, `range-calendar`, `home-search`, `search-bar`, `dialog`, `search/page` and `hotels/*` tests. Each passes alone; a full run spawns ~33 workers with ~4 s startup each. Same failures on the 1.8 branch and with 1.9 stashed, so not caused by this story. Likely fix: raise `testTimeout` or cap workers in `vitest.config.mts`, which needs the user's approval.
    location: >-
      vitest.config.mts
    severity: medium
---

<intent-contract>

## Intent

**Problem:** The Hotel page shows two photos, but a guest can't open them larger or step through them (FR-10).

**Approach:** Make each Hotel page photo a button that opens a full-screen photo viewer at that photo, built on the story 4 `Dialog` primitive's `sheet` variant. Previous and next by buttons, arrow keys and swipe, wrapping around; Escape or Close returns focus to the photo that opened it.

## Boundaries & Constraints

**Always:** Click or Enter/Space on a photo opens the viewer at that photo (EXPERIENCE.md L93). The viewer is a modal `Dialog` (`variant="sheet"`, full-screen solid Midnight at every width, DESIGN.md L629, L807), titled "<Hotel name> photos". Inside: the photo centred and contained (not cropped), through `RemoteImage` with the seed alt text (placeholder with the Hotel name on failure, FR-11); a visible counter "1 / 2" (`aria-hidden`) plus a polite live region reading "Photo 1 of 2" that updates on every step; Previous and Next icon buttons ("Previous photo", "Next photo", `chevron-left`/`chevron-right`, `iconButton`) and the primitive's Close at the top right. ArrowLeft/ArrowRight step while the viewer is open, wrapping at both ends. A horizontal touch swipe of at least 50px steps (left → next, right → previous); vertical movement and short drags do nothing. Escape or Close closes and returns focus to the opening photo button (`returnFocusRef`). The photo buttons keep the current 2fr/1fr layout and photo sizes; their accessible name is the seed alt text. Overlays never stack (EXPERIENCE.md L40). Tokens only.

**Never:** No new dependencies. No changes to `Dialog` beyond what the viewer strictly needs. No thumbnails strip, zoom, or "+N photos". No change to other Hotel page sections.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open first | click photo 1 | Viewer open, photo 1 alt shown, "Photo 1 of 2" | — |
| Open second | Enter on photo 2 | Viewer at photo 2, "Photo 2 of 2" | — |
| Next wraps | at 2 of 2, ArrowRight or Next | "Photo 1 of 2" | — |
| Previous wraps | at 1 of 2, ArrowLeft or Previous | "Photo 2 of 2" | — |
| Swipe | touch drag left ≥ 50px / right ≥ 50px | next / previous | drag < 50px or mostly vertical → no change |
| Close | Escape or Close | viewer gone, focus on the photo button that opened it | — |
| Photo fails | image error | placeholder with the Hotel name, viewer still steps | — |

</intent-contract>

## Code Map

- `src/app/hotels/[hotelId]/hotel-details.tsx` L137-150 `Photos` -- server component rendering `RemoteImage` per photo in a `ul aria-label="Photos"` with `PHOTO` sizes; replace its body with a new client component, keeping the layout classes.
- `src/components/dialog.tsx` -- `Dialog({open,onClose,title,children,variant:"sheet",returnFocusRef})`; sheet = `fixed inset-0 bg-neutral`, title + Close icon button in a header row, children in `flex-1` column. Escape handled in the panel's `onKeyDown` (stops propagation) — arrow keys can be handled in a child `onKeyDown` or on the panel content.
- `src/components/remote-image.tsx` -- hard-codes `object-cover`; the viewer needs contained photos, so add an optional `fit` (`"cover" | "contain"`, default cover) rather than fighting class order.
- `src/components/icons/icons.tsx` L45-46 `chevron-left`, `chevron-right`; `src/components/button-styles.ts` `iconButton`.
- `src/app/hotels/[hotelId]/hotel-actions.tsx` -- precedent for a client component with refs passed as `returnFocusRef`.
- `src/domain/types.ts` `HotelPage.photos: { url, alt }[]`. Client components must not import `src/db`, repos or `queries.ts` (AD-1); pass `photos` and `hotelName` as props. Do not export plain helpers from a `"use client"` file for server use (story 8 crash).
- `e2e/hotel.spec.ts` -- existing Hotel page spec; the previous route stays hidden in the DOM after client navigation, so filter text matches to visible ones. Images are reachable by `getByRole("img", { name: alt })`; keep that working.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/remote-image.tsx` + test -- optional `fit` prop.
- [x] `src/app/hotels/[hotelId]/photo-viewer.tsx` + test -- client: photo buttons plus the viewer (state: open index or null), stepping, wrap, keys, swipe, live counter, focus return. Cover every matrix row.
- [x] `src/app/hotels/[hotelId]/hotel-details.tsx` -- `Photos` renders the new component.
- [x] `e2e/hotel.spec.ts` -- open by click, step with ArrowRight/ArrowLeft and the buttons, read "Photo 2 of 2", Escape returns focus to the photo; on the mobile project, a swipe steps.

**Acceptance Criteria:**
- Given Harbourlight Retreat's page, when a guest opens photo 1, steps by keyboard and presses Escape, then the counter reads correctly at each step and focus is back on photo 1.
- Given a phone viewport, when the viewer is open, then it covers the screen and a swipe changes the photo.

## Implementation Notes

- `photo-viewer.tsx` exports `HotelPhotos`; `hotel-details.tsx` keeps its `Photos` wrapper and passes `photos`, `hotelName` and the `PHOTO` size classes.
- Arrow keys are read from a `window` keydown listener while the viewer is open, because the sheet's Close button sits outside the children and `Dialog` is unchanged.
- Each photo button is named by `aria-label` (the seed alt text); the image inside keeps the same name, so `getByRole("img", { name })` still finds it.
- The mobile e2e swipe uses CDP `Input.dispatchTouchEvent`, as Playwright has no swipe; it is skipped in the desktop project.
- `date-range-field.test.tsx` and `range-calendar.test.tsx` sometimes time out (5s) under full-suite load; this also happens on the baseline and is unrelated.

## Plan Change Log

## Review Triage Log

### 2026-10-13 — Review pass
- verdicts: 4 findings — high 0, medium 0, low 3, false 1, maybe-false 0
- findings:
  - `[low]` `[patch]` A two-finger gesture can step the photo (touchStart is `touches[0]`, `touchend` reads `changedTouches[0]`; no `touchcancel`) — start point recorded only when one finger is down, `onTouchCancel` clears it, unit test added.
  - `[low]` `[reject]` The viewer photo is requested at width 800 for Wikimedia URLs, so a contained full-screen photo may look soft — the fix is new image-sizing behaviour in `RemoteImage`, outside the plan; the seed hotel photos mostly come from hosts that already set a width.
  - `[low]` `[patch]` Stepping logic written twice (effect inlines it instead of `step`), so the copies could drift — `step` is a `useCallback` on `[count]` and the effect calls it.
  - `[false]` `[reject]` A `<button aria-label=alt>` around the `<img>` hides the image from assistive tech — the button's accessible name is the seed alt text and the existing e2e check `getByRole("img", { name: "Resort exterior and swimming pool" })` still passed in the full run (86 passed).

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green.
- `rtk proxy npx playwright test --workers=1 --reporter=line` -- expected: all pass. Read the passed/failed lines; the RTK-filtered exit code is not reliable.

## Auto Run Result

**Summary:** Each Hotel page photo is now a button that opens a full-screen photo viewer (the `Dialog` sheet) at that photo. Previous and Next buttons, arrow keys and a 50px horizontal swipe step through and wrap around; "Photo 1 of 2" is announced; Escape or Close returns focus to the photo that opened it. `RemoteImage` gained an optional `fit` prop.

**Files:**
- `src/app/hotels/[hotelId]/photo-viewer.tsx` + test -- `HotelPhotos`: photo buttons and the viewer.
- `src/app/hotels/[hotelId]/hotel-details.tsx` -- `Photos` renders `HotelPhotos`.
- `src/components/remote-image.tsx` + test -- `fit` prop (`cover` default, `contain`).
- `e2e/hotel.spec.ts` -- open by click and Enter, keyboard and button stepping with wrap, Escape focus return; mobile swipe via DevTools touch events (skipped on desktop).

**Review:** 4 findings. Patched 2 (low), rejected 2 (1 low out of scope, 1 false). Nothing deferred.

**Follow-up review recommended:** false -- no `high` patched and fewer than two `medium` patched.

**Verification:** after the patches: lint and typecheck clean; `npm run build` green with `/hotels/[hotelId]` as Partial Prerender; `npx playwright test --workers=1` 86 passed, 4 skipped, 0 failed; `npm test` 367 to 368 tests, with 1 to 13 load timeouts in unrelated slow tests per full run (see `deferred`), and every failing file passing alone (66/66 in the targeted rerun).

**Residual risks:** viewer photos for Wikimedia URLs are requested at width 800, so they can look soft on large screens; the swipe e2e test uses Chromium-only DevTools touch events.
