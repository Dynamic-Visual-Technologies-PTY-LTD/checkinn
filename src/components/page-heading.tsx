"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

const noSubscribe = () => () => {};

/**
 * A page's main headline (EXPERIENCE.md Focus after navigation): the result
 * count on Search results, the hotel name on the Hotel page, and each booking
 * step's headline. When it arrives by client navigation it takes focus once
 * the page is in, so it is read first. When it is hydrated from the server's
 * HTML, on a full page load, focus stays at the top of the document.
 */
export function PageHeading({
  children,
  className = "text-headline-lg-responsive",
  describedBy,
  focusOnArrival = true,
}: {
  children: ReactNode;
  /** The headline's type style; `headline-lg` by default. */
  className?: string;
  /** Ids of what is read with the headline, such as Smart search notices. */
  describedBy?: string;
  /**
   * Whether it takes focus when it arrives by client navigation. Off after a
   * Criteria chip removal, where focus stays in the chip row.
   */
  focusOnArrival?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  // The server snapshot is used only while hydrating. The first render's
  // value is kept, so the re-render after hydration does not count.
  const hydrating = useSyncExternalStore(noSubscribe, () => false, () => true);
  const hydrated = useRef(hydrating);
  // Decided when it arrives; later renders do not move focus.
  const skipFocus = useRef(!focusOnArrival);

  useEffect(() => {
    if (!hydrated.current && !skipFocus.current) ref.current?.focus();
  }, []);

  return (
    <h1 ref={ref} tabIndex={-1} className={className} aria-describedby={describedBy || undefined}>
      {children}
    </h1>
  );
}
