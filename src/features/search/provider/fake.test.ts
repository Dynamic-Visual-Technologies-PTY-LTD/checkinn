// @vitest-environment node
import { describe, expect, it } from "vitest";
import { normaliseText } from "@/domain/text";
import { createFakeProvider, loadFakeFixtures } from "@/features/search/provider/fake";
import { ProviderError, type InterpretationContext } from "@/features/search/provider/types";

const UJ1 = "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night";
const context: InterpretationContext = { today: "2026-10-15", cities: [], nicknames: {} };
const signal = () => new AbortController().signal;

async function failure(run: () => Promise<unknown>): Promise<ProviderError> {
  const error = await run().then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ProviderError);
  return error as ProviderError;
}

describe("fake Provider fixtures", () => {
  const fixtures = loadFakeFixtures();

  it("keys every fixture by normalised text", () => {
    for (const key of [
      ...Object.keys(fixtures.interpretations),
      ...Object.keys(fixtures.reasons),
    ]) {
      expect(key).toBe(normaliseText(key));
    }
  });

  it("holds no absolute dates and no chunk ids", () => {
    for (const interpretation of Object.values(fixtures.interpretations)) {
      expect(interpretation.checkIn).toBeNull();
      expect(interpretation.checkOut).toBeNull();
    }
    expect(JSON.stringify(fixtures)).not.toMatch(/hotel-\d{3}:/);
  });
});

describe("createFakeProvider", () => {
  const provider = createFakeProvider();

  it("interprets the UJ-1 Query however it is written", async () => {
    const result = await provider.interpret(`  ${UJ1.toUpperCase()} `, context, signal());
    expect(result).toMatchObject({
      destination: "Stellenbosch",
      relativeStay: "next-weekend",
      adults: 4,
      children: null,
      petsAllowed: true,
      maxPrice: 2000,
      preferences: "pet friendly family place",
    });
  });

  it("throws UNAVAILABLE for an unknown Query", async () => {
    expect((await failure(() => provider.interpret("ski chalet", context, signal()))).code).toBe(
      "UNAVAILABLE",
    );
  });

  it("throws UNAVAILABLE for embed and judge, which have no fixtures yet", async () => {
    expect((await failure(() => provider.embed(["quiet"], signal()))).code).toBe("UNAVAILABLE");
    expect(
      (await failure(() => provider.judge({ reason: "Quiet.", knowledge: [] }, signal()))).code,
    ).toBe("UNAVAILABLE");
  });

  it("answers reasons from fixtures, citing the first chunk sent", async () => {
    const fake = createFakeProvider({
      interpretations: {},
      reasons: { "quiet place": "Quiet rooms away from the road." },
    });
    const input = {
      preferences: " Quiet  Place ",
      hotels: [
        {
          hotelId: "hotel-001",
          chunks: [
            { id: "hotel-001:review:1", text: "So quiet." },
            { id: "hotel-001:overview:1", text: "A hotel." },
          ],
        },
      ],
    };
    expect(await fake.reasons(input, signal())).toEqual([
      {
        hotelId: "hotel-001",
        reason: "Quiet rooms away from the road.",
        citedChunkIds: ["hotel-001:review:1"],
      },
    ]);
    expect(
      (await failure(() => fake.reasons({ ...input, preferences: "pool" }, signal()))).code,
    ).toBe("UNAVAILABLE");
  });

  it("throws TIMEOUT once the signal has aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    expect((await failure(() => provider.interpret(UJ1, context, controller.signal))).code).toBe(
      "TIMEOUT",
    );
  });
});
