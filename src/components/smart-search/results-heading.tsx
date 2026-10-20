"use client";

import { useEffect, useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { focusChipTarget, focusIsLost } from "@/components/smart-search/criteria-chips";
import { useSmartSearch } from "@/components/smart-search/smart-search-context";

/**
 * The Search results headline. It is the MVP `PageHeading`, except when it
 * arrives after a Criteria chip removal (EXPERIENCE.md Criteria chip): then it
 * does not take focus, the results status says its text once, and focus is
 * restored to the chip row if the update dropped it.
 */
export function ResultsHeading({
  children,
  describedBy,
}: {
  children: string;
  describedBy?: string;
}) {
  const smart = useSmartSearch();
  // Read once, when this search's heading arrives.
  const [arrival] = useState(() => smart?.chipRemoval ?? null);
  const announce = smart?.announceResults;
  const finish = smart?.finishChipRemoval;

  useEffect(() => {
    if (!arrival) return;
    if (focusIsLost()) focusChipTarget(arrival.focus);
    announce?.(children);
    finish?.();
  }, [arrival, children, announce, finish]);

  return (
    <PageHeading describedBy={describedBy} focusOnArrival={!arrival}>
      {children}
    </PageHeading>
  );
}
