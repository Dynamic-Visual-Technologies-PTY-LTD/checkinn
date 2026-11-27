---
version: alpha
status: final
updated: 2026-10-19
name: CheckInn Smart Search
description: >-
  Visual delta for Smart search on top of the CheckInn identity in the root
  DESIGN.md. Only new or changed tokens are listed here; every reference such
  as {colors.primary} resolves against the root file.
sources:
  - .memlog.md
  - .working/source-digest.md
  - ../prd-smart-search/prd-smart-search.md
  - ../../../DESIGN.md
  - ../../initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md
# No new colors, typography, rounded or spacing tokens. Smart search uses the
# root scales unchanged. Only components are added or changed.
components:
  smart-search-box:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs}"
    height: 56px
  smart-search-box-mobile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.input-mobile}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs}"
    height: 56px
  smart-search-box-border-start:
    backgroundColor: "{colors.primary}"
    width: 2px
  smart-search-box-border-end:
    backgroundColor: "{colors.secondary}"
    width: 2px
  smart-search-label:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
  smart-search-placeholder:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-md}"
  smart-search-submit-disabled:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-disabled}"
    rounded: "{rounded.full}"
    size: 44px
  smart-search-submit-disabled-border:
    backgroundColor: "{colors.on-surface-disabled}"
    width: 2px
  smart-search-counter:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
  smart-search-status:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
  spinner:
    textColor: "{colors.on-surface}"
    size: 20px
  example-query-lead:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
  example-query:
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    height: 44px
  criteria-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.md}"
    height: 44px
  criteria-chip-border:
    backgroundColor: "{colors.primary}"
    width: 1px
  criteria-chip-border-hover:
    backgroundColor: "{colors.tertiary}"
    width: 1px
  weak-match-heading:
    textColor: "{colors.on-surface}"
    typography: "{typography.headline-lg}"
  weak-match-heading-mobile:
    textColor: "{colors.on-surface}"
    typography: "{typography.headline-lg-mobile}"
  weak-match-hint:
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
  match-reason-label:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-sm}"
  match-reason:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-md}"
  match-reason-skeleton:
    backgroundColor: "{colors.primary-subtle}"
    rounded: "{rounded.sm}"
    height: 24px
  best-fit-room:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
  best-fit-note:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
  score-breakdown:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  score-breakdown-border:
    backgroundColor: "{colors.primary}"
    width: 1px
---

# CheckInn Smart Search: Design delta

Workshop defaults accepted by the user on 2026-10-15, review fixes and user decisions applied on 2026-10-19; tune freely during the build.

## Brand & Style

This file extends the root `DESIGN.md` (`../../../DESIGN.md`). It does not restate it. Every token, rule and component in the root still applies, and **the root wins for anything this file does not state**. References such as `{colors.primary}` and `{typography.label-md}` resolve against the root tokens. Linted alone, this file shows those references as broken; merged into the root frontmatter, it lints with no errors or warnings.

Smart search should look like CheckInn, not like a bolted-on AI product. It keeps the flat blue-on-dark look, the Poppins type and the bordered surfaces. The one new visual signal is the blue-to-cyan gradient the brand already owns, used on the border of the Smart search box. There is no sparkle, glow, shimmer, robot or "AI" badge anywhere (user decision).

**This delta amends one root rule.** The root allows the blue-to-cyan gradient only clipped to text (one emphasised phrase per screen) and as thin accent rules. Smart search adds a third use: a 2px gradient border on the Smart search box (user decision). The one-gradient-per-screen limit counts this border; the logo's "nn" is exempt, as it is on every screen. When this delta is merged, the Secondary bullet in the root Colors section takes the same wording.

When no Provider is configured, the Smart search box is not rendered and every screen looks exactly as the root `DESIGN.md` describes.

Key-screen mocks: [Home with Smart search](mockups/key-home-smart.html), [Smart search results](mockups/key-results-thandi.html), [Weak match and unknown place](mockups/key-results-weak.html), [Hotel page with Best-fit room](mockups/key-hotel-bestfit.html). **The spines win on conflict with any mock.**

## Colors

No new colors. The changes are in where the existing ones are used.

- **The gradient on the Smart search box.** The box has a 2px border in the root gradient `linear-gradient(to right, #007FBA, #00D2D6)`, from `{colors.primary}` (`smart-search-box-border-start`) to `{colors.secondary}` (`smart-search-box-border-end`). This is a user decision and a declared amendment (see Brand & Style). The linter has no gradient value, so the two stops are tokenised as two border components, and this prose is the rule.
- **One gradient per screen.** Neither the shipped Home hero ("Find your stay." in Brand Blue, `src/app/page.tsx`) nor Search results has any other gradient, so the box border is the only gradient on both screens.
- **Contrast of the border.** Both stops pass the 3:1 non-text rule against Midnight: Brand Blue at 4.43:1, Cyan at 10.4:1. The gradient is the field's boundary and is legible along its whole length.
- **Forced colours.** Gradients disappear in Windows forced-colours mode, so the box falls back to a solid 2px `CanvasText` border on `Canvas`: `@media (forced-colors: active) { border-color: CanvasText; background: Canvas; }`.
- **Muted text for supporting Smart search copy.** The box label, the Match reason, the Best-fit room line, the booking summary note, the counter, the status text and the Example queries lead-in use `{colors.on-surface-muted}`, so they never compete with the hotel name or price.
- **Disabled submit.** While `aria-disabled`, the submit takes the root disabled treatment: a `{colors.on-surface-disabled}` border and icon (`smart-search-submit-disabled`), no Gold hover.
- **No Gold at rest.** Gold `{colors.tertiary}` stays hover and focus only, including on Criteria chips and Example queries.

## Typography

No new type tokens; each component's role is in the frontmatter. Rules not stated elsewhere:

- The Smart search box text is `{typography.input-mobile}` on phone, so the browser does not zoom on focus.
- The label "Describe your stay" is muted `{typography.body-sm}`, like the Search bar field labels, but sits outside the box.
- Criteria chip text is uppercase through CSS like every chip; the source string stays sentence case ("Max R 2 000 per night"). Chip text is sized in `rem`, so text resizing applies.
- The score breakdown is not monospace.

## Layout & Spacing

Root scale and breakpoints unchanged. Smart search adds these placements:

- **Home.** Inside the hero: headline, lead, then the label and Smart search box, then the Example queries, then the Search bar, all across the full container width. `{spacing.sm}` (8px) between the box and the Example queries, `{spacing.md}` (15px) between the Example queries and the Search bar. [Mock](mockups/key-home-smart.html)
- **Search results, desktop and tablet.** Top to bottom: Smart search box, Search bar, the Criteria chip row, the result heading (with the rephrase line under a Weak-match heading), any Notices, then the Listing cards. `{spacing.md}` between box, bar and chip row; `{spacing.sm}` between chips; `{spacing.lg}` (25px) above the heading; `{spacing.sm}` between the heading and the rephrase line; `{spacing.md}` above the Notices and `{spacing.sm}` between them; `{spacing.lg}` above the first card. [Mock](mockups/key-results-thandi.html)
- **Search results, phone.** The Smart search box is always visible, full width, at the top. The collapsed Search bar summary line sits under it, then the chips, which wrap onto more lines rather than scrolling sideways (user decision on this order). Then the heading, Notices and cards in the desktop order.
- **Box height.** A minimum of 56px with one line, growing to two lines of text before it scrolls inside itself. The text area scrolls, never the box: the box has no `overflow: hidden`, so the focus ring is never clipped. Heights are minimums, as in the root.
- **Narrow or enlarged text.** Below 360px, or whenever the text area would be narrower than about 15 characters, the magnifier is dropped and the clear and submit buttons move to a row under the text area, right-aligned, `{spacing.xs}` below it. The text area then grows to four lines before it scrolls inside itself.
- **Listing card additions.** See Components, Listing card (changed).

## Shapes

- The Smart search box uses `{rounded.md}` (12px), matching the Search bar under it, so the two read as one search area.
- Criteria chips are `{rounded.full}` pills like every chip.
- Each Match reason skeleton line is `{rounded.sm}`, because a 12px radius on a 24px line reads as a pill.
- The score breakdown table uses `{rounded.sm}`, which marks it as a small tool rather than guest content.

## Components

Components not listed here are unchanged from the root. Behaviour for each is in `EXPERIENCE.md` under the same name.

- **Smart search box.** A `{colors.surface}` field with the 2px blue-to-cyan gradient border and a 12px radius. Anatomy, left to right:
  - a 20px search (magnifier) icon from the root icon set, decorative
  - the text area, a native textarea with no border or fill of its own, one line growing to two, with the placeholder "Try: quiet hotel with a pool in Cape Town this weekend" in `smart-search-placeholder`
  - the Smart search clear (×), an `icon-button`, shown only when there is text
  - the Smart search submit, an `icon-button` (44px circle, 2px Brand Blue border, white search icon; `smart-search-submit-disabled` while `aria-disabled`). It is not a second primary button; the Search bar's Search stays the one primary on the screen.

  The icon buttons sit 6px inside the border, so their own focus rings never touch the gradient. The visible label "Describe your stay" sits above the box in `smart-search-label`. The gradient is on the border only, never on the label or the text (user decision for the gradient border).

  Focus: while the text area has keyboard focus, the root Gold `focus-ring` with its 2px offset goes around the whole box, outside the gradient. It uses `:has(textarea:focus-visible)`, not `:focus-within`, so it does not double up with a button's ring. The textarea's own outline is removed only together with this ring. Hover: no change; the gradient border does not turn Gold. [Mock](mockups/key-home-smart.html)
- **Character counter.** "250 / 300" in `smart-search-counter`, right-aligned under the box. The element is always present but visible only from 250 characters.
- **Submitting status.** The text stays read-only and keeps its colour. The submit `icon-button` swaps its search icon for a 20px `spinner`, a new icon in the root's line style (1.5px stroke, rounded caps, a three-quarter circle). "Reading your search…" shows under the box in `smart-search-status`. Under reduced motion the spinner does not rotate. The gradient border never animates. [Mock](mockups/key-home-smart.html)
- **Example queries.** Under the box on Home: the lead-in "Try an example" in `example-query-lead`, then the three Queries as text buttons in the root Link style (white, underlined, `{typography.body-sm}`, Gold on hover), each at least 44px tall, wrapping onto more lines, `{spacing.md}` apart. No chip outline, so they are not confused with Facility or Criteria chips, and no new colour. [Mock](mockups/key-home-smart.html)
- **Criteria chip.** A new removable chip, distinct from the display-only Facility `chip` (user decision). A button styled as a pill: `{colors.surface}` fill, 1px Brand Blue border (`criteria-chip-border`), uppercase `label-md` text, then a 20px close (×) icon pinned at the end. Minimum height 44px, 15px horizontal padding. The label may wrap inside the chip, start-aligned, with the × kept on the first line's end; the non-breaking spaces sit only inside "R 2 000" (user decision for the price copy). On hover the border turns Gold (`criteria-chip-border-hover`), like an icon button. [Mock](mockups/key-results-thandi.html)
- **Notices.** Smart search uses the root `notice` unchanged: Midnight card, 1px Brand Blue border, info icon, not dismissible. They sit after the result heading. At most two stack, `{spacing.sm}` apart. [Mock](mockups/key-results-weak.html)
- **Fallback notice.** The root `notice` with the fallback copy and, after the text, a **Try again** `button-secondary` (Midnight fill, 2px Brand Blue border, uppercase). On desktop the button sits at the notice's right end; on phone it sits under the text, `{spacing.md}` below it. It is a secondary button, so the Search bar's Search stays the screen's one primary. [Mock](mockups/key-results-thandi.html)
- **Weak-match heading.** The page heading in `weak-match-heading` (`weak-match-heading-mobile` below 768px), white, the same style as the result-count headline. Never Brand Blue, so it never meets the 24px Brand Blue text rule. The rephrase line "Try describing it another way." sits under it in `weak-match-hint`, the root lead style. [Mock](mockups/key-results-weak.html)
- **Listing card (changed).** The Match reason block sits directly under the hotel name (user decision). The Best-fit room line sits in the price block, above the stay summary and total. The score breakdown, when on, sits at the bottom of the card across its full width. [Mock](mockups/key-results-thandi.html)
- **Match reason.** Under the hotel name on a Listing card: the label "Why it matches" in `match-reason-label`, then the sentence in `match-reason`, wrapping freely (usually one or two lines). No icon and no AI label (user decision). While it loads, two `match-reason-skeleton` lines, `{spacing.xs}` apart and the second at about 60% width, hold its place under the label, with the root skeleton pulse, which is off under reduced motion. [Mock](mockups/key-results-thandi.html)
- **Best-fit room line.** "Family Room · 1 room · sleeps 4" in `best-fit-room`, at the top of the price block. Under Smart search the price below it is the Best-fit room's price. [Mock](mockups/key-results-thandi.html)
- **Room table (changed).** The pre-selected row carries the Best-fit chip beside the Room type name, inside the room-name cell. No other visual change.
- **Best-fit chip.** The root display-only `chip` reading "Best fit for your search". Its label may wrap inside the chip, like Criteria chips. It stays on that row if the Guest changes the selection (user decision). No new token. [Mock](mockups/key-hotel-bestfit.html)
- **Booking summary (changed).** While the pre-selection is untouched, the note "Family Room picked for your search. Change it in the table." in `best-fit-note` sits above the total. [Mock](mockups/key-hotel-bestfit.html)
- **Score breakdown.** Shown only with the server debug flag. A small table at the bottom of each Listing card: `score-breakdown` fill and text, a 1px Brand Blue border (`score-breakdown-border`, the root's border for a separate surface), `{rounded.sm}` corners, rows divided by the root `divider`. Its caption and small type mark it as a tool.

## Do's and Don'ts

- Do keep one gradient per screen: the Smart search box border is it on Home and Search results; the hero has none.
- Do keep the Search bar's Search as the only primary button. The Smart search submit is an icon button and Try again is a secondary button.
- Do write prices in chips as "Max R 2 000 per night", with non-breaking spaces only inside "R 2 000", and let the label wrap.
- Do keep Match reasons, the Best-fit room line and Smart search status text muted.
- Don't use sparkles, glows, shimmer, robot icons, "AI" badges or animated gradients anywhere in Smart search.
- Don't put the gradient on the label, the placeholder or the typed text.
- Don't drop the × from a Criteria chip so that it looks like a Facility chip; a removable chip must look removable.
- Don't style the Example queries as chips.
- Don't add a sort, ranking or blend control. There is no visual for one (user decision).
- Don't show the score breakdown without the server debug flag.
