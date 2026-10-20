"use client";

import { useCallback, useMemo, useState, useTransition, type ReactNode } from "react";
import { NETWORK_ERROR, redirectTarget } from "@/components/server-action";
import {
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
  children,
}: {
  /** The submitted Query from the URL; empty on Home. */
  initialQuery?: string;
  children: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [submitCount, setSubmitCount] = useState(0);
  const [boxIsEmpty, setBoxIsEmpty] = useState(initialQuery.trim() === "");
  const [error, setError] = useState<string | null>(null);

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
    () => ({ pending, submittedQuery, submitCount, boxIsEmpty, setBoxIsEmpty, error, submit }),
    [pending, submittedQuery, submitCount, boxIsEmpty, error, submit],
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
