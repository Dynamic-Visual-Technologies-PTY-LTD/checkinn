// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb, insertTestBooking } from "@/db/test-db";
import type { Stay } from "@/domain/types";

const mocks = vi.hoisted(() => {
  const jar = new Map<string, string>();
  return {
    db: undefined as unknown,
    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT ${url}`);
    }),
    jar,
    set: vi.fn((name: string, value: string) => {
      jar.set(name, value);
    }),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/db/client")>()),
  getDb: () => mocks.db,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      mocks.jar.has(name) ? { name, value: mocks.jar.get(name) } : undefined,
    set: mocks.set,
  }),
}));
vi.mock("@/domain/clock", () => ({
  todayIn: () => "2026-11-10",
  nowIso: () => "2026-11-10T08:00:00.000Z",
}));

import {
  confirmBooking,
  type ConfirmBookingInput,
  startBooking,
  type StartBookingInput,
} from "./actions";

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
  mocks.set.mockClear();
  mocks.jar.clear();
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

const ACCESS = "checkinn_access";
let keyCount = 0;

function confirmInput(overrides: Partial<ConfirmBookingInput> = {}): ConfirmBookingInput {
  keyCount += 1;
  return {
    ...input(),
    k: `confirm-key-${keyCount}`,
    guest: { firstName: "Thandi", lastName: "Nkosi", email: "thandi@example.com" },
    ...overrides,
  };
}

async function confirmRedirect(i: ConfirmBookingInput): Promise<URL> {
  mocks.redirect.mockClear();
  await expect(confirmBooking(i)).rejects.toThrow("NEXT_REDIRECT");
  return new URL(mocks.redirect.mock.calls[0][0], "http://localhost");
}

function countRows(): number {
  return (db.$client.prepare("SELECT COUNT(*) AS n FROM bookings").get() as { n: number }).n;
}

describe("confirmBooking", () => {
  it("creates the Booking, sets the access cookie and redirects to it", async () => {
    const url = await confirmRedirect(confirmInput());

    expect(url.pathname).toMatch(/^\/bookings\/CI-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    expect(mocks.set).toHaveBeenCalledTimes(1);
    const [name, value, options] = mocks.set.mock.calls[0] as unknown as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe(ACCESS);
    expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(options).toEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: 2_592_000,
    });
    // No email or token in the URL.
    expect(url.toString()).not.toContain("thandi");
    expect(url.toString()).not.toContain(value);
  });

  it("keeps earlier tokens and drops the oldest past 20", async () => {
    const held = Array.from({ length: 20 }, (_, i) => `held${i}`);
    mocks.jar.set(ACCESS, held.join("."));

    await confirmRedirect(confirmInput());

    const tokens = mocks.jar.get(ACCESS)!.split(".");
    expect(tokens).toHaveLength(20);
    expect(tokens.slice(0, 19)).toEqual(held.slice(1));
  });

  it("returns the first Booking for a repeated key and the same email, written differently", async () => {
    const first = confirmInput();
    const firstUrl = await confirmRedirect(first);
    const before = countRows();
    mocks.jar.clear();
    mocks.set.mockClear();

    const again = await confirmRedirect({
      ...first,
      guest: { ...first.guest, email: " Thandi@Example.COM " },
    });

    expect(again.pathname).toBe(firstUrl.pathname);
    expect(countRows()).toBe(before);
    expect(mocks.set).toHaveBeenCalledTimes(1);
  });

  it("sets no cookie for a repeated key with another, empty or missing email", async () => {
    const first = confirmInput();
    const firstUrl = await confirmRedirect(first);
    mocks.jar.clear();

    for (const guest of [
      { ...first.guest, email: "someone@example.com" },
      { ...first.guest, email: "" },
      { firstName: "A", lastName: "B" },
    ]) {
      mocks.set.mockClear();
      const url = await confirmRedirect({ ...first, guest });
      expect(url.pathname).toBe(firstUrl.pathname);
      expect(mocks.set).not.toHaveBeenCalled();
    }
  });

  it("keeps the token for a repeated key when the cookie already holds it", async () => {
    const first = confirmInput();
    const firstUrl = await confirmRedirect(first);
    const token = mocks.jar.get(ACCESS)!;

    const url = await confirmRedirect({ ...first, guest: { ...first.guest, email: "x@y.za" } });

    expect(url.pathname).toBe(firstUrl.pathname);
    expect(mocks.jar.get(ACCESS)!.split(".")).toContain(token);
  });

  it("returns field errors and inserts nothing for bad guest details", async () => {
    const before = countRows();
    const result = await confirmBooking(
      confirmInput({ guest: { firstName: " ", lastName: "", email: "not-an-email" } }),
    );

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION",
      fieldErrors: {
        firstName: "Enter your first name.",
        lastName: "Enter your last name.",
        email: "Enter an email address like name@example.com.",
      },
      message: "Check your details and try again.",
    });
    expect(countRows()).toBe(before);
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("sends tampered input back to the Hotel page with the criteria, inserting nothing", async () => {
    const before = countRows();
    const cases: Partial<ConfirmBookingInput>[] = [
      { sel: [{ roomTypeId: "hotel-002-standard", quantity: 1 }] },
      { sel: [{ roomTypeId: "hotel-001-standard", quantity: 0 }] },
      { stay: { checkIn: "2026-11-01", checkOut: "2026-11-03" } },
      { party: { adults: 3, children: 0, rooms: 1 } },
      { k: "" },
    ];
    for (const overrides of cases) {
      const url = await confirmRedirect(confirmInput(overrides));
      expect(url.pathname).toBe("/hotels/hotel-001");
      expect(url.searchParams.get("q")).toBe("Cape Town");
      expect(url.searchParams.get("notice")).toBeNull();
    }
    expect(countRows()).toBe(before);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("returns to the room table with the full selection and the Room type that ran out", async () => {
    const late: Stay = { checkIn: "2026-12-10", checkOut: "2026-12-12" };
    insertTestBooking(db, {
      hotelId: "hotel-001",
      stay: late,
      lines: [{ roomTypeId: "hotel-001-family", quantity: 4 }],
    });
    const before = countRows();

    const url = await confirmRedirect(
      confirmInput({
        stay: late,
        sel: [
          { roomTypeId: "hotel-001-standard", quantity: 1 },
          { roomTypeId: "hotel-001-family", quantity: 1 },
        ],
      }),
    );

    expect(`${url.pathname}${url.search}`).toBe(
      "/hotels/hotel-001?q=Cape+Town&checkIn=2026-12-10&checkOut=2026-12-12&adults=2&children=0&rooms=1" +
        "&sel=hotel-001-standard%3A1%2Chotel-001-family%3A1&notice=room-unavailable&rt=hotel-001-family",
    );
    expect(countRows()).toBe(before);
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("returns SERVER_ERROR and logs no personal data when the repo throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = Object.assign(new Error("INSERT ... thandi@example.com"), {
      name: "SqliteError",
      code: "SQLITE_BUSY",
    });
    mocks.db = {
      select: () => {
        throw failing;
      },
    };
    try {
      const result = await confirmBooking(confirmInput());
      expect(result).toMatchObject({ ok: false, code: "SERVER_ERROR" });
      const logged = JSON.stringify(error.mock.calls);
      expect(logged).toContain("SqliteError SQLITE_BUSY");
      expect(logged).not.toContain("thandi");
      expect(logged).not.toContain("Nkosi");
      expect(mocks.set).not.toHaveBeenCalled();
    } finally {
      mocks.db = db;
      error.mockRestore();
    }
  });
});
