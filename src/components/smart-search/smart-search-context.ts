"use client";

import { createContext, useContext } from "react";
import type { SearchBarCriteria } from "@/domain/interpretation";

/** The Submitting status region's id: the box and the Search bar point at it. */
export const SMART_STATUS_ID = "ss-status";

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
};

export const SmartSearchContext = createContext<SmartSearchState | null>(null);

/** The Smart search state, or `null` when Smart search is off. */
export function useSmartSearch(): SmartSearchState | null {
  return useContext(SmartSearchContext);
}
