"use client";

import { useSyncExternalStore } from "react";

/** The width where pickers switch from a phone sheet to a popover. */
export const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * Whether a media query matches, kept in sync as the viewport changes. The
 * server, and a browser without `matchMedia`, report no match.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () =>
      typeof window.matchMedia === "function" && window.matchMedia(query).matches,
    () => false,
  );
}

/** True from 768px: pickers open as popovers, below it as sheets. */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}
