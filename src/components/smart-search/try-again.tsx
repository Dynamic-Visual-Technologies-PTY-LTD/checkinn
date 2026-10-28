"use client";

import { secondaryButton } from "@/components/button-styles";
import { useSmartSearch } from "@/components/smart-search/smart-search-context";
import type { SearchBarCriteria } from "@/domain/interpretation";

/** Muted and inert-looking while a Query is submitting; it stays focusable. */
const busy =
  "aria-disabled:cursor-default aria-disabled:border-on-surface-disabled aria-disabled:text-on-surface-muted aria-disabled:hover:bg-neutral aria-disabled:hover:text-on-surface-muted";

/**
 * The fallback notice's Try again button (EXPERIENCE.md Fallback notice). It
 * resubmits the URL's Query with the URL's Search bar values through the same
 * `submit` as the Smart search box, so the box shows that Query and the
 * Submitting state runs. It is `aria-disabled`, and ignores presses, while a
 * Query is submitting. Renders nothing without Smart search.
 */
export function TryAgain({ query, current }: { query: string; current: SearchBarCriteria }) {
  const smart = useSmartSearch();
  if (!smart) return null;
  const { pending, submit } = smart;

  return (
    <button
      type="button"
      aria-disabled={pending || undefined}
      onClick={() => {
        if (!pending) submit(query, current);
      }}
      className={`${secondaryButton} ${busy} shrink-0`}
    >
      Try again
    </button>
  );
}
