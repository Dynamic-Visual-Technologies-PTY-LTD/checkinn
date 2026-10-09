# CheckInn PRD — Addendum

Detail that belongs downstream (architecture, UX, tickets) rather than in the PRD body.

## Technical direction (for `bmad-architecture`)

- **Database:** SQLite through `better-sqlite3`, as the PM asked. `AGENTS.md` already lists SQLite + `better-sqlite3` (with Drizzle ORM) as agreed but not installed. Installing it is an "ask first" dependency change.
- **Seed:** the source is `hotel-booking-demo.json` (supplied at `~/Downloads/hotel-booking-demo.json`). It has to be committed to the repo so the app runs from a fresh clone. The file is fictional and flagged `isDemo: true`, so it is safe for a public repo. A seed script loads it into SQLite. The same script, run again, implements FR-26 reset.
- **Seed shape → tables:** `cities` (id, name, aliases, province, image) → `hotels` (cityId, area, category, starRating, reviewScore /5, reviewCount, amenities[], images[], check-in and check-out times, timeZone, policies incl. cancellation.type) → `roomTypes` (maxGuests, beds[{type, count}], pricePerNight, totalRooms, amenities[]). Bookings and booking lines are new tables the app owns.
- **Availability:** the seed's `inventoryNote` says `totalRooms` is static. Availability per Room type per Night = `totalRooms` − rooms in Confirmed Bookings whose Stay covers that Night. Confirm (FR-22) must check and insert in one transaction so concurrent bookings cannot oversell.
- **`priceFromPerNight`** in the seed duplicates the minimum Room type price. Prefer computing it so the two can't drift.
- **Images:** remote Unsplash URLs (`images.unsplash.com`). If `next/image` is used, the host must be allowed in `next.config.ts`, which is an "ask first" change. The FR-11 fallback is needed either way.
- **Cancellation deadline:** check-in date + Hotel `checkInTime` in `Africa/Johannesburg`, minus 48 hours.

## UX decisions that touch implementation

- **UX contract:** `../ux-checkinn/DESIGN.md` (look; promoted to the repo root) and `../ux-checkinn/EXPERIENCE.md` (behaviour, states, flows), with mocks in `../ux-checkinn/mockups/`.
- **Icons:** a hand-made set of about 25 inline SVG line icons in the repo. No icon library, so no new dependency.
- **Font:** Poppins self-hosted through `next/font`, so no runtime request.

## Formatting notes

- `Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 })` gives "R 4 900". Without the digit limit it gives "R 4 900,00". The separators are non-breaking spaces, so tests must normalise them or match with `\s`.
- Seed `amenityLabels` provide the display text for Facilities and Room amenities.

## Research digest (background, 2026-10-09)

- Booking.com shows the total for the Stay first and the nightly rate second, next to the number of nights and guests.
- The Star rating (1–5) and the guest Review score are separate and must not be merged.
- SA consumer prices are normally tax-inclusive (VAT 15%). The 1% TOMSA tourism levy is optional for properties. The seed says "no extra demo fees", so no levy line.

## Decisions considered and set aside

- **Live map (OpenStreetMap):** rejected, needs internet. A static map was chosen at first, then dropped because the seed has no address or coordinates.
- **AI-generated committed photos:** chosen at first, replaced by the seed's remote Unsplash URLs. The trade-off: photos need internet, so FR-11 adds a fallback.
- **~20 Hotels, 3–6 Room types, Queen/King beds, breakfast, review quotes:** from the first draft. Dropped when the PM chose to use the seed file as-is.
- **Booking.com 1–10 score:** set aside for the seed's 5-point scale.
