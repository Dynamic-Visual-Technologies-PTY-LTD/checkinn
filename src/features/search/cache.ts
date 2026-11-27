/**
 * Smart search caches (AD-28): bounded LRU maps in this one process (AD-12),
 * held on `globalThis` so a dev reload of this module keeps them. Each map
 * stores the in-flight promise, so concurrent misses share one Provider call;
 * a rejected promise is evicted, so errors are never cached. Keys are built
 * from `normaliseText` output by the caller. Nothing here uses `"use cache"`.
 */
import type { Interpretation } from "@/domain/interpretation";

/** Entries each cache keeps before evicting the least recently used (AD-28). */
export const CACHE_MAX_ENTRIES = 500;

export type BoundedCache<K, V> = {
  /**
   * The cached promise for `key`, touched as most recently used, or a new one
   * from `create`, stored at once so concurrent callers share it. It is
   * evicted if it rejects.
   */
  getOrCreate(key: K, create: () => Promise<V>): Promise<V>;
  /**
   * Removes `key` only while it still holds `promise`, so a newer call for
   * the same key is never removed.
   */
  evict(key: K, promise: Promise<V>): void;
  /** How many entries it holds. */
  readonly size: number;
  /** Empties it. For tests. */
  clear(): void;
};

const holder = globalThis as typeof globalThis & {
  __checkinnCaches?: Map<string, Map<unknown, Promise<unknown>>>;
};

/**
 * A bounded LRU promise cache named `name`, holding at most `max` entries.
 * One map per name per process.
 */
export function boundedCache<K, V>(name: string, max: number): BoundedCache<K, V> {
  function store(): Map<K, Promise<V>> {
    holder.__checkinnCaches ??= new Map();
    let map = holder.__checkinnCaches.get(name);
    if (!map) {
      map = new Map();
      holder.__checkinnCaches.set(name, map);
    }
    return map as Map<K, Promise<V>>;
  }

  function evict(key: K, promise: Promise<V>) {
    const current = store();
    if (current.get(key) === promise) current.delete(key);
  }

  return {
    getOrCreate(key, create) {
      const map = store();
      const hit = map.get(key);
      if (hit) {
        // Touch: re-inserting moves it to the most recently used end.
        map.delete(key);
        map.set(key, hit);
        return hit;
      }
      // An async wrapper turns a synchronous throw into a rejection.
      const promise = (async () => create())();
      map.set(key, promise);
      while (map.size > max) {
        const oldest = map.keys().next();
        if (oldest.done) break;
        map.delete(oldest.value);
      }
      promise.catch(() => evict(key, promise));
      return promise;
    },
    evict,
    get size() {
      return store().size;
    },
    clear() {
      store().clear();
    },
  };
}

/**
 * The Provider's raw interpretation (AD-22, AD-28), keyed by
 * `interpretationKey`. `applyInterpretation` still runs on every submit.
 */
export const interpretationCache = boundedCache<string, Interpretation>(
  "interpretation",
  CACHE_MAX_ENTRIES,
);

/** The interpretation cache key: today and the normalised Query. */
export function interpretationKey(normalisedQuery: string, today: string): string {
  return `${today}\n${normalisedQuery}`;
}
