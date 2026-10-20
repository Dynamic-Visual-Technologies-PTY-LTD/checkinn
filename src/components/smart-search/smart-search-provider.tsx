"use client";

import { useCallback, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { NETWORK_ERROR, redirectTarget } from "@/components/server-action";
import {
  type ChipFocusTarget,
  SmartSearchContext,
  useSmartSearch,
} from "@/components/smart-search/smart-search-context";
import type { SearchBarCriteria } from "@/domain/interpretation";
import { submitQuery } from "@/features/search/actions";

/**
 * The one client owner of Smart search UI state (AD-33). It wraps the box,
 * the Search bar and the listing on Home and `/search`, outside the per-URL
 * `SearchStateProvider` key, and holds the `submitQuery` transition: while it
 * runs, `pending` makes the box and the Search bar read-only.
 */
export function SmartSearchProvider({
  initialQuery = "",
  url = "",
  children,
}: {
  /** The submitted Query from the URL; empty on Home. */
  initialQuery?: string;
  /** The page's Search results URL (`searchHref`); empty on Home. */
  url?: string;
  children: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [submitCount, setSubmitCount] = useState(0);
  const [boxIsEmpty, setBoxIsEmpty] = useState(initialQuery.trim() === "");
  const [error, setError] = useState<string | null>(null);
  const [chipRemoval, setChipRemoval] = useState<{
    focus: ChipFocusTarget;
    target: string;
  } | null>(null);
  const [resultsStatus, setResultsStatus] = useState("");

  const startChipRemoval = useCallback((focus: ChipFocusTarget, target: string) => {
    setChipRemoval({ focus, target });
    setResultsStatus("");
  }, []);
  const finishChipRemoval = useCallback(() => setChipRemoval(null), []);

  // A URL change that is not the removal's own (Back, Forward, a Search bar
  // Search) ends the removal, so a later heading takes focus as usual.
  const [seenUrl, setSeenUrl] = useState(url);
  if (seenUrl !== url) {
    setSeenUrl(url);
    if (chipRemoval && chipRemoval.target !== url) setChipRemoval(null);
  }

  // The last pushed URL and the address bar when it was pushed: while the
  // address bar has not moved on, the push is still in flight.
  const pushed = useRef<{ href: string; from: string } | null>(null);
  const recordPush = useCallback((href: string) => {
    pushed.current = { href, from: window.location.href };
  }, []);
  const currentParams = useCallback(() => {
    const last = pushed.current;
    if (last && last.from === window.location.href) {
      return new URL(last.href, window.location.href).searchParams;
    }
    return new URLSearchParams(window.location.search);
  }, []);

  // A new Query in the URL (navigation, Back) becomes the submitted one.
  const [seenQuery, setSeenQuery] = useState(initialQuery);
  if (seenQuery !== initialQuery) {
    setSeenQuery(initialQuery);
    setSubmittedQuery(initialQuery);
    setBoxIsEmpty(initialQuery.trim() === "");
    setError(null);
  }

  const submit = useCallback(
    (query: string, current: SearchBarCriteria) => {
      if (pending) return;
      setError(null);
      // A new Query overtakes any chip removal.
      setChipRemoval(null);
      // The box shows the submitted Query, as when an Example query fills it.
      setSubmittedQuery(query);
      setSubmitCount((count) => count + 1);
      setBoxIsEmpty(query.trim() === "");
      startTransition(async () => {
        try {
          const result = await submitQuery({ query, current });
          // Success redirects and never returns.
          if (result && !result.ok) setError(result.message);
        } catch (caught) {
          if (redirectTarget(caught) === null) setError(NETWORK_ERROR.message);
        }
      });
    },
    [pending],
  );

  const value = useMemo(
    () => ({
      pending,
      submittedQuery,
      submitCount,
      boxIsEmpty,
      setBoxIsEmpty,
      error,
      submit,
      chipRemoval,
      startChipRemoval,
      finishChipRemoval,
      recordPush,
      currentParams,
      resultsStatus,
      announceResults: setResultsStatus,
    }),
    [
      pending,
      submittedQuery,
      submitCount,
      boxIsEmpty,
      error,
      submit,
      chipRemoval,
      startChipRemoval,
      finishChipRemoval,
      recordPush,
      currentParams,
      resultsStatus,
    ],
  );
  return <SmartSearchContext value={value}>{children}</SmartSearchContext>;
}

/**
 * The listing, or the three skeleton cards while a Query is being
 * interpreted (EXPERIENCE.md Submitting). Without Smart search it is the
 * listing.
 */
export function SmartPendingResults({
  skeleton,
  children,
}: {
  skeleton: ReactNode;
  children: ReactNode;
}) {
  const smart = useSmartSearch();
  if (smart?.pending) return <div aria-busy="true">{skeleton}</div>;
  return children;
}

/**
 * The polite results status region (EXPERIENCE.md Criteria chip), empty at
 * page load. After a Criteria chip removal it says the new result count once.
 * It sits outside the per-URL key, so it is never re-mounted.
 */
export function ResultsStatus() {
  const smart = useSmartSearch();
  return (
    <p role="status" aria-label="Result count" className="sr-only">
      {smart?.resultsStatus ?? ""}
    </p>
  );
}
