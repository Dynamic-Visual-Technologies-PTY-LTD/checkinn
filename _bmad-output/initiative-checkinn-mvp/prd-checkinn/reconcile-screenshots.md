# Reconcile: booking.com screenshots vs PRD

Inputs: `~/Downloads/image (1).png` (Most popular facilities), `image (2).png` (hotel header, gallery, review panel, map, property highlights), `image (3).png` (Availability table without dates), `image (4).png` (search bar). Checked against `prd-checkinn.md`, `.memlog.md` and `../ux-checkinn/EXPERIENCE.md`.

## Element inventory

| Screenshot | Element | Status |
|---|---|---|
| 4 Search bar | Destination with bed icon | FR-1 |
| | Clear (×) on Destination | Not in PRD. EXPERIENCE defines it. Fine. |
| | Dates "Check-in date — Check-out date" | FR-1 |
| | Occupancy "2 adults · 0 children · 1 room" with chevron | FR-1 (default matches) |
| | Search button | FR-1 |
| | Yellow-bordered bar on a blue band | Brand not copied (§5) |
| 2 Header | Star rating | FR-9 |
| | "Travel Proud" badge | **Silently missing** (low) |
| | Hotel name | FR-9 |
| | Pin + full address | Area/City/province only. Address dropped by decision. |
| | "Excellent location – show map", "Railway access" | Dropped by decision (map, location score) |
| | Heart (save), share | FR-9 |
| | Reserve (primary) | Replaced by secondary "See rooms" (memlog: UX feedback) |
| | "We Price Match" | FR-15 |
| | Tab bar along the top edge (blue underline) | Not in PRD. Rejected in EXPERIENCE (Inspiration & Anti-patterns). Fine. |
| 2 Gallery | 1 large + 2 medium + 5 thumbnails + "+93 photos" | FR-10 (2 photos). "+N photos" dropped by decision. |
| 2 Review panel | Label + score badge + review count | FR-12 (/5) |
| | "Guests who stayed here loved" quote with reviewer and country | Dropped by decision |
| | "Excellent location!" 9.7 | Dropped by decision |
| 2 Map | "Show on map" | Dropped by decision |
| 2 Property highlights | Six cards with icon, title and detail | Dropped by decision. Facilities list instead (§6). |
| 1 Facilities | "Most popular facilities" with icons | FR-13 |
| | Pool, parking, Wi-Fi, spa | FR-13 (seed labels) |
| | **"Family rooms", "Non-smoking rooms"** | **Silently missing.** Derivable from seed (every hotel has a Family Room; `smokingAllowed: false`). |
| | 24-hour front desk, tea/coffee, bar | No data. Unaddressed but harmless. |
| | "Fabulous breakfast" (dashed underline = tooltip) | Dropped by decision (breakfast) |
| 3 Availability | "Availability" heading | Implied by §4.4. Not named. |
| | "We Price Match" repeated here | **Silently missing** (FR-15 shows it once, in the header) |
| | Red "Select dates to see this property's availability and prices" | FR-16 |
| | Dates + occupancy + Search inline | FR-16 |
| | Columns "Room type" / "Number of guests" / action | FR-17 (more columns) |
| | Room type name as an **expandable link** (orange caret) opening room details | **Silently missing** |
| | Bed line with bed icon, "1 extra-large double bed" | FR-17 (Single/Double only, by decision) |
| | Person icons "3 adults + 2 children" with an info tooltip | FR-17 "Sleeps N". Adult/child split dropped by decision. |
| | Per-row "Show prices" button when no dates | **Differs.** FR-16 lists rows without prices and gives no per-row prompt. |
| | Accessible room row ("Roll-in Shower") | No data |

## Gaps

| # | Severity | Gap | Where the fix lands |
|---|---|---|---|
| S1 | Medium | **No dates means no call to action per row.** The screenshot has a "Show prices" button on every row that pulls the Guest into picking dates. FR-16 only says rows show "without prices or quantity selectors", which leaves a dead-looking table on shared links. | FR-16: add a per-row "Show prices" (or similar) that focuses the date picker. |
| S2 | Medium | **"Family rooms" and "Non-smoking rooms" are not in Facilities.** Both are visible in the reference and are true for every seed hotel, derived from `roomTypes` and `policies.smokingAllowed`. FR-13 limits the list to seed amenity labels, so the list is thinner than the data allows. Only some hotels have the "pool" signal the brief cares about. | FR-13: optional consequence for derived facilities. Or record "derived facilities not shown" in §6. |
| S3 | Low | **No room-type detail.** In the reference, the Room type name opens a detail panel. The seed has no room photos or size, so there is little to show beyond beds, sleeps and amenities, which the row already shows. | §6: add "Room-type detail panel (no room photos or size in seed)". |
| S4 | Low | **"We Price Match" appears only once.** The reference repeats it on the Availability heading. | FR-15: say where it appears (header only is fine). |
| S5 | Low | **The "Travel Proud" badge is not mentioned.** It's a booking.com programme badge with no seed data. | §6: one line, or ignore. |

## Resolved by decision (not gaps)

- Map, address, "Excellent location", location score, "Railway access": no seed data (memlog).
- Review quote, reviewer and country: no seed data (memlog).
- Property highlights with detail text: Facilities list instead (memlog, §6).
- "+93 photos" and a five-thumbnail strip: seed has 2 photos (memlog, §6).
- Breakfast facility: dropped (memlog, OQ-3).
- King / extra-large double beds: Single/Double only (memlog).
- Adult/child split in "Number of guests": capacity is total Guests (memlog).
- Score 9.1/10: seed score is out of 5 (memlog).
- Header Reserve → secondary "See rooms" (memlog, UX finalize).
- Booking.com colours, yellow search border, blue band: own brand (§5). The hotel-page tab bar is rejected in EXPERIENCE.
