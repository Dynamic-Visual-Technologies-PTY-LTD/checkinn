# Source digest: inherited visual identity and MVP behaviour

Extracted 2026-10-15 from:

- the root `DESIGN.md`
- `_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md`
- the MVP `mockups/`

This file is for distillation only. The spines win on any conflict.

## DESIGN.md: what Smart search inherits

### Theme and colours

The theme is dark only. There is no light theme.

| Token | Value | Use |
|---|---|---|
| `primary` | #007FBA | borders. As text only at 24px+ |
| `primary-strong` | #005A9E | fills |
| `primary-subtle` | #0B2A44 | skeleton, toast. Always paired with a border |
| `secondary` | Cyan #00D2D6 | gradient on at most one phrase per screen, and thin accent rules |
| `tertiary` | Gold #FFC300 | hover and focus only |
| `surface` | #070C14 | |
| `on-surface` | #FFF | |
| `on-surface-muted` | #E5E7E8 | |
| `error` | Coral | text and borders only |
| `success` | Mint | |

There are no warning or info colours. A notice is `primary` border + info icon.

### Type

Everything is Poppins.

- Buttons use `label-lg`, which is uppercase via CSS.
- Chips use `label-md` (14/600, uppercase).
- Body text uses `body-md` 15 and `body-sm` 14.
- Mobile inputs use `input-mobile` 16.

### Shape and spacing

- Corner radius: sm 4, md 12, lg 32, full.
- Spacing: xs 4, sm 8, md 15, lg 25, xl 50.

### Existing components to reuse

- `search-bar` (72px, md radius, 1px primary border, three fields plus a primary Search button)
- `chip` (full radius, 1px primary, `label-md`; display only today)
- `card` and `listing-card`
- `input` (38px) and `input-mobile` (44px)
- `button-primary` (one per screen) and `button-secondary`
- `icon-button` (44px)
- `focus-ring` (Gold, 2px, 2px offset)
- `popover`, `sheet` and `dialog`
- `notice` (primary border + info icon; not dismissible, never takes focus)
- `toast` (`role=status`, 5s)
- `alert-error`
- `skeleton` (slow pulse, off under reduced motion)
- `score-badge`
- `accent-rule`

There is **no** segmented control, radio group, tab or toggle token. The MVP rejected a tab bar on the Hotel page.

### Do's and Don'ts

- One primary button per screen.
- Gradient on one phrase per screen at most.
- No Gold or Cyan large fills.
- Every surface has a border.
- No drop shadows.
- 44px touch targets.
- Don't mix pill and 4px buttons in one view.
- Flat "blue on dark". (Inference: no sparkles or glows.)

## MVP EXPERIENCE.md: what Smart search inherits

### Foundation

- Responsive web on Next.js.
- No UI library. Tailwind with DESIGN tokens, and hand-made inline SVG icons.
- There are two audiences: the projector wins on desktop, and phones win below 768px.

### Information architecture

- The search bar appears on Home and Search results only.
- On phone Search results it starts collapsed to a summary line, "Cape Town · 13–15 Nov · 2 adults", and expands on tap.
- Criteria live in the URL. A change pushes a new URL.
- Overlays never stack.

### Voice

- Warm, plain South African English.
- Say what happened, then what to do next.
- No exclamation marks, except "You're booked!".
- No fake urgency.
- Example: "Nothing matches that search. Try another city, other dates or fewer rooms."
- Buttons are short verbs in sentence case in the source.
- Prices are "R 4 900" (whole rand, with non-breaking spaces).
- Dates are "Fri 13 Nov 2026".

### States

- Loading: 3 skeleton listing cards, and the search bar stays usable.
- No results: the h1 "Nothing matches that search." plus city tiles.
- Invalid input: a Coral message under the field, and focus moves to the first invalid field.
- Server error: `alert-error` reading "Something went wrong on our side. Try again."

### Accessibility

- WCAG 2.1 AA.
- Visible labels.
- A polite live region only for in-place updates.
- After navigation, focus goes to the result-count h1.
- No meaning by colour alone.
- 44×44 targets.
- Reflow at 320px.
- Motion under 200ms, and none with reduced motion.

### Breakpoints

| Name | Width | Overlays |
|---|---|---|
| phone | under 768 | sheets |
| tablet | 768–1023 | popovers |
| desktop | 1024 and up | |

Projector check at 1280×720, at 125% and 150% zoom.

### Banned

- Infinite scroll.
- Hover-only controls.
- Opening on focus.
- A modal on top of a modal.

## Mockups

- `key-home.html`: desktop and phone.
- `key-search-results.html`: desktop, and the No results alternate. There is no phone mockup of the collapsed bar.
- `key-hotel.html`: includes the phone room table as stacked cards.
- `key-calendar.html`.
- `key-booking-details.html`.
- `key-confirmation.html`.

## Conflicts with the PRD to resolve in the spines

1. **Price format.** PRD copy "Max R2,000 / night" must follow MVP voice: "Max R 2 000 per night".
2. **Removable chips.** They are new: a 44px target and the accessible name "Remove Max R 2 000 per night".
3. **Ranking-mode control.** It has no existing token. A new component is needed, or an existing pattern reused.
4. **Announcements.** The result-count h1 receives focus after navigation. Streamed Match reasons need a quieter announcement strategy.
