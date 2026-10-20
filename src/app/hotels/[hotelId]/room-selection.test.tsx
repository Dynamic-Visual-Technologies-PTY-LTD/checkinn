import { expect, it, vi } from "vitest";
import { replaceSelectionInUrl } from "./room-selection";

vi.mock("@/features/booking/actions", () => ({ startBooking: vi.fn() }));

it("writes the selection into the URL and drops sq and smart (AD-21)", () => {
  window.history.replaceState(
    null,
    "",
    "/hotels/hotel-001?checkIn=2026-11-13&checkOut=2026-11-15&adults=2&children=0&rooms=1" +
      "&sq=quiet+hotel&smart=1",
  );

  replaceSelectionInUrl([{ roomTypeId: "hotel-001-standard", quantity: 1 }], "2026-11-10");

  expect(`${window.location.pathname}${window.location.search}`).toBe(
    "/hotels/hotel-001?checkIn=2026-11-13&checkOut=2026-11-15&adults=2&children=0&rooms=1" +
      "&sel=hotel-001-standard%3A1",
  );
});
