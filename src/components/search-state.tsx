"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Party, Stay } from "@/domain/types";

type SearchState = {
  stay: Stay | null;
  party: Party;
  setStay: (stay: Stay) => void;
  setParty: (party: Party) => void;
};

const SearchStateContext = createContext<SearchState | null>(null);

type SearchStateProviderProps = {
  initialStay: Stay | null;
  initialParty: Party;
  /**
   * When it changes, Stay and Party start again from the initial values, as
   * a new search or Back does on Search results. Used instead of a `key`, so
   * what the provider wraps is not re-mounted.
   */
  resetKey?: string;
  children: ReactNode;
};

/**
 * The search bar's live, unsubmitted Stay and Party, shared with the City
 * tile links so they search with what the guest has picked (FR-27).
 */
export function SearchStateProvider({
  initialStay,
  initialParty,
  resetKey,
  children,
}: SearchStateProviderProps) {
  const [stay, setStay] = useState<Stay | null>(initialStay);
  const [party, setParty] = useState<Party>(initialParty);
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setStay(initialStay);
    setParty(initialParty);
  }
  const value = useMemo(() => ({ stay, party, setStay, setParty }), [stay, party]);
  return <SearchStateContext value={value}>{children}</SearchStateContext>;
}

/** The shared Stay and Party, or `null` outside a `SearchStateProvider`. */
export function useSearchState(): SearchState | null {
  return useContext(SearchStateContext);
}

/** The shared Stay and Party, for components that only work inside the provider. */
export function useRequiredSearchState(): SearchState {
  const state = useContext(SearchStateContext);
  if (!state) throw new Error("This component needs a SearchStateProvider.");
  return state;
}
