# Reconcile: seed file vs PRD

Input: `~/Downloads/hotel-booking-demo.json` (`checkinn-workshop-starter`, schema 1.0.0), read with a Node script on 2026-10-09. Checked against `prd-checkinn.md`, `addendum.md`, `.memlog.md`, and `../ux-checkinn/EXPERIENCE.md` for behaviour detail.

Seed facts used below: 6 cities, 12 hotels, 2 room types each (Standard Double sleeps 2 with 1 double bed; Family Room sleeps 4 with 1 double and 2 single beds). Every room type has `wifi` and `private_bathroom`. Every hotel has check-in 14:00, check-out 10:00, `Africa/Johannesburg`, children allowed, smoking not allowed. Only Winelands Family Lodge allows pets. 24 hotel image entries, but only 7 unique URLs.

## A. Claims in the PRD that are false against the file

| # | Severity | Finding | Where the fix lands |
|---|---|---|---|
| A1 | **High** | **"cape" does not return 2 hotels.** FR-3 matches partial text against the province. "cape" hits Western Cape (Cape Town, Stellenbosch) and **Eastern Cape** (Gqeberha), so it returns **6 hotels**: Harbourlight, Table View, Oak & Vine, Winelands, Algoa Bay, Bayview. "Cape Town" and "CAPE TOWN" do return 2. | FR-3 consequence 1 (split it: "Cape Town" → 2; "cape" → 6, or narrow the matching rule). UJ-1 ("She types 'cape' … Two Cape Town hotels appear"). EXPERIENCE Flow 1 step 2–3 carries the same error. |
| A2 | **High** | **Harbourlight is not first for a "cape" search.** FR-7 orders by Review score, then lowest price. Oak & Vine Manor (Stellenbosch) also scores 4.8 and is cheaper (R 1 950 a night, R 3 900 for 2 nights against R 4 900), so it would rank above Harbourlight. With "Cape Town" as the query, Harbourlight is first, which is correct. | UJ-1. Simplest fix: Thandi types "Cape Town" (or picks the city tile). FR-7 stays as it is. |
| A3 | Medium | **The results heading is undefined for partial or cross-city queries.** FR-7's "Cape Town: 2 properties found" presumes the query resolves to one City. For "cape", "Western Cape" or "Waterfront", nothing says what label to show. | FR-7: add a rule, e.g. echo the Guest's text ("'cape': 6 properties found"). UX already defines "All destinations" for an empty query. |
| A4 | Medium | **The photos contradict the facilities.** Several stock photos imply facilities the hotel doesn't have. Capital Courtyard (no pool) shows "Resort exterior and swimming pool". Urban Nest Suites (no pool) shows "Resort swimming pool". Coral Coast Resort (pool) has only bedroom photos. The seed's `hotelImageNote` says the images are illustrative and some are reused (7 unique URLs across 24 slots). FR-13 promises that a hotel without a pool doesn't show one, but its photos can. | FR-10: show an "Illustrative photo" note, or label it per `isIllustrative`. FR-25: name `hotelImageNote` alongside the footer disclaimer. |

Verified true: 6 Cities and 12 Hotels with 2 Room types each (FR-25). An empty Destination with the default Party returns all 12 (FR-2: every Standard Double has inventory of 10 or more). "Waterfront" → Harbourlight only (FR-3). "Western Cape" → Cape Town and Stellenbosch hotels, 4 in total (FR-3). Table View City Lodge Family Room `totalRooms: 0` (FR-5). UJ-1: Harbourlight Standard Double R 2 450 × 2 = R 4 900, and the hotel is non-refundable, 5 stars, 4.8, 248 reviews, V&A Waterfront. UJ-2/FR-20: Coral Coast Family R 2 750 + Standard R 2 200 = R 4 950 × 5 = R 24 750, and the hotel is free-cancellation with a pool. Both Durban hotels can sleep 5 in 2 rooms. The deadline example "12 Nov, 14:00" is consistent with check-in at 14:00. The FR-12 example "4.0 / 5" exists (Capital Courtyard, `reviewScore: 4`). The lowest score is 4.0, so the "below 3.0" and "Pleasant"/"Good" bands are never used by the seed. That is harmless.

## B. Seed fields a guest could see: used, or knowingly unused?

| # | Severity | Field | Status | Where the fix lands |
|---|---|---|---|---|
| B1 | Medium | `cities[].description`, `cities[].image` (url, alt, sourceUrl, `creditInstructions`, `isIllustrative: false`) | **Not in any FR.** EXPERIENCE gives Home "6 city tiles" and a "Photo credits" footer, and traces Home to FR-1/FR-2 only. City images are Wikimedia and carry a **credit obligation** ("use the photographer credit and licence on the source page"). That is a public-repo and expo-display requirement with no FR behind it. | New FR in §4.1 (Home: city tiles with description and image, link to search) plus a consequence that credits are shown per `creditInstructions`. OQ-4 should cover city images as well as hotel images. |
| B2 | Low | `hotels[].images[].licenseUrl`, `provider`, `sourceUrl`, `isIllustrative` | Only OQ-4 mentions licences. No FR says where a credit or licence link appears. Unsplash doesn't require attribution, but the UX "Photo credits" footer has no FR source. | Same new credits consequence (FR-25 or FR-11). |
| B3 | Low | `metadata.imageNote` ("Hotel image URLs have not been checked for current availability") | Covered by FR-11 fallback and OQ-4. | None. Resolved. |
| B4 | Low | `metadata.inventoryNote`, `priceNote`, `ratingsNote`, `isDemo`, `isFictional` | Used: addendum (availability), FR-20 ("Includes taxes. No extra fees."), FR-25 footer. | None. |
| B5 | Low | `hotels[].timeZone` | FR-24 says "South African time" and the addendum hard-codes `Africa/Johannesburg`. Every hotel uses that value, so it's correct, but the field is ignored. | Addendum: read `timeZone` from the hotel. |
| B6 | Low | `cities[].country`, `countryCode` | Unused. FR-9 shows area, City and province, with no country. This is fine for an SA-only dataset. | Knowingly unused: note in addendum. |
| B7 | Low | `cities[].aliases` (only Gqeberha → "Port Elizabeth") | Used by FR-3, but no FR-3 consequence tests it. | FR-3: add "Port Elizabeth" → the 2 Gqeberha hotels. |
| B8 | Low | `amenityLabels` | Used (FR-13, addendum). FR-6 says "up to 3 Facilities" but not which 3. Wi-Fi is on every hotel, so taking the first 3 always spends a slot on it. | FR-6: state the selection rule (seed order, or pool first). |
| B9 | Low | `policies.smokingAllowed: false` (all), Family Room present (all) | Booking.com's facilities list derives "Non-smoking rooms" and "Family rooms" from data like this. FR-13 lists seed amenities only. | Optional FR-13 consequence. Otherwise leave it as knowingly unused. |
| B10 | Low | `hotels[].category`, `description`, `policies.*`, `checkInTime/OutTime`, `reviewScoreMax`, `priceFromPerNight` | Used: FR-6/9/14/12. The addendum says to compute `priceFromPerNight` rather than read it. | None. |

## Resolved by decision (not gaps)

- No breakfast, map, address, review quotes, location score, property-highlight detail, Queen/King beds or adult/child split in the seed. Dropped by the memlog "seed as-is" override (§6).
- Review score is out of 5 (memlog). Labels are re-banded (FR-12).
- Remote Unsplash images with an offline fallback (memlog override; FR-11).
- Two Room types per hotel and 12 hotels, not ~20 (memlog override).
