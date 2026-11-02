import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ListingCard as ListingCardModel } from "@/domain/types";
import { ListingCard, ListingCardSkeleton } from "./listing-card";

const harbourlight: ListingCardModel = {
  hotelId: "hotel-001",
  name: "Harbourlight Retreat",
  category: "luxury",
  starRating: 5,
  area: "V&A Waterfront",
  cityName: "Cape Town",
  reviewScore: 4.8,
  reviewLabel: "Superb",
  reviewCount: 248,
  facilities: ["Swimming pool", "Spa", "Restaurant"],
  cancellation: { kind: "non-refundable", text: "Non-refundable. This booking can't be cancelled." },
  firstImage: {
    url: "https://images.unsplash.com/photo-1?w=1200",
    alt: "Resort exterior and swimming pool",
  },
  nights: 2,
  adults: 2,
  totalRand: 4900,
  nightlyRand: 2450,
};

const href =
  "/hotels/hotel-001?q=Cape+Town&checkIn=2026-11-13&checkOut=2026-11-15&adults=2&children=0&rooms=1";

function renderCard(card: Partial<ListingCardModel> = {}) {
  return render(<ListingCard card={{ ...harbourlight, ...card }} href={href} />);
}

describe("ListingCard", () => {
  it("has the hotel name as its only link, to the Hotel page with the criteria", () => {
    renderCard();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("Harbourlight Retreat");
    expect(links[0]).toHaveAttribute("href", href);
    expect(
      screen.getByRole("heading", { level: 2, name: "Harbourlight Retreat" }),
    ).toBeInTheDocument();
  });

  it("shows See availability as a visual label hidden from screen readers", () => {
    renderCard();

    expect(screen.queryByRole("button", { name: "See availability" })).toBeNull();
    expect(screen.getByText("See availability")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows the photo, category, stars, area and City", () => {
    renderCard();

    expect(
      screen.getByRole("img", { name: "Resort exterior and swimming pool" }),
    ).toBeInTheDocument();
    expect(screen.getByText("luxury")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "5-star hotel" })).toBeInTheDocument();
    expect(screen.getByText("V&A Waterfront, Cape Town")).toBeInTheDocument();
  });

  it("keeps the hotel name on the placeholder when the photo fails", () => {
    renderCard();

    fireEvent.error(screen.getByRole("img", { name: "Resort exterior and swimming pool" }));

    const placeholder = screen.getByRole("img", { name: "Resort exterior and swimming pool" });
    expect(placeholder.tagName).toBe("DIV");
    expect(placeholder).toHaveTextContent("Harbourlight Retreat");
  });

  it("reads the score as a sentence", () => {
    renderCard();

    expect(screen.getByText("Rated 4.8 out of 5, Superb, 248 reviews")).toBeInTheDocument();
    expect(screen.getByText("Superb · 248 reviews")).toHaveAttribute("aria-hidden", "true");
  });

  it("leaves the label out of the score below 3.0", () => {
    renderCard({ reviewScore: 2.9, reviewLabel: null, reviewCount: 1 });

    expect(screen.getByText("Rated 2.9 out of 5, 1 review")).toBeInTheDocument();
  });

  it("lists up to 3 Facilities", () => {
    renderCard();

    const facilities = within(screen.getByRole("list", { name: "Facilities" }));
    expect(facilities.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Swimming pool",
      "Spa",
      "Restaurant",
    ]);
  });

  it("shows Non-refundable, Free cancellation with its deadline, or that it has ended", () => {
    const nonRefundable = renderCard();
    expect(screen.getByText("Non-refundable")).toBeInTheDocument();
    nonRefundable.unmount();

    const open = renderCard({
      cancellation: {
        kind: "free",
        until: "until Wed 11 Nov 2026, 14:00",
        text: "Free cancellation until Wed 11 Nov 2026, 14:00",
      },
    });
    expect(screen.getByText("Free cancellation")).toBeInTheDocument();
    expect(screen.getByText("until Wed 11 Nov 2026, 14:00")).toBeInTheDocument();
    open.unmount();

    renderCard({
      cancellation: { kind: "ended", text: "Free cancellation ended on Wed 11 Nov 2026, 14:00." },
    });
    expect(
      screen.getByText("Free cancellation ended on Wed 11 Nov 2026, 14:00."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Free cancellation")).not.toBeInTheDocument();
  });

  it("shows the stay price and the nightly price, each with a spoken name", () => {
    renderCard();

    expect(screen.getByText("2 nights, 2 adults: from")).toBeInTheDocument();
    expect(screen.getByText("R 4 900")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("4 900 rand")).toHaveClass("sr-only");
    expect(screen.getByText("R 2 450")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("2 450 rand")).toHaveClass("sr-only");
    const nightly = screen.getByText("a night");
    expect(within(nightly).getByText("R 2 450")).toBeInTheDocument();
    expect(nightly).toHaveTextContent(/a night$/);
  });

  it("uses the singular for 1 night and 1 adult", () => {
    renderCard({ nights: 1, adults: 1 });

    expect(screen.getByText("1 night, 1 adult: from")).toBeInTheDocument();
  });

  it("has no Best-fit room line and no Score breakdown on an MVP card", () => {
    renderCard();

    expect(screen.queryByText(/ · sleeps /)).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows the Best-fit room line above the stay line, with no from", () => {
    renderCard({
      adults: 4,
      totalRand: 4000,
      nightlyRand: 2000,
      bestFit: {
        roomTypeId: "hotel-010-family",
        name: "Family Room",
        rooms: 1,
        sleeps: 4,
        nightlyRand: 2000,
        totalRand: 4000,
      },
    });

    const line = screen.getByText("Family Room · 1 room · sleeps 4");
    const stay = screen.getByText("2 nights, 4 adults");
    expect(line).toHaveClass("text-body-sm", "text-on-surface-muted");
    expect(line.compareDocumentPosition(stay) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText(/: from/)).toBeNull();
    expect(screen.getByText("R 4 000")).toBeInTheDocument();
    expect(within(screen.getByText("a night")).getByText("R 2 000")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAccessibleName("Harbourlight Retreat");
  });

  it("says rooms in the plural, sleeping maxGuests × rooms", () => {
    renderCard({
      bestFit: {
        roomTypeId: "hotel-010-standard",
        name: "Standard Room",
        rooms: 2,
        sleeps: 4,
        nightlyRand: 1450,
        totalRand: 5800,
      },
    });

    expect(screen.getByText("Standard Room · 2 rooms · sleeps 4")).toBeInTheDocument();
  });

  it("shows the Score breakdown as a captioned table outside the link, when set", () => {
    renderCard({
      breakdown: { meaning: 0, exact: 0, reviewSignal: 0.75, priceSignal: 0.5, score: 0.1875 },
    });

    const table = screen.getByRole("table", { name: "Score breakdown, Harbourlight Retreat" });
    expect(within(table).getByRole("columnheader", { name: "Score" })).toBeInTheDocument();
    const rows = within(table)
      .getAllByRole("rowheader")
      .map((header) => [header.textContent, header.nextElementSibling?.textContent]);
    expect(rows).toEqual([
      ["Relevance, meaning", "0.00"],
      ["Relevance, exact words", "0.00"],
      ["Review score signal", "0.75"],
      ["Price signal", "0.50"],
      ["Ranking blend score", "0.19"],
    ]);
    const link = screen.getByRole("link");
    expect(link).toHaveAccessibleName("Harbourlight Retreat");
    expect(link.contains(table)).toBe(false);
    expect(table.querySelector("[tabindex], a, button, input")).toBeNull();
  });

  it("shows a placeholder with the name when the Hotel has no photo", () => {
    renderCard({ firstImage: null });

    expect(screen.getByRole("img", { name: "Harbourlight Retreat" })).toBeInTheDocument();
  });
});

describe("ListingCardSkeleton", () => {
  it("is hidden from assistive technology", () => {
    const { container } = render(<ListingCardSkeleton />);

    // The skeleton is aria-hidden, so no role or text can find it.
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
