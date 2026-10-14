// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { validateGuest } from "@/domain/guest";
import type { Stay } from "@/domain/types";

const mocks = vi.hoisted(() => ({
  db: undefined as unknown,
  calls: [] as string[],
  cookie: undefined as string | undefined,
  booked: undefined as string | undefined,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  io: async () => {
    mocks.calls.push("io");
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "checkinn_access" && mocks.cookie !== undefined
        ? { name, value: mocks.cookie }
        : name === "checkinn_booked" && mocks.booked !== undefined
          ? { name, value: mocks.booked }
          : undefined,
  }),
}));
vi.mock("@/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/db/client")>()),
  getDb: () => {
    mocks.calls.push("db");
    return mocks.db;
  },
}));

import { createBooking } from "./booking.repo";
import { getBooking, getBookingByKey, getBookingQuote, wasJustBooked } from "./queries";

const stay: Stay = { checkIn: "2026-11-13", checkOut: "2026-11-15" };
const couple = { adults: 2, children: 0, rooms: 1 };
let db: Db;
let reference: string;

beforeAll(() => {
  db = createTestDb();
  mocks.db = db;
  const guest = validateGuest({ firstName: "Thandi", lastName: "Nkosi", email: "t@example.com" });
  if (!guest.ok) throw new Error("bad fixture guest");
  const created = createBooking(db, {
    hotelId: "hotel-001",
    stay,
    party: couple,
    lines: [{ roomTypeId: "hotel-001-standard", quantity: 1 }],
    guest: guest.guest,
    idempotencyKey: "used-key",
    accessToken: "token-1",
    now: "2026-10-14T08:00:00.000Z",
  });
  if (created.kind !== "created") throw new Error("expected created");
  reference = created.reference;
});
afterAll(() => {
  db.$client.close();
});
beforeEach(() => {
  mocks.calls.length = 0;
  mocks.cookie = undefined;
  mocks.booked = undefined;
});

describe("getBooking", () => {
  it("reads after io(), and shows the Booking to a browser holding its token", async () => {
    mocks.cookie = "other.token-1";

    const booking = await getBooking(reference.toLowerCase());

    expect(mocks.calls[0]).toBe("io");
    expect(booking?.reference).toBe(reference);
    expect(booking?.guestName).toBe("Thandi Nkosi");
  });

  it("is null without the token, and for an unknown reference", async () => {
    expect(await getBooking(reference)).toBeNull();
    mocks.cookie = "token-1";
    expect(await getBooking("CI-AAAAAA")).toBeNull();
  });
});

describe("wasJustBooked", () => {
  it("reads the just-booked cookie after io(), with the reference normalised", async () => {
    mocks.booked = `CI-OTHER1.${reference}`;

    expect(await wasJustBooked(reference.toLowerCase())).toBe(true);
    expect(mocks.calls[0]).toBe("io");
    expect(await wasJustBooked("CI-AAAAAA")).toBe(false);
  });

  it("is false without the cookie", async () => {
    expect(await wasJustBooked(reference)).toBe(false);
  });
});

describe("getBookingByKey", () => {
  it("is null for an unused key", async () => {
    expect(await getBookingByKey("fresh-key")).toBeNull();
    expect(mocks.calls[0]).toBe("io");
  });

  it("gives the Booking only to a browser holding its token", async () => {
    expect(await getBookingByKey("used-key")).toEqual({ access: false });

    mocks.cookie = "token-1";
    const used = await getBookingByKey("used-key");
    expect(used).toMatchObject({ access: true, booking: { reference } });
  });
});

describe("getBookingQuote", () => {
  it("prices a selection after io()", async () => {
    const result = await getBookingQuote({
      hotelId: "hotel-001",
      stay,
      party: couple,
      sel: [{ roomTypeId: "hotel-001-standard", quantity: 1 }],
    });

    expect(mocks.calls[0]).toBe("io");
    expect(result).toMatchObject({ kind: "ok", quote: { totalRand: 4900 } });
  });

  it("without a Stay or selection, tells an unknown Hotel apart", async () => {
    expect(
      await getBookingQuote({ hotelId: "hotel-001", stay: null, party: couple, sel: null }),
    ).toEqual({ kind: "invalid" });
    expect(await getBookingQuote({ hotelId: "nope", stay, party: couple, sel: null })).toEqual({
      kind: "no-hotel",
    });
  });
});
