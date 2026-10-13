// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb, insertTestBooking } from "@/db/test-db";
import type { Stay } from "@/domain/types";

const mocks = vi.hoisted(() => ({
  db: undefined as unknown,
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/db/client")>()),
  getDb: () => mocks.db,
}));
vi.mock("@/domain/clock", () => ({ todayIn: () => "2026-11-10" }));

import { startBooking, type StartBookingInput } from "./actions";

const stay: Stay = { checkIn: "2026-11-13", checkOut: "2026-11-15" };
let db: Db;

beforeAll(() => {
  db = createTestDb();
  mocks.db = db;
});
afterAll(() => {
  db.$client.close();
});
beforeEach(() => {
  mocks.redirect.mockClear();
});

function input(overrides: Partial<StartBookingInput> = {}): StartBookingInput {
  return {
    hotelId: "hotel-001",
    q: "Cape Town",
    stay,
    party: { adults: 2, children: 0, rooms: 1 },
    sel: [{ roomTypeId: "hotel-001-standard", quantity: 1 }],
    ...overrides,
  };
}

async function redirectedTo(i: StartBookingInput): Promise<URL> {
  await expect(startBooking(i)).rejects.toThrow("NEXT_REDIRECT");
  return new URL(mocks.redirect.mock.calls[0][0], "http://localhost");
}

describe("startBooking", () => {
  it("redirects to /book with the criteria, hotel, selection and a minted key", async () => {
    const url = await redirectedTo(input());
    expect(url.pathname).toBe("/book");
    expect(url.searchParams.get("hotel")).toBe("hotel-001");
    expect(url.searchParams.get("sel")).toBe("hotel-001-standard:1");
    expect(url.searchParams.get("checkIn")).toBe("2026-11-13");
    expect(url.searchParams.get("k")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("mints a new key every time", async () => {
    const first = (await redirectedTo(input())).searchParams.get("k");
    mocks.redirect.mockClear();
    const second = (await redirectedTo(input())).searchParams.get("k");
    expect(first).not.toBe(second);
  });

  it("accepts a party that fits across room types (Coral Coast)", async () => {
    const url = await redirectedTo(
      input({
        hotelId: "hotel-005",
        party: { adults: 3, children: 2, rooms: 1 },
        sel: [
          { roomTypeId: "hotel-005-standard", quantity: 1 },
          { roomTypeId: "hotel-005-family", quantity: 1 },
        ],
      }),
    );
    expect(url.searchParams.get("hotel")).toBe("hotel-005");
  });

  it("rejects a party that does not fit", async () => {
    const result = await startBooking(
      input({
        hotelId: "hotel-005",
        party: { adults: 3, children: 2, rooms: 1 },
        sel: [{ roomTypeId: "hotel-005-family", quantity: 1 }],
      }),
    );
    expect(result).toEqual({
      ok: false,
      code: "VALIDATION",
      message: "These rooms sleep 4. Your party is 5. Add a room or pick a bigger one.",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("rejects a Room type of another Hotel", async () => {
    const result = await startBooking(
      input({ sel: [{ roomTypeId: "hotel-002-standard", quantity: 1 }] }),
    );
    expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("rejects a quantity of 0 and an empty selection", async () => {
    expect(
      await startBooking(input({ sel: [{ roomTypeId: "hotel-001-standard", quantity: 0 }] })),
    ).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(await startBooking(input({ sel: [] }))).toMatchObject({
      ok: false,
      code: "VALIDATION",
    });
  });

  it("rejects missing or past dates", async () => {
    expect(await startBooking(input({ stay: null }))).toMatchObject({
      ok: false,
      code: "VALIDATION",
    });
    expect(
      await startBooking(input({ stay: { checkIn: "2026-11-01", checkOut: "2026-11-03" } })),
    ).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("rejects a quantity above Availability", async () => {
    const result = await startBooking(
      input({
        hotelId: "hotel-002",
        sel: [{ roomTypeId: "hotel-002-family", quantity: 1 }],
      }),
    );
    expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("counts Confirmed Bookings against Availability", async () => {
    const far: Stay = { checkIn: "2026-12-01", checkOut: "2026-12-03" };
    insertTestBooking(db, {
      hotelId: "hotel-001",
      stay: far,
      lines: [{ roomTypeId: "hotel-001-family", quantity: 4 }],
    });
    const result = await startBooking(
      input({ stay: far, sel: [{ roomTypeId: "hotel-001-family", quantity: 1 }] }),
    );
    expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
  });

  it("returns SERVER_ERROR for an unexpected failure, logging no personal data", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.db = {};
    try {
      const result = await startBooking(input());
      expect(result).toMatchObject({ ok: false, code: "SERVER_ERROR" });
      expect(JSON.stringify(error.mock.calls)).not.toContain("Cape Town");
    } finally {
      mocks.db = db;
      error.mockRestore();
    }
  });
});
