---
version: alpha
name: CheckInn
description: >-
  Visual identity for CheckInn, a hotel-booking demo: colour, type, shape and
  spacing tokens. The product name and logo are not part of this token set.
colors:
  primary: "#007FBA"
  primary-strong: "#005A9E"
  primary-subtle: "#0B2A44"
  secondary: "#00D2D6"
  tertiary: "#FFC300"
  neutral: "#070C14"
  surface: "#070C14"
  on-surface: "#FFFFFF"
  on-surface-muted: "#E5E7E8"
  on-surface-disabled: "#7A828C"
  on-primary: "#FFFFFF"
  on-tertiary: "#070C14"
  outline: "#CED4DA"
  error: "#FF6B6B"
  success: "#3DDC97"
  on-success: "#070C14"
typography:
  headline-display:
    fontFamily: Poppins
    fontSize: 48px
    fontWeight: 500
    lineHeight: 1.2
  headline-display-mobile:
    fontFamily: Poppins
    fontSize: 26px
    fontWeight: 500
    lineHeight: 1.2
  headline-lg:
    fontFamily: Poppins
    fontSize: 36px
    fontWeight: 600
    lineHeight: 42px
  headline-lg-mobile:
    fontFamily: Poppins
    fontSize: 22px
    fontWeight: 600
    lineHeight: 28px
  headline-md:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: 500
    lineHeight: 30px
  headline-sm:
    fontFamily: Poppins
    fontSize: 20px
    fontWeight: 600
    lineHeight: 26px
  body-lg:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: 300
    lineHeight: 32px
  body-md:
    fontFamily: Poppins
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.56
  body-sm:
    fontFamily: Poppins
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.56
  input-mobile:
    fontFamily: Poppins
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label-lg:
    fontFamily: Poppins
    fontSize: 16px
    fontWeight: 500
    lineHeight: 30px
    letterSpacing: 1.5px
  label-md:
    fontFamily: Poppins
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.56
  label-sm:
    fontFamily: Poppins
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.56
  price-lg:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: 600
    lineHeight: 30px
  reference-code:
    fontFamily: Poppins
    fontSize: 36px
    fontWeight: 600
    lineHeight: 42px
    letterSpacing: 3px
rounded:
  none: 0px
  sm: 4px
  md: 12px
  lg: 32px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 15px
  lg: 25px
  xl: 50px
  section: 100px
  gutter: 15px
  container: 1320px
components:
  page:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  header:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    height: 100px
  header-mobile:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    height: 64px
  footer:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
    padding: "{spacing.xl}"
  button-primary:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.lg}"
    height: 56px
    padding: "{spacing.lg}"
  button-primary-hover:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
  button-primary-disabled:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-muted}"
  button-primary-disabled-border:
    backgroundColor: "{colors.on-surface-disabled}"
    width: 2px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.lg}"
    height: 56px
    padding: "{spacing.lg}"
  button-secondary-border:
    backgroundColor: "{colors.primary}"
    width: 2px
  button-secondary-hover:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.on-primary}"
  icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
    size: 44px
  icon-button-border:
    backgroundColor: "{colors.primary}"
    width: 2px
  focus-ring:
    backgroundColor: "{colors.tertiary}"
    width: 2px
  focus-ring-on-light:
    backgroundColor: "{colors.primary-strong}"
    width: 2px
  headline-accent:
    textColor: "{colors.primary}"
    typography: "{typography.headline-display}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  card-border:
    backgroundColor: "{colors.primary}"
    width: 1px
  card-border-hover:
    backgroundColor: "{colors.tertiary}"
    width: 1px
  card-title:
    textColor: "{colors.on-surface}"
    typography: "{typography.headline-sm}"
  card-meta:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    height: 38px
    padding: "{spacing.sm}"
  input-mobile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.input-mobile}"
    rounded: "{rounded.sm}"
    height: 44px
    padding: "{spacing.sm}"
  input-border:
    backgroundColor: "{colors.primary}"
    width: 1px
  input-light:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.sm}"
  input-light-border:
    backgroundColor: "{colors.neutral}"
    width: 1px
  input-error:
    textColor: "{colors.error}"
    typography: "{typography.body-sm}"
  input-error-border:
    backgroundColor: "{colors.error}"
    width: 1px
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  chip-border:
    backgroundColor: "{colors.primary}"
    width: 1px
  divider:
    backgroundColor: "{colors.outline}"
    height: 1px
  accent-rule:
    backgroundColor: "{colors.secondary}"
    height: 2px
  search-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
    height: 72px
  search-bar-border:
    backgroundColor: "{colors.primary}"
    width: 1px
  popover:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  popover-border:
    backgroundColor: "{colors.primary}"
    width: 1px
  sheet:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    padding: "{spacing.md}"
  dialog:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
    width: 480px
  dialog-border:
    backgroundColor: "{colors.primary}"
    width: 1px
  calendar-day:
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    size: 44px
  calendar-day-selected:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    size: 44px
  calendar-day-selected-ring:
    backgroundColor: "{colors.on-surface}"
    width: 2px
  calendar-day-in-range:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.on-surface}"
  calendar-range-outline:
    backgroundColor: "{colors.primary}"
    width: 1px
  calendar-day-disabled:
    textColor: "{colors.on-surface-disabled}"
  stepper-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
    size: 44px
  score-badge:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  star-rating:
    textColor: "{colors.on-surface}"
    size: 16px
  listing-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  price-total:
    textColor: "{colors.on-surface}"
    typography: "{typography.price-lg}"
  price-nightly:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
  city-tile:
    textColor: "{colors.on-surface}"
    typography: "{typography.headline-sm}"
    rounded: "{rounded.md}"
  hotel-header:
    textColor: "{colors.on-surface}"
    typography: "{typography.headline-lg}"
  review-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  facility-list:
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  room-table:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
  room-table-header:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-md}"
  booking-summary:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  mobile-summary-bar:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    padding: "{spacing.md}"
    height: 72px
  step-indicator-active:
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
  step-indicator-inactive:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-sm}"
  alert-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  alert-error-border:
    backgroundColor: "{colors.error}"
    width: 1px
  alert-success:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  alert-success-border:
    backgroundColor: "{colors.success}"
    width: 1px
  notice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  notice-border:
    backgroundColor: "{colors.primary}"
    width: 1px
  badge-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-success}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  reference-block:
    textColor: "{colors.on-surface}"
    typography: "{typography.reference-code}"
  image-placeholder:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.headline-sm}"
    rounded: "{rounded.md}"
  skeleton:
    backgroundColor: "{colors.primary-subtle}"
    rounded: "{rounded.md}"
  photo-viewer:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
  toast:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  icon:
    textColor: "{colors.on-surface}"
    size: 20px
---

# CheckInn

## Overview

CheckInn is a hotel-booking demo. The look is a near-black page, white
text, one strong blue, and a lot of open space.
The feel is confident and technical rather than cosy. Photography carries
the warmth; the interface stays out of its way. The words carry warmth too:
the interface looks technical, but the microcopy talks like a person (see the
Voice and Tone section in `_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md`). When photos can't load offline,
the copy still carries that warmth.

There are two audiences at once. A presenter drives the app on a projector
for a room of around 200 people, many non-technical. Visitors also try it on
their own phones. That favours large type, high contrast and few elements per
screen on desktop, and comfortable touch targets on mobile. Where the two
conflict, the projector wins on desktop widths and the phone wins below 768px.
Projectors crush near-blacks together, so any surface that must be seen as
separate from the page gets a border, not just a darker or lighter fill.

The layout and flow follow booking.com (search bar, results list, hotel page,
availability table, reserve). The look does not: CheckInn stays dark, flat
and blue.

This file extends the original root `DESIGN.md`, preserved as
`_bmad-output/initiative-checkinn-mvp/ux-checkinn/imports/DESIGN-repo-root.md`. Every root token and rule is kept. The only
change to a root rule is that mobile body text stays at 15px.

Borders are tokenised as their own components, named `{component}-border`.
Each has a `backgroundColor` for the stroke colour and a `width`, following
the root `divider` pattern. The linter accepts no border keys inside a
component.

**Name and logo.** The product is called CheckInn. Its logo is a wordmark:
"Check" in a heavy sans-serif, then a check mark standing in for the "I" and
"nn" in a blue-to-cyan gradient. Three files, all with transparent
backgrounds:

- `public/logo/checkinn-logo-on-dark.webp`: white "Check". Use this one on
  Midnight, which is everywhere in the app.
- `public/logo/checkinn-logo-on-light.webp`: near-black "Check". For light
  backgrounds such as documents and slides.
- `public/logo/checkinn-icon.png`: the icon, a square mark of the check
  and one arch of the "n" in the same gradient. It works on dark and light.
  Use it where the wordmark does not fit: favicon, app icon, avatar, or a
  header narrower than 480px.

The browser and home-screen icons are generated from the icon and are already
wired up: `src/app/favicon.ico`, `src/app/apple-icon.png`, and the two
`android-chrome-*.png` files in `public/logo/` listed in
`src/app/manifest.webmanifest`. Regenerate all of them together if the icon
changes.

Show the logo 40px high in the header, with its accessible name set to
"CheckInn home". Do not redraw, recolour or stretch it, and do not set the
name in text beside it.

## Colors

The theme is dark only. There is one page colour, one text colour and one
brand blue. Cyan and gold are accents and appear rarely. Coral and mint carry
status and appear only where something went wrong or right.

- **Primary, Brand Blue (#007FBA):** headline colour and the border on
  buttons, cards, inputs, popovers and dialogs. It reads at 4.43:1 on the
  page, so use it for text only at 24px and above, or 19px bold and above.
  Every link smaller than that is white and underlined. As a border it is
  4.43:1 against Midnight and 3.32:1 against Night Blue, so it passes the 3:1
  rule for non-text contrast on both.
- **Primary strong, Deep Blue (#005A9E):** the fill for `button-primary`, the
  review score badge and the check-in and check-out days in the calendar.
  White text on it reads at 7.1:1. It is used instead of Brand Blue because
  white on Brand Blue falls just short of WCAG AA. Against Midnight it is only
  2.76:1, so a Deep Blue shape that must be seen as a state gets a white ring
  (`calendar-day-selected-ring`).
- **Primary subtle, Night Blue (#0B2A44):** a quiet raised surface for the
  calendar days between check-in and check-out, the booking summary panel, the
  mobile summary bar, the image placeholder, skeletons and toasts. White text
  on it reads at 14.7:1. Against Midnight it is only 1.33:1, so Night Blue is
  never the only cue. Panels and bars get a 1px Brand Blue border, and the
  calendar range gets `calendar-range-outline`. Never use it for a whole page
  or section, and never as a button fill.
- **Secondary, Cyan (#00D2D6):** the end stop of the headline gradient
  (`linear-gradient(to right, #007FBA, #00D2D6)`), clipped to text. Use it for
  one emphasised phrase per screen and for thin accent rules, including the
  current step in the step indicator.
- **Tertiary, Gold (#FFC300):** hover highlight for links, cards and the
  primary button, and the focus ring. Never a resting-state colour, so never
  stars, warnings or badges. The focus ring has a 2px offset, so a Midnight gap
  separates it from a Gold-filled hovered button. On a white surface the focus
  ring is Deep Blue (`focus-ring-on-light`).
- **Neutral, Midnight (#070C14):** the page background, the header and the
  footer. The header sits at 80% opacity over content. Cards, inputs, chips,
  alerts and secondary buttons also take a Midnight fill (`surface`), which
  reads as transparent on the page.
- **On surface (#FFFFFF) and muted (#E5E7E8):** body text, and secondary
  text such as dates, captions and metadata.
- **On surface disabled (#7A828C):** past and unavailable calendar days, and
  the border of a disabled primary button. Not for any text a guest needs to
  read.
- **Outline (#CED4DA):** hairline dividers between list rows.
- **Error, Coral (#FF6B6B):** 7.1:1 on Midnight. Field error text, the 1px
  border of an invalid input, the border and icon of `alert-error`, and the
  "Sold out" text. Never a fill.
- **Success, Mint (#3DDC97):** 11.1:1 on Midnight. The confirmation tick, the
  border and icon of `alert-success`, and the "Free cancellation" badge, where
  it is a fill with Midnight text.

There is no warning colour. "Only 2 left", "Non-refundable" and similar
cautions are white text with a warning icon, so Gold keeps its single job.

## Typography

One family throughout: **Poppins**, with a generic sans-serif fallback. It is
an open-licence Google Font, so it can be self-hosted through `next/font`
with no external request at runtime.

- **Display (48px / 500):** one per page, in Brand Blue or white. A second line
  may take the blue-to-cyan gradient. Home's hero uses it.
- **Headlines (36px / 600, 24px / 500, 20px / 600):** section titles, card
  group titles and card titles, in that order. A hotel name is `headline-lg`
  on the Hotel page and `headline-sm` on a listing card. `headline-md` is for
  section titles inside a page, such as "Availability" and "Guest reviews".
- **Lead (`body-lg`, 24px / 300):** the light weight is a signature of the
  look. Use it for the sentence under a headline, for quotes, and for the first
  sentence of a hotel description.
- **Body (15px / 400, line height 1.56):** everything else. `body-sm` at 14px
  is for navigation and metadata.
- **Price (`price-lg`, 24px / 600):** the stay total on listing cards, room
  rows and the booking summary. The nightly price sits under it in `body-sm`,
  muted. The total is always the bigger number.
- **Reference (`reference-code`, 36px / 600, 3px tracking):** the Booking
  reference on the confirmation page, so it can be read off a projector.
- **Labels:** `label-lg` is button text and is always uppercase with 1.5px
  letter spacing. `label-md` and `label-sm` are uppercase eyebrows above a
  title, such as a category or a hotel's city, and the room table's column
  headers. Uppercase is applied with CSS `text-transform`. The source strings
  stay in sentence case, so screen readers don't spell them out.

Sizes are the desktop values. Below 768px, `headline-display` becomes
`headline-display-mobile` (26px) and `headline-lg` becomes
`headline-lg-mobile` (22px), so the two levels stay distinct. Body text stays
15px at every width. Inputs use `input-mobile` (16px) on phones so the
browser does not zoom on focus.

Prices use the South African format, "R 4 900", with non-breaking spaces, so
an amount never wraps across lines.

Fixed line heights and component heights are minimums. Text must be able to
grow, under user text-spacing settings or zoom, without clipping.

## Layout

A fixed-max-width column of **1320px**, centred, with a **15px** gutter on
each side. Below that width the column is fluid.

Sections are separated by generous vertical space: **100px** above a section
and 25px to 50px below it. Inside a section, 25px separates a heading from
its content and 15px separates sibling items. The scale is not a strict 8px
grid; it follows a 15 / 25 / 50 / 100 rhythm, with 4px and 8px for fine
adjustment inside components.

**Breakpoints:** phone below 768px, tablet 768–1023px, desktop 1024px and
above. Every screen must also work at 320px wide (WCAG reflow).

The header is 100px tall and stays fixed over the page. Below 768px it is 64px.
It stops being fixed when the viewport is less than 500px tall, so landscape
phones and heavy zoom keep their content area.

Page layouts:

- **Home:** display headline and lead, the search bar across the full
  container width, then the "Explore a city" section with city tiles in a
  3-column grid (2 on tablet, 1 on phone).
- **Search results:** the search bar at the top, a result count headline,
  then listing cards in a single column. On desktop a listing card is
  horizontal: photo on the left at about one third of the width, details in
  the middle, price and the call to action on the right. On tablet it stays
  horizontal but narrower. On phone the photo sits on top. On phone the search
  bar collapses into a one-line summary ("Cape Town · 13–15 Nov · 2 adults")
  that expands to the full search bar when tapped, so the first result is
  visible without scrolling.
- **Hotel page:** the hotel header, then photos (one large and one smaller
  beside it on desktop, stacked on phone). Below them the review panel and
  facilities sit side by side on desktop and stack on smaller screens. Then
  the description and house rules, then the availability section. The
  availability section starts with the step indicator, the "Availability"
  heading and the Stay and Party picker, then the room table. On desktop the
  booking summary sits to the right of the room table and stays in view while
  the guest scrolls the table. On tablet the summary moves under the table. On
  phone it becomes the mobile summary bar.
- **Booking details, confirmation and booking view:** two columns on desktop,
  with the main content on the left (form, confirmation message or booking
  status) and the booking summary on the right. One column on tablet and
  phone, with the summary first on Booking details and after the reference on
  the confirmation page.

## Elevation & Depth

The design is flat. There are no card shadows. Hierarchy comes from three
things:

- **Borders.** A 1px Brand Blue border marks a card, an input, a popover, a
  dialog, the booking summary and the mobile summary bar. A 2px Brand Blue
  border marks a secondary button or an icon button.
- **Translucency.** The header is Midnight at 80% opacity with a barely
  visible `0 0 4px rgba(0, 0, 0, 0.1)` shadow, so imagery shows through as
  the page scrolls.
- **Image against dark.** Photographs sit directly on the page with a 12px
  radius and no frame.

Popovers (calendar, occupancy picker) and dialogs use the same Midnight with a
1px Brand Blue border, and no shadow. Behind a dialog, the page is dimmed with
Midnight at 70% opacity. The photo viewer and phone sheets cover the page in
solid Midnight.

## Shapes

Two radii do almost all the work. **12px** (`md`) for cards, images, the
search bar, popovers, dialogs, the room table and the booking summary. **32px**
(`lg`) for buttons, which at a 56px height reads as a pill. **4px** (`sm`) is
for inputs, small controls and the score badge. `full` is for chips, calendar
days, stepper and icon buttons, and avatars. Do not mix a pill button and a
4px button in the same view.

## Components

Every component listed here also has a behavioural rule in `_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md`
Component Patterns. Visual composition references: `_bmad-output/initiative-checkinn-mvp/ux-checkinn/mockups/` (see
`_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md` Information Architecture). This file wins on conflict.

- **Primary button.** Deep Blue fill, white uppercase `label-lg` text, a
  minimum height of 56px, 25px horizontal padding, 32px radius. One per
  screen: Search, Reserve, Confirm booking, Find booking. On hover the fill
  turns Gold with Midnight text. Disabled: Midnight fill, muted text, a 2px
  disabled-grey border, no hover. It keeps its pill shape, so it stays visible
  inside the Night Blue summary.
- **Secondary button.** Midnight fill, a 2px Brand Blue border, white
  uppercase text, same size and radius as the primary. On hover it fills with
  Deep Blue.
- **Icon button.** A 44px circle with a 2px Brand Blue border and a 20px white
  icon. Used for save (heart, filled white when saved), share, close, photo
  viewer previous and next, and COPY. Gold border on hover.
- **Icons.** One hand-made set of simple 20px line icons with a 1.5px stroke
  and rounded caps, in white, stored as inline SVG in the repo. No icon
  library. The set covers: location pin, calendar, person, search, heart,
  share, close, chevron left and right, plus, minus, check, warning, error,
  bed, shower, Wi-Fi, pool, spa, restaurant, parking, gym, snowflake (air
  conditioning), meeting room, kitchenette, play area, copy. Icons beside text
  are decorative; icons alone have an accessible name.
- **Card.** Midnight fill, 1px Brand Blue border, 12px radius, 25px padding.
  An image at the top takes the full card width and keeps the top radius.
  Title in `headline-sm`; metadata in `body-sm`, muted.
- **Input.** Midnight fill, 1px Brand Blue border, white text, a minimum
  height of 38px on desktop and 44px on phone (`input-mobile`). The 4px radius
  lets inputs sit comfortably beside pill buttons. Each input has a visible
  `body-sm` label above it. `input-light` is the white variant with Midnight
  text and a 1px Midnight border, for use on imagery. Invalid: 1px Coral
  border, and the message under it in `body-sm` Coral with an error icon.
- **Chip.** A pill with a 1px Brand Blue border and an uppercase `label-md`
  label. Used for a Hotel's Facilities on listing cards and for the "We Price
  Match" badge. Facility chips are display only.
- **Accent headline.** The display headline in Brand Blue, for a page hero.
- **Link.** Brand Blue only at 24px and above. Every smaller link, including
  "Manage booking" in the header, the footer links and "Manage this booking",
  is white with an underline, and turns Gold on hover.
- **Header.** Fixed, 100px, translucent Midnight. Logo on the left, "Manage
  booking" in `body-sm` on the right. 64px on phone, with the icon instead of
  the wordmark below 480px.
- **Footer.** Midnight, muted `body-sm`, 50px padding. One line: "CheckInn is
  a demo. Hotels, prices and reviews are fictional. Photos are illustrative. No payment is taken."
  Below it, a "Photo credits" link.
- **Divider and accent rule.** A 1px Outline line between list rows; a 2px
  Cyan rule as an occasional accent under a heading.
- **Search bar.** One 12px-radius container with a 1px Brand Blue border,
  holding three fields side by side (Destination, Dates, Occupancy) and the
  primary Search button at the right end. Each field has a small muted
  `body-sm` label above its value, an icon on the left, and a clear (×) icon
  button on Destination when it has text. 1px Brand Blue dividers separate the
  fields. On phone the fields stack and the button runs full width, or the bar
  collapses to its summary line on Search results.
- **Popover and sheet.** A popover is a Midnight panel with a 1px Brand Blue
  border and a 12px radius, anchored under its field. A sheet covers the whole
  screen in Midnight, with a title and a close icon button at the top and a
  full-width secondary DONE button pinned to the bottom.
- **Dialog.** Centred, at most 480px wide, Midnight with a 1px Brand Blue
  border and a 12px radius, 25px padding, over the dimmed page. It has a
  `headline-sm` title, body text and buttons right-aligned (stacked full width
  on phone). Used for the price-match explanation, the share fallback and the
  cancel confirmation.
- **Range calendar.** In a popover on desktop with two months side by side; in
  a sheet on phone, with months stacked in a scrolling list. Days are 44px
  circles in `label-sm`, filling one seventh of the width with a 40px minimum
  at 320px. Check-in and check-out are Deep Blue with white text and a 2px
  white ring. The days between are Night Blue, joined into one band with a 1px
  Brand Blue outline. The white ring sits inside the circle, so the focus
  ring's 2px offset leaves a Midnight gap between white and Gold. Past days
  and days beyond the 30-night limit are disabled grey with a strikethrough.
  Today has a 2px Cyan underline. Each month title has an icon button beside
  it: previous on the left month, next on the right month (both on the one
  month of a phone sheet's header row). The previous button on the current
  month is disabled, with the disabled-grey border and icon. The footer shows
  "2 nights · Fri 13 Nov – Sun 15 Nov" and a "Done" secondary button. On a
  phone sheet the footer is pinned with a 1px Brand Blue top border. While the
  calendar is open, its Dates field shows a 2px Cyan accent rule along its
  bottom edge. The same applies to the Occupancy field while its picker is
  open. Composition reference: `_bmad-output/initiative-checkinn-mvp/ux-checkinn/mockups/key-calendar.html`.
- **Occupancy picker.** A popover under the Occupancy field, or a sheet on
  phone. One row each for Adults, Children and Rooms: label on the left, then a
  44px circular minus button, the number in `headline-sm`, and a 44px circular
  plus button. A button at its limit shows the disabled-grey border and icon.
- **Stay and Party picker.** On the Hotel page: the search bar container
  without Destination and without a button. It holds only Dates and Occupancy.
- **Score badge.** A 4px-radius Deep Blue square with the score in white
  `label-md` ("4.8"), followed by the label ("Superb") and the review count
  in muted `body-sm`.
- **Star rating.** White stars, 16px, as many as the Star rating. White,
  not Gold, because Gold is never a resting colour.
- **Listing card.** A card with a horizontal layout on desktop and tablet:
  - the photo
  - details: category eyebrow, name, stars, area and City, score badge, up to
    3 Facility chips, the cancellation line
  - the price block: stay summary in muted `body-sm`, the total in
    `price-lg`, the nightly price in muted `body-sm`, and a "See
    availability" label styled as a secondary button

  The hotel name is the link, and its click area is stretched over the whole
  card. The border turns Gold on hover.
- **City tile.** The city photo with a 12px radius, the city name in
  `headline-sm` and "2 hotels" in muted `body-sm` on a Midnight gradient at
  the bottom of the image. The photo credit sits underneath in small muted
  text. If the photo fails, the tile keeps its Night Blue placeholder and the
  overlay text.
- **Hotel header.** The category eyebrow, then the hotel name in
  `headline-lg`, stars beside it, then "Area, City, Province" in `body-md`
  with a pin icon. On the right on desktop, or below on phone: the save and
  share icon buttons, the "We Price Match" chip, and a secondary SEE ROOMS
  button.
- **Review panel.** A card with a "Guest reviews" `headline-md` title, the
  score badge followed by "/ 5", then the label and review count. Below 3.0
  the label is omitted.
- **Facilities list.** A "Most popular facilities" `headline-md` title, then
  each Facility as an icon plus its seed label in `body-md`, in two columns
  on desktop and one on phone.
- **House rules.** A definition list: Check-in "From 14:00", Check-out "Until
  10:00", Children, Pets, Smoking, and Cancellation, each with a `label-md`
  term and a `body-md` value.
- **Room table.** A 12px-radius container with a 1px Brand Blue border.
  Column headers in uppercase muted `label-md`: Room type, Sleeps, Price for
  N nights, Rooms. Rows are divided by 1px Outline lines. The room name is
  `headline-sm`. Beds, bathroom and Wi-Fi sit under it as icon plus `body-sm`
  lines. "Sleeps N" shows N person icons with the number. Quantity is a
  select with the input style. Below 768px each row becomes its own card with
  the same content stacked.
- **Booking summary.** A Night Blue panel with a 1px Brand Blue border and a
  12px radius. It holds:
  - hotel name, dates and nights, party
  - each booking line, then a divider
  - the total in `price-lg`
  - "Includes taxes. No extra fees." in muted `body-sm`
  - the cancellation line
  - the primary button for that step
- **Mobile summary bar.** Below 768px, a Night Blue bar fixed to the bottom
  of the screen, with a 1px Brand Blue top border and a minimum height of 72px.
  It shows "1 room · R 4 900,00" in `label-md` on the left and the primary
  button on the right. Tapping the summary text expands the full booking
  summary as a sheet.
- **Cancellation line.** "Free cancellation" as a Mint `badge-success` pill,
  with "until Wed 11 Nov 2026, 14:00" in `body-sm` beside it.
  "Non-refundable" as white text with a warning icon.
- **Step indicator.** An ordered list across the top of the booking flow:
  "1 Your selection", "2 Your details", "3 Confirmation". The current step is
  white `label-md` with a 2px Cyan accent rule under it; others are muted
  `label-sm`.
- **Notice.** A Midnight card with a 1px Brand Blue border and an info icon.
  Used for neutral guidance such as "Select dates to see this property's
  availability and prices."
- **Alerts.** `alert-error` and `alert-success` are Midnight cards with a 1px
  Coral or Mint border, a matching icon on the left and white text.
- **Error summary.** An `alert-error` at the top of a form: a `headline-sm`
  title ("2 details need fixing"), then a list of white underlined links, one
  per problem.
- **Reference block.** On the confirmation page: a muted `label-md` eyebrow
  "Booking reference", the reference in `reference-code`, and a COPY icon
  button beside it.
- **Skeleton.** Night Blue blocks with a 12px radius in the shape of the
  content they stand for. No shimmer when reduced motion is set; otherwise a
  slow pulse.
- **Image placeholder.** Night Blue with a 1px Brand Blue border and the
  hotel or city name centred in muted `headline-sm`, at the exact size and
  radius of the photo it replaces.
- **Photo viewer.** Full-screen Midnight, the photo centred and contained,
  the counter "1 / 2", previous and next icon buttons, and close at the top
  right.
- **Toast.** A small Night Blue panel with a 1px Brand Blue border and white
  `body-sm` text. It appears at the bottom centre, or above the mobile summary
  bar when that is showing. Used for short confirmations such as "Link
  copied".

## Do's and Don'ts

- Do keep the page Midnight. There is no light theme.
- Do use one primary button per screen and make every other action secondary.
- Do let photography supply colour. Keep interface colour to blue on dark.
- Do use the gradient on at most one phrase per screen.
- Do show the stay total larger than the nightly price, everywhere.
- Do keep touch targets at least 44px on phone.
- Do give every surface that must stand apart from the page a border.
- Don't use Brand Blue for text smaller than 24px (19px bold) on Midnight.
- Don't use Night Blue as the only thing separating a surface or state from
  the page.
- Don't use Gold or Cyan as a fill for large areas.
- Don't use Gold for stars, warnings or any resting state.
- Don't use Coral or Mint as a background behind body text.
- Don't add drop shadows to cards.
