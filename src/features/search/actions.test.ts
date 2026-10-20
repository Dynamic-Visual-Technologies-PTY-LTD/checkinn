// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import type { InterpretedCriteria } from "@/domain/interpretation";
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
const current: InterpretedCriteria = {
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

async function redirectedTo(query: string, from: InterpretedCriteria = current): Promise<string> {
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

  it("redirects the UJ-1 Query to /search with sq, smart=1, Stellenbosch and 4 adults", async () => {
    expect(await redirectedTo(UJ1)).toBe(
      "/search?q=Stellenbosch&checkIn=2026-10-16&checkOut=2026-10-17&adults=4&children=0&rooms=1" +
        `&${new URLSearchParams({ sq: UJ1 })}&smart=1`,
    );
  });

  it("keeps the Guest's own words, trimmed, in sq", async () => {
    const url = new URL(await redirectedTo(`  ${UJ1}  `), "http://localhost");
    expect(url.searchParams.get("sq")).toBe(UJ1);
    expect(url.searchParams.get("smart")).toBe("1");
  });

  it("keeps the current Stay when the Query states none", async () => {
    const url = new URL(await redirectedTo(UJ1), "http://localhost");
    expect(url.searchParams.get("checkIn")).toBe("2026-10-16");
    expect(url.searchParams.get("checkOut")).toBe("2026-10-17");
  });

  it("keeps the current criteria and sq, with no smart, for an unknown Query", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const url = await redirectedTo("ski chalet with a fireplace");
    expect(url).toBe(
      "/search?q=Cape+Town&checkIn=2026-10-16&checkOut=2026-10-17&adults=2&children=0&rooms=1" +
        "&sq=ski+chalet+with+a+fireplace",
    );
    // Logged by code only, never the Query.
    expect(JSON.stringify(error.mock.calls)).toContain("UNAVAILABLE");
    expect(JSON.stringify(error.mock.calls)).not.toContain("chalet");
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
