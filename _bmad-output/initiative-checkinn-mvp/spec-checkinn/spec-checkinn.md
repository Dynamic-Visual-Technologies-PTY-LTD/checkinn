---
id: SPEC-checkinn
companions:
  - ../prd-checkinn/prd-checkinn.md
  - ../architecture-checkinn/architecture-checkinn.md
  - ../../../DESIGN.md
  - ../ux-checkinn/EXPERIENCE.md
sources:
  - ../prd-checkinn/addendum.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# CheckInn MVP

## Why

A vision to realise, and a deadline to meet. CheckInn is the live demo for DVT's AI-DLC workshop at AI Expo Africa 2026. Guests at the stand, on the projector or on their own phones, should go from "I need somewhere to stay in Durban" to a confirmed booking in a few minutes, using a hotel search and booking flow modelled on booking.com. The hotels are fictional and no payment is taken, but the flow behaves for real: a booked room is gone for the next guest. The app is also the base for a later intelligent-search initiative, so search stays basic and replaceable.

## Capabilities

Each capability's testable detail is in the PRD (`prd-checkinn.md`) under the FR numbers given. Behaviour and states are in `EXPERIENCE.md`, and the rules a build must follow are in `architecture-checkinn.md`.

- **CAP-1**
  - **intent:** A Guest starts a search from Home: Destination, dates and Party with defaults, an empty Destination for every Hotel, or one tap on a City tile. The criteria survive reloads and shared links. (FR-1, FR-2, FR-4, FR-27)
  - **success:** With the defaults and no Bookings, an empty search lists all 12 Hotels. A City tile lists only that City's Hotels. Reloading a results URL shows the same results. City photos show their credit.
- **CAP-2**
  - **intent:** A Guest sees the Hotels that match the Destination and have a free Room type for the Stay, each with its whole-stay price, ranked and counted. (FR-3, FR-5–FR-8)
  - **success:** "Cape Town" returns 2 Hotels with Harbourlight Retreat first at "from R 4 900" for 2 nights and 2 adults. "cape" returns 6. A fully booked Hotel is absent. No match shows the no-results guidance.
- **CAP-3**
  - **intent:** A Guest judges a Hotel from one page: stars, area, Review score out of 5, photos, Facilities, house rules and Cancellation policy. Photos degrade to placeholders offline. (FR-9–FR-15)
  - **success:** Every value shown matches the seed. With the network blocked, the page renders fully, with placeholders where the photos would be.
- **CAP-4**
  - **intent:** A Guest compares Room types (beds, capacity, private bathroom, Availability, price for the Stay), picks quantities and sees a running total, with a warning when the Rooms can't sleep the Party. (FR-16–FR-18)
  - **success:** Table View City Lodge's Family Room shows Sold out. Picking 1 Family Room for 5 guests keeps Reserve disabled with the capacity message. Adding a Standard Double enables it.
- **CAP-5**
  - **intent:** Every price is ZAR, tax-inclusive, and identical wherever the same Stay and Party appear. (FR-19, FR-20)
  - **success:** Coral Coast Resort, 1 Family Room plus 1 Standard Double for 5 nights, totals R 24 750 on the room table, the summary and the confirmation.
- **CAP-6**
  - **intent:** A Guest books selected Rooms without payment, gets a Booking reference, and can never cause an oversell or a duplicate Booking. (FR-21, FR-22)
  - **success:** Confirming returns a `CI-` reference and reduces Availability. Two concurrent confirms for the last Room produce one Booking and one "room ran out" outcome. A double submit, a refresh or Back followed by confirming again yields one Booking.
- **CAP-7**
  - **intent:** A Guest finds a Booking by reference and email, and cancels it when the Hotel's Cancellation policy allows. (FR-23, FR-24)
  - **success:** The wrong email and the wrong reference give the same "not found". A Free-cancellation Booking cancels before the 48-hour deadline and frees its Rooms. A Non-refundable or past-deadline Booking offers no cancel.
- **CAP-8**
  - **intent:** The presenter runs the demo from the committed seed and restores it between sessions. (FR-25, FR-26)
  - **success:** After `npm run db:reset`, which works while the app is running, a search returns the same results as a fresh clone, with no Bookings.

## Constraints

- A fresh clone runs with `npm install && npm run dev`: no API keys and no external services. The only runtime network use is seed photos, and every flow works without them.
- One Next.js 16 App Router app with no separate backend and no database server. Data lives in SQLite through `better-sqlite3`. Adding any dependency is ask-first.
- The seed `data/seed/hotel-booking-demo.json` is used unchanged: 6 Cities, 12 fictional Hotels, 2 Room types each, Review score out of 5, remote photos. Anything it can't support is out.
- Money is ZAR, tax-inclusive, in whole rand, formatted `en-ZA`.
- At the expo, one shared instance runs on the presenter's laptop over plain HTTP on the stand Wi-Fi, serving both the projector and visitors' phones. Concurrent confirms must never oversell.
- WCAG 2.1 AA. The app must work by touch on phones and read clearly on a projector, using the dark-only CheckInn brand in `DESIGN.md`.
- The repo is public: no real personal data, no secrets and no committed `.db` file. The app never mentions booking.com.
- Workshop-ready: search matching and ranking sit behind one replaceable function with documented types, so the intelligent-search initiative can swap it out. The seed's mapping to the database is documented.

## Non-goals

- Payment, deposits or card capture.
- Guest accounts, sign-in, or a list of saved Hotels.
- Filters, sort controls, autocomplete, map search or natural-language search, which belongs to the later intelligent-search initiative.
- A Hotel admin interface, email or SMS confirmations, currencies other than ZAR, or more than one rate per Room type.
- Writing reviews.
- Anything the seed lacks: breakfast, maps and street addresses, guest review quotes, Queen and King beds, separate adult and child limits.
- Hosting on Azure.

## Success signal

- A first-time expo visitor reaches a Booking reference on their own phone, without help, in under 3 minutes.
- A full expo day runs on the shared instance with no error shown to any visitor and no restart needed.
