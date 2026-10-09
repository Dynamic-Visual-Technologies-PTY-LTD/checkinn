# Reconcile: booking.com reference screenshots -> spines

The screenshots are the reference for layout and flow only. The look (white page, yellow search border, green facility icons, solid blue table header) is different on purpose: resolved by decision (.memlog: dark Midnight theme stays).

Screens: (4) search bar · (2) hotel header, gallery, review panel, map, property highlights · (1) Most popular facilities · (3) Availability section without dates.

## Made it into the spines

- **Search bar (4):** one container with Destination, Dates and Occupancy fields, each with an icon on the left and a small label above, plus Search at the right end. Occupancy shows "2 adults · 0 children · 1 room".
- **Hotel header (2):** stars, name, heart, share, Reserve, "We Price Match".
- **Review panel (2):** score badge, "Superb" and the review count.
- **Most popular facilities (1):** an icon plus a label for each facility.
- **Availability (3):** heading, the "Select dates to see this property's availability and prices" notice, an inline dates and occupancy picker above the table, Room type rows with the bed configuration and a bed icon, and the capacity column.
- **Flow:** search, results, hotel page, rooms, reserve.

## Gaps (dropped silently or only partly carried)

| # | Severity | Reference element | Gap | Where it should land |
|---|---|---|---|---|
| 1 | Medium | (2) Header actions cluster: heart, share and **solid primary Reserve** top right, with "We Price Match" under it | Placement and button weight are not specified. Copying the reference makes header Reserve a second primary, which breaks the one-primary rule. The heart and share icon buttons have no visual spec: size, border, or `aria-pressed` styling. | DESIGN.md Layout > Hotel page (header block) and Components: an icon-button spec, header Reserve as secondary, and the price-match badge position. |
| 2 | Medium | (2) Review panel **beside the gallery** (right column) | DESIGN Layout places the review panel *below* the photos, beside the facilities. This deviates from the reference and is not logged. With review quotes, location score and map gone (by decision), the right column would hold only the score. That is probably why it moved, but this is not recorded. | Log a decision in .memlog, or put the score card back in the gallery's right column on desktop. |
| 3 | Medium | (2) Section **tab bar** above the header (Overview / Info & prices / Facilities / House rules...; a thin blue underline marks the active tab) | Dropped silently. On a long Hotel page this is the reference's main way around the page. The spines replace it only with the header RESERVE scroll. | EXPERIENCE IA / Component Patterns: drop it deliberately (logged), or add a simple anchor nav (Overview, Facilities, House rules, Availability). |
| 4 | Medium | (4) **Mobile/collapsed search bar** is implied. Booking.com collapses the bar on results pages on phones | The spine stacks all three fields plus a full-width SEARCH on Search results on a phone. That pushes the first listing card below the fold. Not addressed. | EXPERIENCE Responsive (< 768px): on Search results, show a one-line criteria summary ("Cape Town · 13–15 Nov · 2 adults") that expands into the bar. |
| 5 | Low | (4) Destination **clear (x) button**; occupancy **chevron**; Dates value shown as "Check-in date — Check-out date" | All silently absent. The empty and filled display format of the Dates field is not defined (for example "Fri 13 Nov — Sun 15 Nov"). | DESIGN.md Components > Search bar, and EXPERIENCE Search bar pattern. |
| 6 | Low | (3) Availability picker has its own **Search** button | The spine has a live refresh with no button. This deviates from the reference and is not logged (see reconcile-prd #6). | EXPERIENCE Availability picker plus a .memlog decision. |
| 7 | Low | (3) "Select dates..." notice in **red with an error icon** | The spine has the copy but no styling. Copying the reference would make it Coral, which DESIGN reserves for errors. | EXPERIENCE State Patterns > Hotel page without dates: white text plus an info icon (not `alert-error`). |
| 8 | Low | (3) **Person icons** for capacity ("3 + 2" adults + children, with an info icon) | FR-17 requires "Sleeps N with person icons". The DESIGN Room table has a "Sleeps" column but no icon spec or accessible name ("Sleeps 4"). The adults/children split was dropped by decision. | DESIGN.md Components > Room table. |
| 9 | Low | (3) Room name as an **underlined link** plus an orange **disclosure triangle** (expand room details); per-row **"Show prices"** button when no dates are set | Silently dropped. The spine shows rows without prices and focuses the picker on RESERVE. Probably right, since the seed has little room detail, but it is not recorded. | .memlog: one line saying room detail and "Show prices" are dropped. |
| 10 | Low | (3) "We Price Match" **repeated** beside the Availability heading | The spine places the badge once (position not stated). | DESIGN Layout > Hotel page: decide on once or twice. |
| 11 | Low | (2) **"Travel Proud"** badge next to the stars | Silently dropped (no seed data). Fine to drop. | Optional .memlog line. |

## Dropped on purpose (resolved by decision)

PRD §6 and .memlog cover these:

- Map and "Show on map" panel, full street address, "Excellent location - show map", "Railway access": no seed data. Area, City and province only.
- Guest review quote ("Guests who stayed here loved", reviewer name and flag): dropped.
- Location score ("Excellent location! 9.7"): dropped.
- Property highlights cards with detail text ("Rooftop, Infinity, Pool bar"): replaced by the Most popular facilities list.
- "+93 photos" thumbnail strip and 5-image mosaic: 2 photos per Hotel. One large and one smaller, with a full-screen viewer.
- "Fabulous breakfast" (facility with a dashed-underline tooltip): breakfast is not in the seed (PRD Open Q3).
- King and extra-large double beds in room names and beds: the seed has Single and Double only.
- Score on a 10-point scale (9.1): CheckInn uses a 5-point scale (PRD glossary, FR-12).
- Yellow search border, white page, green icons, solid blue table header, blue hero band: the look is CheckInn's own dark theme.
