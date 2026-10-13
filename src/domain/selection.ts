/**
 * The room selection on the Hotel page (FR-16 to FR-18): clamping to
 * Availability, per-line totals, party fit and the reasons Reserve is off.
 * Pure. Totals come only from `pricing.ts` (AD-9).
 */
import { bookingTotalRand, stayTotalRand } from "@/domain/pricing";
import type { RoomSelection } from "@/domain/types";

/** The parts of a Room type the selection rules need. */
export type SelectableRoom = {
  id: string;
  name: string;
  maxGuests: number;
  nightlyRand: number;
};

/** Availability per Room type id, from `availabilityFor`. */
export type AvailabilityCounts = ReadonlyMap<string, number> | Readonly<Record<string, number>>;

function countFor(availability: AvailabilityCounts, id: string): number {
  const count =
    availability instanceof Map
      ? availability.get(id)
      : (availability as Readonly<Record<string, number>>)[id];
  return count ?? 0;
}

/** A quantity that was cut down because Availability fell. */
export type LoweredLine = { roomTypeId: string; name: string; from: number; to: number };

/**
 * Keeps only the Room types the Hotel has, in the Hotel's order, with each
 * quantity cut to its Availability. Room types left at 0 are dropped.
 * `lowered` lists the known Room types whose quantity was cut.
 */
export function clampSelection(
  selection: readonly RoomSelection[] | null,
  rooms: readonly SelectableRoom[],
  availability: AvailabilityCounts,
): { selection: RoomSelection[]; lowered: LoweredLine[] } {
  const clamped: RoomSelection[] = [];
  const lowered: LoweredLine[] = [];
  for (const room of rooms) {
    const asked = selection?.find((line) => line.roomTypeId === room.id)?.quantity ?? 0;
    if (asked < 1) continue;
    const quantity = Math.min(asked, countFor(availability, room.id));
    if (quantity < asked) {
      lowered.push({ roomTypeId: room.id, name: room.name, from: asked, to: quantity });
    }
    if (quantity > 0) clamped.push({ roomTypeId: room.id, quantity });
  }
  return { selection: clamped, lowered };
}

/** The quantity chosen for a Room type, 0 if none. */
export function quantityOf(selection: readonly RoomSelection[], roomTypeId: string): number {
  return selection.find((line) => line.roomTypeId === roomTypeId)?.quantity ?? 0;
}

/** The selection with one Room type set to `quantity`, in the Hotel's order. */
export function withQuantity(
  selection: readonly RoomSelection[],
  rooms: readonly SelectableRoom[],
  roomTypeId: string,
  quantity: number,
): RoomSelection[] {
  return rooms.flatMap((room) => {
    const next = room.id === roomTypeId ? quantity : quantityOf(selection, room.id);
    return next > 0 ? [{ roomTypeId: room.id, quantity: next }] : [];
  });
}

/** How many Rooms are selected in all. */
export function roomCount(selection: readonly RoomSelection[]): number {
  return selection.reduce((sum, line) => sum + line.quantity, 0);
}

/** The Stay total for ONE Room of a Room type (the table's price). */
export function roomPriceRand(room: SelectableRoom, nights: number): number {
  return stayTotalRand(room.nightlyRand, nights, 1);
}

export type SummaryLine = {
  roomTypeId: string;
  name: string;
  quantity: number;
  lineTotalRand: number;
};

/** One summary line per selected Room type: "1 x Standard Double  R 4 900,00". */
export function summaryLines(
  selection: readonly RoomSelection[],
  rooms: readonly SelectableRoom[],
  nights: number,
): SummaryLine[] {
  return rooms.flatMap((room) => {
    const quantity = quantityOf(selection, room.id);
    return quantity > 0
      ? [
          {
            roomTypeId: room.id,
            name: room.name,
            quantity,
            lineTotalRand: stayTotalRand(room.nightlyRand, nights, quantity),
          },
        ]
      : [];
  });
}

/** The Booking total for the selection. */
export function selectionTotalRand(lines: readonly SummaryLine[]): number {
  return bookingTotalRand(lines.map((line) => line.lineTotalRand));
}

/** How many Guests the selected Rooms sleep: `maxGuests x quantity`, summed. */
export function selectionCapacity(
  selection: readonly RoomSelection[],
  rooms: readonly SelectableRoom[],
): number {
  return selection.reduce(
    (sum, line) =>
      sum + line.quantity * (rooms.find((room) => room.id === line.roomTypeId)?.maxGuests ?? 0),
    0,
  );
}

export const NOTHING_SELECTED_MESSAGE = "Select at least one room.";

/** "These rooms sleep 4. Your party is 5. Add a room or pick a bigger one." */
export function partyFitMessage(capacity: number, guests: number): string {
  return `These rooms sleep ${capacity}. Your party is ${guests}. Add a room or pick a bigger one.`;
}

export type ReserveBlock = { kind: "empty" | "capacity"; message: string };

/**
 * Why Reserve is off, or null when it is on. The count of selected Rooms need
 * not equal the Party's Rooms; only the capacity must cover the Guests.
 */
export function reserveBlock(
  selection: readonly RoomSelection[],
  rooms: readonly SelectableRoom[],
  guests: number,
): ReserveBlock | null {
  if (roomCount(selection) === 0) return { kind: "empty", message: NOTHING_SELECTED_MESSAGE };
  const capacity = selectionCapacity(selection, rooms);
  if (capacity < guests) return { kind: "capacity", message: partyFitMessage(capacity, guests) };
  return null;
}

/** "1 room", "3 rooms" */
export function roomsLabel(count: number): string {
  return `${count} ${count === 1 ? "room" : "rooms"}`;
}

/** The summary bar's trigger name: "1 room, 4 900 rand. Show full summary". */
export function summaryTriggerLabel(count: number, spokenTotal: string): string {
  return `${roomsLabel(count)}, ${spokenTotal}. Show full summary`;
}

/** Announced when a new Stay cut a quantity. */
export function loweredMessage(lowered: readonly LoweredLine[]): string {
  return lowered
    .map((line) =>
      line.to === 0
        ? `${line.name} is no longer available for your dates and was removed.`
        : `${line.name} lowered to ${line.to}, the most available for your dates.`,
    )
    .join(" ");
}

/**
 * The room-ran-out alert text (EXPERIENCE.md Room ran out at confirm), naming
 * the Room types that were just booked.
 */
export function roomRanOutMessage(names: readonly string[]): string {
  if (names.length === 0) return "Sorry, a room you picked was just booked. Pick another room.";
  if (names.length === 1) {
    return `Sorry, the last ${names[0]} was just booked. Pick another room.`;
  }
  return `Sorry, the last ${names.join(" and ")} were just booked. Pick another room.`;
}
