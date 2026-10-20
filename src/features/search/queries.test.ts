// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { defaultCriteria, smartCriteria } from "@/domain/criteria";
import type { SearchCriteria } from "@/domain/types";

const mocks = vi.hoisted(() => ({ db: undefined as unknown }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ io: async () => {} }));
vi.mock("@/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/db/client")>()),
  getDb: () => mocks.db,
}));
vi.mock("@/domain/clock", () => ({
  todayIn: () => "2026-10-13",
  nowIso: () => "2026-10-13T08:00:00.000Z",
}));

import { searchHotels } from "./queries";

let db: Db;

beforeAll(() => {
  db = createTestDb();
  mocks.db = db;
});
afterAll(() => {
  db.$client.close();
});

function criteria(overrides: Partial<SearchCriteria> = {}): SearchCriteria {
  return {
    ...defaultCriteria("2026-10-13"),
    stay: { checkIn: "2026-11-13", checkOut: "2026-11-15" },
    ...overrides,
  };
}

describe("searchHotels notices", () => {
  it("gives none for an MVP search", async () => {
    expect((await searchHotels(criteria())).notices).toEqual([]);
  });

  it("gives the place notice, then the ignored value, with all destinations", async () => {
    const result = await searchHotels(
      criteria({
        smart: smartCriteria("relaxed lodge near Kruger", true, {
          place: "Kruger",
          ignored: "for 0",
          ignoredKind: "party",
        }),
      }),
    );
    expect(result.heading).toBe("All destinations: 12 properties found");
    expect(result.notices).toEqual([
      { kind: "place", place: "Kruger" },
      { kind: "ignored", text: "for 0", about: "party" },
    ]);
  });

  it("gives no place notice for a crafted URL with a Destination", async () => {
    const result = await searchHotels(
      criteria({ q: "Durban", smart: smartCriteria("quiet", true, { place: "Kruger" }) }),
    );
    expect(result.notices).toEqual([]);
  });
});
