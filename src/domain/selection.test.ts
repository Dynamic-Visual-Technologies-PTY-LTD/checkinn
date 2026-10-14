// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  clampSelection,
  loweredMessage,
  partyFitMessage,
  reserveBlock,
  roomRanOutMessage,
  roomCount,
  roomPriceRand,
  selectionCapacity,
  selectionTotalRand,
  summaryLines,
  summaryTriggerLabel,
  withQuantity,
  type SelectableRoom,
} from "./selection";

const rooms: SelectableRoom[] = [
  { id: "std", name: "Standard Double", maxGuests: 2, nightlyRand: 2450 },
  { id: "fam", name: "Family Room", maxGuests: 4, nightlyRand: 3000 },
];

describe("clampSelection", () => {
  it("cuts quantities to Availability and reports what it lowered", () => {
    const result = clampSelection(
      [
        { roomTypeId: "std", quantity: 5 },
        { roomTypeId: "fam", quantity: 1 },
      ],
      rooms,
      new Map([
        ["std", 2],
        ["fam", 4],
      ]),
    );
    expect(result.selection).toEqual([
      { roomTypeId: "std", quantity: 2 },
      { roomTypeId: "fam", quantity: 1 },
    ]);
    expect(result.lowered).toEqual([{ roomTypeId: "std", name: "Standard Double", from: 5, to: 2 }]);
  });

  it("drops unknown and sold-out Room types, in the Hotel's order", () => {
    const result = clampSelection(
      [
        { roomTypeId: "other-hotel-std", quantity: 1 },
        { roomTypeId: "fam", quantity: 2 },
        { roomTypeId: "std", quantity: 1 },
      ],
      rooms,
      { std: 3, fam: 0 },
    );
    expect(result.selection).toEqual([{ roomTypeId: "std", quantity: 1 }]);
    expect(result.lowered).toEqual([{ roomTypeId: "fam", name: "Family Room", from: 2, to: 0 }]);
  });

  it("treats no selection as empty", () => {
    expect(clampSelection(null, rooms, { std: 3 })).toEqual({ selection: [], lowered: [] });
  });
});

describe("totals", () => {
  const selection = [
    { roomTypeId: "std", quantity: 2 },
    { roomTypeId: "fam", quantity: 1 },
  ];

  it("prices one Room for the Stay", () => {
    expect(roomPriceRand(rooms[0], 2)).toBe(4900);
  });

  it("builds a line per selected Room type and totals them", () => {
    const lines = summaryLines(selection, rooms, 2);
    expect(lines).toEqual([
      { roomTypeId: "std", name: "Standard Double", quantity: 2, lineTotalRand: 9800 },
      { roomTypeId: "fam", name: "Family Room", quantity: 1, lineTotalRand: 6000 },
    ]);
    expect(selectionTotalRand(lines)).toBe(15800);
    expect(roomCount(selection)).toBe(3);
  });

  it("sums capacity as maxGuests x quantity", () => {
    expect(selectionCapacity(selection, rooms)).toBe(8);
  });
});

describe("withQuantity", () => {
  it("sets, adds and removes a line", () => {
    const one = withQuantity([], rooms, "fam", 1);
    expect(one).toEqual([{ roomTypeId: "fam", quantity: 1 }]);
    const two = withQuantity(one, rooms, "std", 2);
    expect(two).toEqual([
      { roomTypeId: "std", quantity: 2 },
      { roomTypeId: "fam", quantity: 1 },
    ]);
    expect(withQuantity(two, rooms, "std", 0)).toEqual([{ roomTypeId: "fam", quantity: 1 }]);
  });
});

describe("reserveBlock", () => {
  it("asks for a room when nothing is selected", () => {
    expect(reserveBlock([], rooms, 2)).toEqual({
      kind: "empty",
      message: "Select at least one room.",
    });
  });

  it("blocks a party that does not fit", () => {
    expect(reserveBlock([{ roomTypeId: "fam", quantity: 1 }], rooms, 5)).toEqual({
      kind: "capacity",
      message: "These rooms sleep 4. Your party is 5. Add a room or pick a bigger one.",
    });
  });

  it("allows a party that fits whatever number of rooms the Party asked for", () => {
    expect(
      reserveBlock(
        [
          { roomTypeId: "std", quantity: 1 },
          { roomTypeId: "fam", quantity: 1 },
        ],
        rooms,
        5,
      ),
    ).toBeNull();
    expect(reserveBlock([{ roomTypeId: "fam", quantity: 1 }], rooms, 4)).toBeNull();
  });
});

describe("labels", () => {
  it("words the fit message", () => {
    expect(partyFitMessage(4, 5)).toBe(
      "These rooms sleep 4. Your party is 5. Add a room or pick a bigger one.",
    );
  });

  it("names the summary bar trigger", () => {
    expect(summaryTriggerLabel(1, "4 900 rand")).toBe("1 room, 4 900 rand. Show full summary");
    expect(summaryTriggerLabel(0, "0 rand")).toBe("0 rooms, 0 rand. Show full summary");
  });

  it("announces lowered quantities", () => {
    expect(
      loweredMessage([
        { roomTypeId: "std", name: "Standard Double", from: 5, to: 2 },
        { roomTypeId: "fam", name: "Family Room", from: 1, to: 0 },
      ]),
    ).toBe(
      "Standard Double lowered to 2, the most available for your dates. Family Room is no longer available for your dates and was removed.",
    );
  });
});

describe("roomRanOutMessage", () => {
  it("names the Room type", () => {
    expect(roomRanOutMessage(["Standard Double"])).toBe(
      "Sorry, the last Standard Double was just booked. Pick another room.",
    );
  });

  it("handles several Room types and none", () => {
    expect(roomRanOutMessage(["Standard Double", "Family Room"])).toBe(
      "Sorry, the last Standard Double and Family Room were just booked. Pick another room.",
    );
    expect(roomRanOutMessage([])).toBe(
      "Sorry, a room you picked was just booked. Pick another room.",
    );
  });
});
