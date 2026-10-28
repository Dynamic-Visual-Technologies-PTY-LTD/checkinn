// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  boundedCache,
  CACHE_MAX_ENTRIES,
  interpretationCache,
  interpretationKey,
} from "./cache";

let n = 0;
/** A fresh cache name per test, so the globalThis maps never collide. */
const fresh = <V>(max: number) => boundedCache<string, V>(`test-${++n}`, max);

describe("boundedCache (AD-28)", () => {
  it("returns the cached promise on a hit, without calling create again", async () => {
    const cache = fresh<number>(3);
    const create = vi.fn(async () => 1);
    expect(await cache.getOrCreate("a", create)).toBe(1);
    expect(await cache.getOrCreate("a", create)).toBe(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight call between concurrent misses", async () => {
    const cache = fresh<string>(3);
    let resolve: (value: string) => void = () => {};
    const create = vi.fn(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    );
    const first = cache.getOrCreate("a", create);
    const second = cache.getOrCreate("a", create);
    resolve("value");
    expect(await Promise.all([first, second])).toEqual(["value", "value"]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("evicts a rejected promise, so the next call tries again and is cached", async () => {
    const cache = fresh<string>(3);
    const create = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValue("up");
    await expect(cache.getOrCreate("a", create)).rejects.toThrow("down");
    expect(cache.size).toBe(0);
    expect(await cache.getOrCreate("a", create)).toBe("up");
    expect(await cache.getOrCreate("a", create)).toBe("up");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("evicts a key only while it still holds that promise", async () => {
    const cache = fresh<string>(3);
    const stale = cache.getOrCreate("a", () => new Promise<string>(() => {}));
    cache.evict("a", stale);
    expect(cache.size).toBe(0);

    const newer = cache.getOrCreate("a", async () => "newer");
    cache.evict("a", stale);
    expect(cache.size).toBe(1);
    expect(await cache.getOrCreate("a", async () => "other")).toBe("newer");
    expect(await newer).toBe("newer");
  });

  it("turns a synchronous throw into an evicted rejection", async () => {
    const cache = fresh<string>(3);
    await expect(
      cache.getOrCreate("a", () => {
        throw new Error("sync");
      }),
    ).rejects.toThrow("sync");
    expect(cache.size).toBe(0);
  });

  it("holds at most max entries, evicting the least recently used", async () => {
    const cache = fresh<string>(2);
    const create = vi.fn(async () => "v");
    await cache.getOrCreate("a", create);
    await cache.getOrCreate("b", create);
    // Touch a, so b is the oldest.
    await cache.getOrCreate("a", create);
    await cache.getOrCreate("c", create);
    expect(cache.size).toBe(2);
    expect(create).toHaveBeenCalledTimes(3);

    await cache.getOrCreate("a", create);
    expect(create).toHaveBeenCalledTimes(3);
    await cache.getOrCreate("b", create);
    expect(create).toHaveBeenCalledTimes(4);
  });

  it("keeps one map per name on globalThis", async () => {
    const name = `shared-${++n}`;
    const create = vi.fn(async () => 1);
    await boundedCache<string, number>(name, 2).getOrCreate("a", create);
    await boundedCache<string, number>(name, 2).getOrCreate("a", create);
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("interpretationCache", () => {
  beforeEach(() => interpretationCache.clear());

  it("holds 500 entries", () => {
    expect(CACHE_MAX_ENTRIES).toBe(500);
  });

  it("is keyed by the normalised Query and today", () => {
    expect(interpretationKey("quiet hotel", "2026-10-15")).toBe(
      interpretationKey("quiet hotel", "2026-10-15"),
    );
    expect(interpretationKey("quiet hotel", "2026-10-15")).not.toBe(
      interpretationKey("quiet hotel", "2026-10-16"),
    );
    expect(interpretationKey("quiet hotel", "2026-10-15")).not.toBe(
      interpretationKey("quiet hotels", "2026-10-15"),
    );
  });
});
