// @vitest-environment node
import { describe, expect, it } from "vitest";
import { fewestRooms } from "./rooms";

const party = (adults: number, children = 0, rooms = 1) => ({ adults, children, rooms });
const types = (...maxGuests: number[]) => maxGuests.map((value) => ({ maxGuests: value }));

describe("fewestRooms", () => {
  it("picks the Room type that needs the fewest Rooms", () => {
    expect(fewestRooms(party(4), types(2, 4))).toBe(1);
    expect(fewestRooms(party(5), types(2, 4))).toBe(2);
    expect(fewestRooms(party(2, 3), types(2, 4))).toBe(2);
    expect(fewestRooms(party(3), types(2))).toBe(2);
  });

  it("never gives more Rooms than adults", () => {
    expect(fewestRooms(party(1, 5), types(2))).toBe(1);
    expect(fewestRooms(party(2, 6), types(2))).toBe(2);
  });

  it("never gives more Rooms than the codec limit", () => {
    expect(fewestRooms(party(10, 6), types(2))).toBe(5);
  });

  it("keeps the current Rooms for an empty list", () => {
    expect(fewestRooms(party(4, 0, 3), [])).toBe(3);
    expect(fewestRooms(party(4, 0, 3), types(0, 1.5))).toBe(3);
  });
});
