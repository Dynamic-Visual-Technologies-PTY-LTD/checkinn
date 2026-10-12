# Spine Pair Review — checkinn

Reviewer: rubric-walker. Scope: `DESIGN.md` + `EXPERIENCE.md` in this workspace, checked against `../prd-checkinn/prd-checkinn.md`, `imports/DESIGN-repo-root.md` and `.memlog.md`. Line numbers are as of 2026-10-09 11:47. Mockups are still being rendered, so visual reference coverage is reported as pending, not broken.

## Overall verdict

**Adequate. Usable as a contract once the high findings are fixed.** Flows, voice, IA and inheritance are solid: every UJ has a flow, every `{token}` reference resolves, all root tokens are kept unchanged, and `designmd lint` reports 0 errors and 0 warnings. A downstream consumer will still stall in three places:

1. Borders, the system's main hierarchy device, exist only in prose. In the tokens, `alert-error` and `alert-success` are identical.
2. The disabled RESERVE button is the same Night Blue as the booking summary panel it sits in, so it disappears. Disabled is the default state of step 1.
3. About a dozen components that EXPERIENCE.md depends on have no visual spec: dialogs, price-match badge, save and share, the mobile summary bar, skeletons, the error summary, the review panel and facilities.

State coverage also misses stale or invalid criteria in a shared URL, which is a likely expo scenario.

| # | Category | Verdict |
|---|---|---|
| 1 | Flow coverage | adequate |
| 2 | Token completeness | adequate |
| 3 | Component coverage | thin |
| 4 | State coverage | adequate |
| 5 | Visual reference coverage | thin (mockups pending) |
| 6 | Bloat & overspecification | adequate |
| 7 | Inheritance discipline | adequate |
| 8 | Shape fit | strong |

## 1. Flow coverage — adequate

Extracted from the PRD: UJ-1, UJ-2 and UJ-3 each map to Flow 1, Flow 2 and Flow 3 (EXPERIENCE L164–192). Each flow has a named protagonist, numbered steps and a bolded climax. UJ-1 and UJ-3 have failure paths that mirror the PRD edge cases. Flow 4 (presenter) is an extra, tagged `[ASSUMPTION]`.

### Findings
- **medium** Flow 1's failure path contradicts the state rules. It ends with "the select showing what is left" (EXPERIENCE L175), but the scenario is that the *last* Standard Double was taken, so Availability is 0. Under the Room table pattern (L77) and the "Sold out" state (L94), that row shows "Sold out for your dates" and has no select. A story-dev agent will have to pick one. *Fix:* "...an `alert-error` naming the room; the Standard Double row now reads Sold out for your dates and she can pick the Family Room."
- **medium** Flow 4's climax depends on things that are not settled (EXPERIENCE L200). "The Family Room now shows one fewer left" needs a shared instance, which is PRD Open Question 1 and still unresolved. It is also only visible if Availability is 3 or less, because "Only N left" appears only when N ≤ 3 (L93). With more inventory, the front-row visitor sees no change. *Fix:* tie the beat to a seed Hotel whose Family Room inventory is 3 or less, or make it "the Family Room shows Sold out" for a 1-inventory Room type. Note the dependency on OQ1 in the flow header.
- **low** Flow 1's climax drops what UJ-1's climax names (EXPERIENCE L173 vs PRD UJ-1). The PRD shows the reference, the dates, the room and the total. The flow shows only the tick, the headline, the reference and the total. *Fix:* add "Fri 13 – Sun 15 Nov · 1 × Standard Double".
- **low** Flow 2 squeezes Booking details, confirmation and the reference into one sentence in step 5 (L183) and has no failure path. The PRD gives UJ-2 no edge case, and the party-doesn't-fit warning in step 3 does act as an in-flow failure. *Fix:* optionally add "Failure: as Flow 1 (room ran out at confirm)" so the multi-line Booking case is covered.
- **low** Flow 2's title is not verbatim. "Sipho books two rooms in Durban" (L177) vs PRD "Sipho brings the family to Durban". Flows 1 and 3 are verbatim. *Fix:* use the PRD title.

## 2. Token completeness — adequate

All 17 colours have hex values. Every `{colors.*}`, `{typography.*}` and `{rounded.*}` reference in the 39 components resolves (verified, and `designmd lint` returns 0 errors and 0 warnings). Contrast is stated for the main pairs, and the stated ratios match measurement (see Mechanical notes). The gaps are in what the tokens *don't* carry.

### Findings
- **high** Borders, the main hierarchy device, are not tokenised. Elevation (DESIGN L416–425) says hierarchy comes from 1px and 2px Brand Blue borders, and that alerts and invalid inputs are told apart by Coral and Mint borders (L455, L513). No component in the frontmatter carries a border. As a result `alert-error` and `alert-success` are byte-identical (L235–244), `input-error` has no border colour, and `card`, `input`, `search-bar`, `room-table` and the listing-card hover (Gold border, L492) are missing their defining feature. A token-only consumer, such as a Tailwind theme generator or an AI story-dev, will render error and success alerts the same. *Fix:* add `borderColor` / `borderWidth` keys to these components. The lint passes with unknown keys such as `size` today; re-run `npm run design:lint` to confirm. If the linter rejects them, add a bracketed `{colors.error}` / `{colors.success}` reference to each affected component's prose line.
- **high** The disabled RESERVE button is invisible inside the booking summary. `button-primary-disabled` uses `{colors.primary-subtle}` as its fill (L118), and `booking-summary` uses the same token as its panel (L225). The summary holds the step's primary button (L506). "Nothing selected → RESERVE disabled" is the *initial* state of step 1 (EXPERIENCE L95), and the party-doesn't-fit state also disables it (L96). Fill against panel is 1:1, so only muted text floats in the panel. *Fix:* give the disabled primary a 2px `{colors.on-surface-disabled}` border, or a transparent fill with that border, and state it in Components.
- **medium** Night Blue surfaces nearly vanish against Midnight. `primary-subtle` on `neutral` measures 1.33:1. It carries the calendar in-range days (the only visual cue for the range), the booking summary panel, toasts and the image placeholder. The audience is a projector, where dark tones crush together (DESIGN L276–280). The range indicator fails WCAG 1.4.11 (3:1 for non-text). *Fix:* add a 1px Brand Blue border to `booking-summary`, `toast` and `image-placeholder`, and give in-range days a visible cue (an outline or a lighter tint, 3:1 or more against Midnight).
- **medium** The "transparent" components are tokenised as an opaque fill. Prose says card, secondary button, input and alerts are "Transparent" (L446, L449, L452, L513), but their tokens set `backgroundColor: {colors.surface}`, which is `#070C14`. That is the same hex as `neutral`, so it looks fine on the page. It diverges on the Night Blue summary, over the city-tile gradient and over photos (`input-light` is "for use on imagery"). *Fix:* either drop `backgroundColor` from those components and say "no fill", or change the prose to "Midnight fill".
- **medium** The rule for Brand Blue text is looser than WCAG. "Use it for text only at 20px and above" (L317, L531) does not meet AA at a measured 4.43:1. WCAG large text means 24px regular or about 18.7px bold (700). 20–23px at weight 500 or 600 fails. The Link rule also leaves a gap: standalone small links that are not "inside body text" are not covered (L460–462). Examples are "Manage this booking" on the confirmation page (EXPERIENCE L99), the Not found links (L106) and the footer photo-credits link (L34), all at 14–15px. *Fix:* "Brand Blue text only at 24px+ (or bold 19px+); every link below that size is white and underlined."
- **low** `on-error` is defined but unused, and contradicts the prose (L22 vs L341–343, which says Coral is never a fill). *Fix:* remove it or note the one place Coral is a fill.
- **low** Spacing tokens are never referenced. Paddings are hard-coded (25px, 15px, 8px) instead of `{spacing.lg}`, `{spacing.md}` and `{spacing.sm}` (e.g. L113, L137, L239), so the 15/25/50/100 rhythm can drift. *Fix:* use the references.
- **low** Mobile type overrides exist only in prose (L375–377), and they flatten the hierarchy: `headline-display` and `headline-lg` both become 26px. *Fix:* add `headline-display-mobile`-style tokens, or say explicitly that the two levels merge on phones.

## 3. Component coverage — thin

Compared both files' component lists. DESIGN has 24 prose components and 39 frontmatter entries. EXPERIENCE Component Patterns has 18 rows, plus the components named in State Patterns.

### Findings
- **high** About 12 behavioural components have no visual spec in DESIGN Components:
  - Price-match badge (EXPERIENCE L74, PRD FR-15)
  - Save (heart) (L72)
  - Share (L73)
  - Dialogs: price-match explanation, cancel confirmation (L82), share fallback (L73)
  - Guest form error summary (L80)
  - Manage booking form (L81)
  - Booking summary mobile bottom bar (L78)
  - Skeleton listing cards and rows (L88–89)
  - Booking reference display with COPY (L99)
  - Room table quantity select (L77)
  - Mobile full-screen sheet (L140)
  - Footer (L34)

  Story-dev will invent these, inconsistently, and the dialogs and the bottom bar appear in every booking. *Fix:* add a Components entry and, where useful, a frontmatter entry for each. At minimum, cover `dialog`, `bottom-bar`, `skeleton`, `icon-button` (heart, share, close, COPY) and `price-match-badge`.
- **medium** PRD Hotel-page sections have no visual spec in either file:
  - Hotel header layout (FR-9)
  - Review panel, including the "4.8 / 5" format and label bands (FR-12; the score badge shows only "4.8", DESIGN L481)
  - "Most popular facilities" list (FR-13; it is named only in Inspiration, EXPERIENCE L154)
  - Description and house rules (FR-14)

  *Fix:* add Components entries for `review-panel`, `facility-list` and `house-rules`, and a Hotel header anatomy.
- **medium** "Reserve (header)" collides with the site header, and the Hotel page ends up with two primary buttons. EXPERIENCE L75 means the *Hotel* header's RESERVE (FR-9). DESIGN's "Header" is the *site* header (L463), and Flow 4 says "clicks RESERVE in the header" (L198). The Hotel page also has RESERVE in the booking summary. That gives two RESERVE buttons against "One primary per screen" (DESIGN L443, L526). *Fix:* name the component "Hotel header" in both files and make its RESERVE a secondary button that scrolls.
- **medium** Several DESIGN-only components have no behavioural rule in EXPERIENCE:
  - Toast: duration, dismissal, live region
  - Alerts: dismissible? persistent? focus (only the room-ran-out alert takes focus)
  - Chip: interactive or static?
  - Link, score badge, cancellation line, header navigation

  *Fix:* add one line each to Component Patterns. "Display only" is a valid rule.
- **low** The Hotel-page availability picker has no defined submit (EXPERIENCE L76). It "refreshes the room table in place", but it is unclear whether that happens on DONE, on each stepper change or on an explicit button, and whether there is a SEARCH button competing with RESERVE. *Fix:* say "refreshes when the calendar or occupancy popover closes; no button."

## 4. State coverage — adequate

IA surfaces walked:
- **Home:** static. City tile photo failure is covered.
- **Search results:** loading, no results, error and photo failure are covered.
- **Hotel page:** without dates, loading, few left, sold out, nothing selected, party doesn't fit and room ran out are covered.
- **Booking details:** confirming, validation and server error are covered.
- **Confirmation:** covered.
- **Manage booking:** not found is covered.
- **Booking view:** all four policy states are covered.
- **Not found:** covered.

Gaps are listed below.

### Findings
- **high** No state for stale or invalid criteria in the URL (Search results, Hotel page and Booking details; FR-4). Criteria live in the URL so links can be shared and reloaded (EXPERIENCE L36). A link shared at the expo and opened the next day has a check-in in the past, and a hand-edited link can exceed 30 nights or 5 rooms. Validation is defined only on submit in the search bar (L91). *Fix:* add a state, for example: "Invalid or past criteria in URL: replace with defaults, show the search bar's Coral message, and do not run the search."
- **medium** The FR-22 "refresh" case and direct entry to Booking details are not covered. FR-22 says double-click *and refresh* create one Booking, but EXPERIENCE covers only the disabled button (L97). There is no state for reloading or going Back to Booking details after a confirmation, or for loading Booking details with no or invalid room selection in the URL. *Fix:* add "Already booked: show the existing confirmation" and "No valid selection: return to the Hotel page room table."
- **medium** Hotel page has two missing states:
  - The availability picker changes so that a chosen quantity now exceeds the new Availability.
  - Every Room type is sold out for the dates (reachable from a shared link).

  *Fix:* "Quantities clamp to the new Availability and are announced", and "All rooms sold out: notice above the table, suggest other dates, RESERVE hidden."
- **medium** The result-count headline is undefined for the default search (FR-2). The pattern "Cape Town: 2 properties found" (L45, PRD FR-7) has no City when the Destination is empty, and has no singular form. *Fix:* "12 properties found" for an empty Destination, and "1 property found".
- **low** Minor in-progress and feedback states are missing:
  - Manage booking: required-field and email-format validation, and a lookup in progress.
  - Booking view: a cancel in progress, and the deadline passing between page load and confirming the cancel.
  - Confirmation: feedback after COPY (toast "Reference copied"?).

  *Fix:* one row each.

## 5. Visual reference coverage — thin (mockups pending)

### Findings
- **medium** The import is not linked from either spine. `imports/DESIGN-repo-root.md` is the base that DESIGN.md extends (memlog), but DESIGN.md never says it extends the root file, and EXPERIENCE `sources` (L6–8) leave it out. Only `ux-checkinn.md` lists `../../../DESIGN.md`. *Fix:* add one prose line to DESIGN Overview, for example "Extends the repo-root DESIGN.md (`imports/DESIGN-repo-root.md`); all root tokens are kept." DESIGN frontmatter cannot carry `sources` under the lint.
- **medium** The booking.com reference screenshots are cited but not present. The PRD memlog records 4 of them (hotel header and gallery, facilities, availability table, search bar). PRD FR-9 and FR-15 ("matching the reference screenshot") and EXPERIENCE Inspiration (L154) depend on them. They are not in `imports/` and not linked. The price-match badge, which has no DESIGN spec either, can only be built from one of them. *Fix:* copy them into `imports/` and link them inline where they apply.
- **low** There is no "spine wins on conflict" statement and no composition-reference line. This is expected while mockups are pending. *Fix:* once the key-screen mocks land, add the examples' line to EXPERIENCE Information Architecture: "→ Composition reference: `mockups/…`. Spine wins on conflict."

## 6. Bloat & overspecification — adequate

### Findings
- **medium** Breakpoints and layout are split across the two files. DESIGN defines only 768px and says "2 columns on tablet" without defining tablet (L375, L393, L399). The 1024px threshold and tablet behaviour exist only in EXPERIENCE Responsive (L136–140), which restates DESIGN Layout (summary placement, header height, card orientation). If either file is edited alone, they drift. *Fix:* put the breakpoint values and the visual layout per breakpoint in DESIGN Layout once, and keep EXPERIENCE Responsive to behaviour: sheets, the fixed bar, focus.
- **low** Behaviour is leaking into DESIGN Components: "The whole card is one link" (L491), the calendar footer "Done" button (L475–476), "A stepper button at its limit is disabled" (L479–480). All of these are also in EXPERIENCE. *Fix:* keep them in EXPERIENCE only.
- **low** Size. DESIGN is 535 lines (a 265-line frontmatter with 39 components), against about 93–157 lines in the examples. EXPERIENCE is 200 lines, against 112–133. Much of the length is earned (booking-specific components, the presenter section). The logo and favicon wiring paragraph (DESIGN L286–308) is implementation detail inherited from the root. *Fix:* none required. Consider moving the favicon regeneration note to the README.

## 7. Inheritance discipline — adequate

The root import is kept: a diff shows all 13 root colours, all 10 type scales, all rounded and spacing values and all 15 root components unchanged. The prose changes are extensions, such as "Book, Confirm" becoming "Reserve, Confirm booking". FR citations resolve, UJ-1 and UJ-3 titles are verbatim, and the glossary is inherited by reference (EXPERIENCE L15). Component names agree for the 11 components that appear in both files.

### Findings
- **medium** Glossary drift between "amenity" and "Facility". DESIGN's Listing card has "up to 3 amenity chips" (L489), and Chip is "for filters and amenities" (L458). FR-6 says up to 3 **Facilities**, and Room amenity is a separate glossary term (Free Wi-Fi, Private bathroom). A developer may render Room amenities. "Filters" is out of scope (PRD §4.1). *Fix:* "up to 3 Facility chips" and "Chip: for Facilities".
- **low** The price format does not follow FR-19 in the summary context. The voice rule says the summary uses "R 4 900,00" (EXPERIENCE L57), but the mobile summary bar reads "R 4 900" (L170) and the Flow 2 summary total reads "R 24 750" (L182). SM-4 requires totals to agree everywhere. *Fix:* say which format the collapsed bar uses, and correct Flow 2.
- **low** The date format is inconsistent. Voice says "Fri 13 Nov 2026" (L57). The deadline strings are "Wed 11 Nov, 14:00" with no year (L48, L102, L183). The PRD FR-21 example is "12 Nov 2026, 14:00". The weekdays and the 48-hour arithmetic are correct for 2026. *Fix:* choose one deadline format and use it everywhere.
- **low** "Availability picker" (EXPERIENCE L76) is not a PRD term. FR-16 calls it the Stay and Party picker. The search-bar labels "Dates" and "Occupancy" (DESIGN L467, EXPERIENCE L125) are acceptable UI labels but differ from the glossary's Stay and Party. *Fix:* name the component "Stay and Party picker", and add a line saying UI labels may differ from glossary terms.

## 8. Shape fit — strong

### Findings
- **low** DESIGN body sections keep the lint-required names in the correct order: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts. EXPERIENCE follows the example spine order (Foundation → Key Flows). Its two extra sections, Responsive & Platform and Demo and Presenter Concerns, earn their place for a projector-plus-phone demo. *Fix:* none.
- **low** EXPERIENCE frontmatter is `status: draft` and lists sources, but not the import (see §5). *Fix:* add `imports/DESIGN-repo-root.md` to `sources`.

## Mechanical notes

- `npx designmd lint` on the workspace DESIGN.md: 0 errors, 0 warnings. It reports 17 colours, 11 type scales, 5 radii, 8 spacing tokens and 39 components.
- Token references: every `{colors|typography|rounded}.*` reference in the components resolves. There are no `{spacing.*}` references. `on-error` is unused. `headline-lg`, `headline-md` and `body-lg` are used only in prose.
- Measured contrast (WCAG relative luminance). Stated figures check out:

  | Pair | Ratio |
  |---|---|
  | Brand Blue on Midnight | 4.43 (stated 4.4) |
  | white on Deep Blue | 7.10 |
  | Coral on Midnight | 7.06 |
  | Mint on Midnight | 11.09 |
  | Midnight on Gold | 12.18 |
  | white on Night Blue | 14.70 |
  | muted on Night Blue | 11.85 |
  | disabled grey on Midnight | 5.04 |
  | Outline on Midnight | 13.11 |
  | Brand Blue border on Night Blue | 3.32 |
  | **Night Blue vs Midnight** | **1.33** |
  | Deep Blue selected day vs Midnight | 2.76 |
  | Outline border on white (`input-light`) | 1.49 |
  | white on Brand Blue | 4.43 (fails AA, as stated) |

- Not yet flagged above: the Outline border on `input-light` is 1.49:1 against its white field. If that border is the field boundary, it fails 1.4.11. The fix belongs with the first high finding in §2.
- Dates verified for 2026: Fri 13 Nov, Wed 11 Nov (48 hours before a 14:00 check-in on 13 Nov) and Wed 18 Nov (5 nights).
- Root vs workspace: `imports/DESIGN-repo-root.md` is byte-identical to the current repo-root `DESIGN.md`, so it has not been promoted yet, as the memlog plans.
- FR coverage in EXPERIENCE IA (L23–29): FR-1 to FR-24. FR-25 and FR-26 appear in Demo and Presenter Concerns. FR-10 seed alt text is not restated, but it is covered by the PRD §5 reference.
- Mockups: `mockups/` does not exist yet. That is pending, not a defect.
- Finding counts: critical 0, high 4, medium 15, low 16.
