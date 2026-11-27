/**
 * Text keys (AD-28). Every text sent to the Provider, and every cache,
 * fixture and golden key, goes through `normaliseText` first, so the same
 * words always give the same key.
 */

/** Trims, collapses every run of whitespace to one space, and lowercases. */
export function normaliseText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}
