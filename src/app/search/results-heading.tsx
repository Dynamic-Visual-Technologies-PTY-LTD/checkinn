"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";

const noSubscribe = () => () => {};

/**
 * The Search results headline. When it arrives by client navigation it takes
 * focus once the results are in, so the result count is read first
 * (EXPERIENCE.md Focus after navigation). When it is hydrated from the
 * server's HTML, on a full page load, focus stays at the top of the document.
 */
export function ResultsHeading({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  // The server snapshot is used only while hydrating. The first render's
  // value is kept, so the re-render after hydration does not count.
  const hydrating = useSyncExternalStore(noSubscribe, () => false, () => true);
  const hydrated = useRef(hydrating);

  useEffect(() => {
    if (!hydrated.current) ref.current?.focus();
  }, []);

  return (
    <h1 ref={ref} tabIndex={-1} className="text-headline-lg-responsive">
      {children}
    </h1>
  );
}
