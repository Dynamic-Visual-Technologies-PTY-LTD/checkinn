// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import type { SearchBarCriteria } from "@/domain/interpretation";
import type { Provider } from "@/features/search/provider/types";

const mocks = vi.hoisted(() => ({
  db: undefined as unknown,
  provider: undefined as unknown,
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
vi.mock("@/domain/clock", () => ({
  todayIn: () => "2026-10-15",
  nowIso: () => "2026-10-15T08:00:00.000Z",
}));
// Unset: the real getProvider, which reads CHECKINN_PROVIDER.
vi.mock("@/features/search/provider/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/search/provider/config")>();
  return {
    getProvider: (...args: Parameters<typeof actual.getProvider>) =>
      mocks.provider === undefined ? actual.getProvider(...args) : mocks.provider,
  };
});

import { ProviderError } from "@/features/search/provider/types";
import { submitQuery } from "./actions";

const UJ1 = "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night";
const current: SearchBarCriteria = {
  q: "Cape Town",
  stay: { checkIn: "2026-10-16", checkOut: "2026-10-17" },
  party: { adults: 2, children: 0, rooms: 1 },
};
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
  mocks.provider = undefined;
  mocks.db = db;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function redirectedTo(query: string, from: SearchBarCriteria = current): Promise<string> {
  await expect(submitQuery({ query, current: from })).rejects.toThrow("NEXT_REDIRECT");
  return mocks.redirect.mock.calls[0][0] as string;
}

function failingProvider(error: unknown): Provider {
  const fail = async () => {
    throw error;
  };
  return { interpret: fail, embed: fail, reasons: fail, judge: fail };
}

describe("submitQuery with the fake Provider", () => {
  beforeEach(() => {
    vi.stubEnv("CHECKINN_PROVIDER", "fake");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("redirects the UJ-1 Query with every Smart search parameter", async () => {
    expect(await redirectedTo(UJ1)).toBe(
      "/search?q=Stellenbosch&checkIn=2026-10-23&checkOut=2026-10-25&adults=4&children=0&rooms=1" +
        `&${new URLSearchParams({ sq: UJ1 })}&smart=1&prefs=pet+friendly+family+place` +
        "&maxPrice=2000&policy=pets",
    );
  });

  it("gives an out-of-catalog place, all destinations and the place's words as Preferences", async () => {
    const url = new URL(await redirectedTo("relaxed lodge with a pool near Kruger"), "http://localhost");
    expect(url.searchParams.has("q")).toBe(false);
    expect(url.searchParams.get("place")).toBe("Kruger");
    expect(url.searchParams.get("prefs")).toBe("relaxed lodge with a pool Kruger");
    expect(url.searchParams.get("smart")).toBe("1");
  });

  it("keeps the current Stay and Party, and starts Destination empty, for UJ-3", async () => {
    expect(await redirectedTo("ski chalet with a fireplace")).toBe(
      "/search?checkIn=2026-10-16&checkOut=2026-10-17&adults=2&children=0&rooms=1" +
        "&sq=ski+chalet+with+a+fireplace&smart=1&prefs=ski+chalet+with+a+fireplace",
    );
  });

  it("keeps the Guest's own words, trimmed, in sq", async () => {
    const url = new URL(await redirectedTo(`  ${UJ1}  `), "http://localhost");
    expect(url.searchParams.get("sq")).toBe(UJ1);
    expect(url.searchParams.get("smart")).toBe("1");
  });

  it("keeps the current Stay when the Query states none", async () => {
    const url = new URL(
      await redirectedTo("quiet business hotel in Gauteng with a gym and meeting rooms"),
      "http://localhost",
    );
    expect(url.searchParams.get("q")).toBe("Gauteng");
    expect(url.searchParams.get("checkIn")).toBe("2026-10-16");
    expect(url.searchParams.get("checkOut")).toBe("2026-10-17");
  });

  it("sends the nickname map with the Query", async () => {
    const interpret = vi.fn(async () => ({ destination: "Joburg" }));
    mocks.provider = { ...failingProvider(new Error("unused")), interpret };
    const url = new URL(await redirectedTo("a hotel in Joburg"), "http://localhost");
    expect(url.searchParams.get("q")).toBe("Johannesburg");
    expect(interpret).toHaveBeenCalledWith(
      "a hotel in joburg",
      expect.objectContaining({
        today: "2026-10-15",
        nicknames: expect.objectContaining({ joburg: "Johannesburg", pe: "Gqeberha" }),
      }),
      expect.anything(),
    );
  });

  it("names an unusable Party and keeps the current one", async () => {
    mocks.provider = {
      ...failingProvider(new Error("unused")),
      interpret: async () => ({ adults: 0, partyPhrase: "for 0" }),
    };
    const url = new URL(await redirectedTo("a hotel for 0"), "http://localhost");
    expect(url.searchParams.get("adults")).toBe("2");
    expect(url.searchParams.get("ignored")).toBe("for 0");
    expect(url.searchParams.get("ignoredKind")).toBe("party");
  });

  it("keeps the current criteria and sq, with no smart, for an unknown Query", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const url = await redirectedTo("a castle on the moon");
    expect(url).toBe(
      "/search?q=Cape+Town&checkIn=2026-10-16&checkOut=2026-10-17&adults=2&children=0&rooms=1" +
        "&sq=a+castle+on+the+moon",
    );
    // Logged by code only, never the Query.
    expect(JSON.stringify(error.mock.calls)).toContain("UNAVAILABLE");
    expect(JSON.stringify(error.mock.calls)).not.toContain("castle");
  });

  it("re-parses the current criteria: a tampered Party becomes the default", async () => {
    const url = new URL(
      await redirectedTo("ski chalet", { ...current, party: { adults: 99, children: 0, rooms: 1 } }),
      "http://localhost",
    );
    expect(url.searchParams.get("adults")).toBe("2");
  });
});

describe("submitQuery outcomes", () => {
  it.each(["", "   ", "a".repeat(301)])("returns VALIDATION for %j", async (query) => {
    expect(await submitQuery({ query, current })).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("accepts a Query of exactly 300 characters", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.provider = failingProvider(new ProviderError("UNAVAILABLE"));
    const url = new URL(await redirectedTo("a".repeat(300)), "http://localhost");
    expect(url.searchParams.get("sq")).toHaveLength(300);
  });

  it("treats a timeout like any Provider failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.provider = failingProvider(new DOMException("timed out", "TimeoutError"));
    const url = new URL(await redirectedTo(UJ1), "http://localhost");
    expect(url.searchParams.get("q")).toBe("Cape Town");
    expect(url.searchParams.get("sq")).toBe(UJ1);
    expect(url.searchParams.has("smart")).toBe(false);
  });

  it("passes interpretation a 2.5 s signal", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.provider = failingProvider(new ProviderError("RATE_LIMITED"));
    await redirectedTo(UJ1);
    expect(timeout).toHaveBeenCalledWith(2_500);
  });

  it("returns SERVER_ERROR for any other failure, logging no Query", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.provider = failingProvider(new Error(`boom ${UJ1}`));
    expect(await submitQuery({ query: UJ1, current })).toMatchObject({
      ok: false,
      code: "SERVER_ERROR",
    });
    expect(JSON.stringify(error.mock.calls)).not.toContain("Stellenbosch");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("submitQuery with the Provider off (AD-31)", () => {
  it("redirects to the MVP URL and makes no outbound request", async () => {
    const fetch = vi.fn(() => {
      throw new Error("No network in npm test");
    });
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("CHECKINN_PROVIDER", "off");

    expect(await redirectedTo(UJ1)).toBe(
      "/search?q=Cape+Town&checkIn=2026-10-16&checkOut=2026-10-17&adults=2&children=0&rooms=1",
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
