---
version: alpha
name: CheckInn
description: >-
  Visual identity for CheckInn, a hotel-booking demo. Colour, type, shape and
  spacing tokens are taken from dvtsoftware.com. The product name and logo are
  CheckInn's own and are not part of this token set.
colors:
  primary: "#007FBA"
  primary-strong: "#005A9E"
  secondary: "#00D2D6"
  tertiary: "#FFC300"
  neutral: "#070C14"
  surface: "#070C14"
  on-surface: "#FFFFFF"
  on-surface-muted: "#E5E7E8"
  on-primary: "#FFFFFF"
  on-tertiary: "#070C14"
  outline: "#CED4DA"
typography:
  headline-display:
    fontFamily: Poppins
    fontSize: 48px
    fontWeight: 500
    lineHeight: 1.2
  headline-lg:
    fontFamily: Poppins
    fontSize: 36px
    fontWeight: 600
    lineHeight: 42px
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
  button-primary:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.lg}"
    height: 56px
    padding: 25px
  button-primary-hover:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.lg}"
    height: 56px
    padding: 25px
  button-secondary-hover:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.on-primary}"
  headline-accent:
    textColor: "{colors.primary}"
    typography: "{typography.headline-display}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 25px
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
    padding: 8px
  input-light:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.sm}"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 8px
  divider:
    backgroundColor: "{colors.outline}"
    height: 1px
  accent-rule:
    backgroundColor: "{colors.secondary}"
    height: 2px
---

# CheckInn

## Overview

CheckInn is a hotel-booking demo. It borrows the look of dvtsoftware.com:
a near-black page, white text, one strong blue, and a lot of open space.
The feel is confident and technical rather than cosy. Photography carries
the warmth; the interface stays out of its way.

The audience is a live room of around 200 people, many non-technical, looking
at a projector. That favours large type, high contrast and few elements per
screen over dense layouts.

**Name and logo.** The product is called CheckInn. Its logo is supplied
separately. Do not draw, reuse or imitate the DVT mark, and do not put "DVT"
in the product chrome. Until the logo arrives, set the name as plain text in
`headline-sm` and leave a 40px-high slot to the left of it in the header.

**Where the values come from.** Every token was measured on the live
dvtsoftware.com home page at a 1440px viewport on 2026-10-08. Three things are
adaptations, because the source site is a marketing site and has no booking
UI: the filled `button-primary`, the `input` radius, and the `chip`. Each is
called out below.

## Colors

The theme is dark only. There is one page colour, one text colour and one
brand blue. Cyan and gold are accents and appear rarely.

- **Primary, Brand Blue (#007FBA):** headline colour, link colour, and the
  border on buttons, cards and inputs. It reads at 4.4:1 on the page, so use
  it for text only at 20px and above, or as a border.
- **Primary strong, Deep Blue (#005A9E):** the fill for `button-primary`.
  White text on it reads at 7.1:1. The source site uses this value on its
  consent buttons only; here it is promoted to the main call to action
  because white on Brand Blue falls just short of WCAG AA.
- **Secondary, Cyan (#00D2D6):** the end stop of the headline gradient
  (`linear-gradient(to right, #007FBA, #00D2D6)`), clipped to text. Use it for
  one emphasised phrase per screen and for thin accent rules.
- **Tertiary, Gold (#FFC300):** hover and focus highlight for links and the
  primary button. Never a resting-state colour.
- **Neutral, Midnight (#070C14):** the page background, the header and the
  footer. The header sits at 80% opacity over content.
- **On surface (#FFFFFF) and muted (#E5E7E8):** body text, and secondary
  text such as dates, captions and metadata.
- **Outline (#CED4DA):** hairline dividers and the border of light-surface
  inputs.

The source site defines no error, warning or success colour. None is defined
here. Add them deliberately when booking validation is designed, and check
them against Midnight for contrast.

## Typography

One family throughout: **Poppins**, with a generic sans-serif fallback. It is
an open-licence Google Font, so it can be self-hosted through `next/font`
with no external request at runtime.

- **Display (48px / 500):** one per page, in Brand Blue or white. A second line
  may take the blue-to-cyan gradient.
- **Headlines (36px / 600, 24px / 500, 20px / 600):** section titles, card
  group titles and card titles, in that order.
- **Lead (`body-lg`, 24px / 300):** the light weight is the signature of the
  source site. Use it for the sentence under a headline and for quotes.
- **Body (15px / 400, line height 1.56):** everything else. `body-sm` at 14px
  is for navigation and metadata.
- **Labels:** `label-lg` is button text and is always uppercase with 1.5px
  letter spacing. `label-md` and `label-sm` are uppercase eyebrows above a
  title, such as a category or a hotel's city.

Sizes are the desktop values. Below 768px drop `headline-display` to 26px
with a 1.2 line height and `body-md` to 13px, which is what the source site
does.

## Layout

A fixed-max-width column of **1320px**, centred, with a **15px** gutter on
each side. Below that width the column is fluid.

Sections are separated by generous vertical space: **100px** above a section
and 25px to 50px below it. Inside a section, 25px separates a heading from
its content and 15px separates sibling items. The scale is not a strict 8px
grid; it follows the source site's 15 / 25 / 50 / 100 rhythm, with 4px and
8px for fine adjustment inside components.

The header is 100px tall and stays fixed over the page.

## Elevation & Depth

The design is flat. There are no card shadows. Hierarchy comes from three
things:

- **Borders.** A 1px Brand Blue border marks a card or an input. A 2px Brand Blue
  border marks a button.
- **Translucency.** The header is Midnight at 80% opacity with a barely
  visible `0 0 4px rgba(0, 0, 0, 0.1)` shadow, so imagery shows through as
  the page scrolls.
- **Image against dark.** Photographs sit directly on the page with a 12px
  radius and no frame.

## Shapes

Two radii do almost all the work. **12px** (`md`) for cards and images.
**32px** (`lg`) for buttons, which at a 56px height reads as a pill. **4px**
(`sm`) is for inputs and small controls, and `full` is for chips and avatars.
Do not mix a pill button and a 4px button in the same view.

## Components

- **Primary button.** Deep Blue fill, white uppercase `label-lg` text, 56px
  tall, 25px horizontal padding, 32px radius. One per screen: Search, Book,
  Confirm. On hover the fill turns Gold with Midnight text. This filled
  variant does not exist on the source site.
- **Secondary button.** This is the source site's standard button:
  transparent, a 2px Brand Blue border, white uppercase text, same size and
  radius as the primary. On hover it fills with Deep Blue.
- **Card.** Transparent on the page, 1px Brand Blue border, 12px radius, 25px
  padding. An image at the top takes the full card width and keeps the top
  radius. Title in `headline-sm`; metadata in `body-sm`, muted.
- **Input.** Transparent, 1px Brand Blue border, white text, 38px tall. The
  source site's inputs are square-cornered; a 4px radius is used here so
  they sit comfortably beside pill buttons. `input-light` is the white
  variant with Midnight text and an Outline border, for use on imagery.
- **Chip.** A pill with a 1px Brand Blue border and an uppercase `label-md`
  label, for filters and amenities. Derived from the source site's uppercase
  category labels; it has no direct equivalent there.
- **Accent headline.** The display headline in Brand Blue, as on the source
  site's hero.
- **Link.** Brand Blue, no underline, Gold on hover. Small links inside body
  text are white with an underline instead, because of the contrast limit
  noted under Colors.
- **Header.** Fixed, 100px, translucent Midnight. Logo slot and product name
  on the left, navigation in `body-sm` on the right.
- **Divider and accent rule.** A 1px Outline line between list rows; a 2px
  Cyan rule as an occasional accent under a heading.

## Do's and Don'ts

- Do keep the page Midnight. There is no light theme.
- Do use one primary button per screen and make every other action secondary.
- Do let photography supply colour. Keep interface colour to blue on dark.
- Do use the gradient on at most one phrase per screen.
- Don't use Brand Blue for text smaller than 20px on Midnight.
- Don't use Gold or Cyan as a fill for large areas.
- Don't add drop shadows to cards.
- Don't use the DVT name or logo anywhere in the product. CheckInn has its
  own.
