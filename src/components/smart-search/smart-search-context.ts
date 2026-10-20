"use client";

import { createContext, useContext } from "react";
import type { CriterionKey } from "@/domain/hard-criteria";
import type { SearchBarCriteria } from "@/domain/interpretation";

/** The Submitting status region's id: the box and the Search bar point at it. */
export const SMART_STATUS_ID = "ss-status";

/** The Smart search box's id, which a Criteria chip removal may focus. */
export const SMART_INPUT_ID = "ss-input";

/**
 * Where focus goes after a Criteria chip removal (EXPERIENCE.md Criteria
 * chip): the chip with that key, or the Smart search box.
 */
export type ChipFocusTarget = CriterionKey | "box";

/** Smart search UI state, owned by `SmartSearchProvider` (AD-33). */
export type SmartSearchState = {
  /** A Query is being interpreted: the box and the Search bar are read-only. */
  pending: boolean;
  /** The last Query submitted, or the one in the URL. */
  submittedQuery: string;
  /** Counts submits, so the box shows each submitted Query, even a repeated one. */
  submitCount: number;
  /** Whether the box is empty now (AD-33); the Search bar reads it at Search time. */
  boxIsEmpty: boolean;
  setBoxIsEmpty: (empty: boolean) => void;
  /** A failure to show under the box, such as `VALIDATION`. */
  error: string | null;
  /** Submits a Query with the Search bar's current criteria. Ignored while pending. */
  submit: (query: string, current: SearchBarCriteria) => void;
  /**
   * Set from a Criteria chip removal until its results arrive: where focus
   * was moved, so it can be restored if the update drops it, and the URL it
   * pushed. Any other navigation clears it.
   */
  chipRemoval: { focus: ChipFocusTarget; target: string } | null;
  /**
   * Records a Criteria chip removal and the URL it pushes; clears the results
   * status, so the new count is said.
   */
  startChipRemoval: (focus: ChipFocusTarget, target: string) => void;
  /** The removal's results have arrived, or another navigation overtook it. */
  finishChipRemoval: () => void;
  /**
   * Records a URL just pushed from Search results (a chip or the Search bar),
   * so the next action builds on it while the navigation is in flight.
   */
  recordPush: (href: string) => void;
  /**
   * The newest Search results URL's parameters: the last pushed one while
   * its navigation is in flight, otherwise the address bar's (AD-21: the
   * newest action wins).
   */
  currentParams: () => URLSearchParams;
  /** The polite results status text (EXPERIENCE.md Criteria chip); empty at page load. */
  resultsStatus: string;
  announceResults: (text: string) => void;
};

export const SmartSearchContext = createContext<SmartSearchState | null>(null);

/** The Smart search state, or `null` when Smart search is off. */
export function useSmartSearch(): SmartSearchState | null {
  return useContext(SmartSearchContext);
}
