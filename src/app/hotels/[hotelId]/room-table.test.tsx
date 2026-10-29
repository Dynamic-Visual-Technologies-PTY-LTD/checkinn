import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RoomOption } from "@/domain/types";
import { formatZar } from "@/lib/format";

/** Intl separates digit groups with non-breaking spaces; text matchers see plain spaces. */
const sp = (text: string) => text.replace(/\s/g, " ");
import { RoomTable } from "./room-table";

const openDates = vi.hoisted(() => vi.fn());
vi.mock("./stay-party-picker", () => ({ useDatesField: () => ({ open: openDates, focus: vi.fn() }) }));

const rooms: RoomOption[] = [
  {
    id: "std",
    name: "Standard Double",
    maxGuests: 2,
    bedsLabel: "1 double bed",
    amenities: [
      { key: "wifi", label: "Free Wi-Fi" },
      { key: "private_bathroom", label: "Private bathroom" },
    ],
    nightlyRand: 2450,
  },
  {
    id: "fam",
    name: "Family Room",
    maxGuests: 4,
    bedsLabel: "1 double bed, 2 single beds",
    amenities: [],
    nightlyRand: 3000,
  },
];

function renderTable(
  availability: Record<string, number> | null,
  selection = [] as { roomTypeId: string; quantity: number }[],
  onQuantityChange = vi.fn(),
  bestFitRoomTypeId: string | null = null,
) {
  render(
    <RoomTable
      rooms={rooms}
      nights={availability ? 2 : null}
      availability={availability}
      selection={selection}
      onQuantityChange={onQuantityChange}
      bestFitRoomTypeId={bestFitRoomTypeId}
    />,
  );
  return onQuantityChange;
}

describe("RoomTable with dates", () => {
  it("shows the headers, the price for one room and the nightly price", () => {
    renderTable({ std: 10, fam: 4 });

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Room type",
      "Sleeps",
      "Price for 2 nights",
      "Rooms",
    ]);
    expect(screen.getByRole("heading", { level: 3, name: "Standard Double" })).toBeInTheDocument();
    expect(screen.getByText("1 double bed")).toBeInTheDocument();
    expect(screen.getByText("Private bathroom")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sleeps 2" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sleeps 4" })).toBeInTheDocument();
    expect(screen.getByText(sp(formatZar(4900)))).toBeInTheDocument();
    expect(screen.getByText(`${sp(formatZar(2450))} a night`)).toBeInTheDocument();
    expect(screen.getByText("4 900 rand")).toBeInTheDocument();
  });

  it("offers 0 to Availability in a select named for the Room type", () => {
    renderTable({ std: 10, fam: 4 });

    const select = screen.getByRole("combobox", { name: "Rooms of Standard Double" });
    expect(within(select).getAllByRole("option")).toHaveLength(11);
    expect(
      within(screen.getByRole("combobox", { name: "Rooms of Family Room" })).getAllByRole("option"),
    ).toHaveLength(5);
  });

  it("reports a change and shows the chosen quantity", () => {
    const onChange = renderTable({ std: 10, fam: 4 }, [{ roomTypeId: "std", quantity: 1 }]);

    const select = screen.getByRole("combobox", { name: "Rooms of Standard Double" });
    expect(select).toHaveValue("1");
    fireEvent.change(select, { target: { value: "3" } });
    expect(onChange).toHaveBeenCalledWith("std", 3);
  });

  it("flags 3 or fewer left", () => {
    renderTable({ std: 3, fam: 4 });

    expect(screen.getByText("Only 3 left")).toBeInTheDocument();
    expect(screen.queryByText(/Only 4 left/)).not.toBeInTheDocument();
  });

  it("shows sold out with no select and only the nightly price", () => {
    renderTable({ std: 10, fam: 0 });

    expect(screen.getByText("Sold out for your dates")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Rooms of Family Room" })).toBeNull();
    expect(screen.getByText(`${sp(formatZar(3000))} a night`)).toBeInTheDocument();
    expect(screen.queryByText(sp(formatZar(6000)))).toBeNull();
  });
});

describe("RoomTable without dates", () => {
  it("lists Room types with no prices or selects, and Show prices opens the calendar", () => {
    renderTable(null);

    expect(screen.getByRole("heading", { level: 3, name: "Family Room" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByText(/R\s?\d/)).toBeNull();
    const buttons = screen.getAllByRole("button", { name: "Show prices" });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    expect(openDates).toHaveBeenCalledTimes(1);
  });
});

describe("RoomTable row headers and the Best-fit chip", () => {
  it("makes each Room type name its row's header", () => {
    renderTable({ std: 10, fam: 4 });

    const headers = screen.getAllByRole("rowheader");
    expect(headers).toHaveLength(2);
    expect(headers[0]).toHaveAttribute("scope", "row");
    expect(
      within(headers[0]).getByRole("heading", { level: 3, name: "Standard Double" }),
    ).toBeInTheDocument();
    expect(
      within(headers[1]).getByRole("heading", { level: 3, name: "Family Room" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Best fit for your search")).toBeNull();
  });

  it("puts the chip in the Best-fit row's header and describes its Rooms select by it", () => {
    renderTable({ std: 10, fam: 4 }, [], vi.fn(), "fam");

    const [standard, family] = screen.getAllByRole("rowheader");
    const chip = within(family).getByText("Best fit for your search");
    expect(chip).toHaveAttribute("id", "best-fit-chip-fam");
    expect(within(standard).queryByText("Best fit for your search")).toBeNull();
    expect(screen.getByRole("combobox", { name: "Rooms of Family Room" })).toHaveAccessibleDescription(
      "Best fit for your search",
    );
    expect(
      screen.getByRole("combobox", { name: "Rooms of Standard Double" }),
    ).not.toHaveAttribute("aria-describedby");
  });

  it("keeps the chip on its row when the selection is elsewhere", () => {
    renderTable({ std: 10, fam: 4 }, [{ roomTypeId: "std", quantity: 2 }], vi.fn(), "fam");

    expect(
      within(screen.getAllByRole("rowheader")[1]).getByText("Best fit for your search"),
    ).toBeInTheDocument();
  });
});
