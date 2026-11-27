"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { iconButton, primaryButton } from "@/components/button-styles";
import { DateRangeField } from "@/components/date-range-field";
import { Icon } from "@/components/icons/icons";
import { countLabel, OccupancyField } from "@/components/occupancy-field";
import { useRequiredSearchState } from "@/components/search-state";
import { todayIn } from "@/domain/clock";
import { problemMessage, searchHref, validateStay } from "@/domain/criteria";
import { compactStayLabel } from "@/domain/dates";
import type { IsoDate, Party, Stay } from "@/domain/types";

type SearchBarProps = {
  /** Today, read on the server; the calendar disables the days before it. */
  today: IsoDate;
  initialQuery?: string;
  /** Today at submit time. Tests inject it; the page may have been open a while. */
  getToday?: () => IsoDate;
  /**
   * Below 768px, start as a one-line summary that expands to the full bar on
   * tap (Search results). From 768px the full bar always shows.
   */
  collapsible?: boolean;
  /** A message to show under Dates from the start, e.g. for a stale link. */
  datesError?: string;
};

/** The collapsed bar's summary: "Cape Town · 13–15 Nov · 2 adults". */
export function searchSummary(query: string, stay: Stay | null, party: Party): string {
  const people = [countLabel("adults", party.adults)];
  if (party.children > 0) people.push(countLabel("children", party.children));
  return [
    query.trim() || "All destinations",
    stay ? compactStayLabel(stay) : "Add dates",
    people.join(", "),
  ].join(" · ");
}

type OpenField = "dates" | "occupancy" | null;

/**
 * The search bar (EXPERIENCE.md Search bar): Destination, Dates, Occupancy
 * and Search. It validates on submit and pushes the `/search` URL. Its Stay
 * and Party live in the surrounding `SearchStateProvider`.
 */
export function SearchBar({
  today,
  initialQuery = "",
  getToday = todayIn,
  collapsible = false,
  datesError,
}: SearchBarProps) {
  const { stay, party, setStay, setParty } = useRequiredSearchState();

  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [openField, setOpenField] = useState<OpenField>(null);
  const [dateErrors, setDateErrors] = useState<string[]>(datesError ? [datesError] : []);
  // A date error must be seen, so the bar starts expanded with one.
  const [expanded, setExpanded] = useState(!collapsible || Boolean(datesError));
  const focusInvalid = useRef(false);
  const focusDestination = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const datesRef = useRef<HTMLButtonElement>(null);
  const inputId = useId();
  const datesErrorId = useId();
  const formId = useId();

  // Focus moves once the messages are in the DOM, so the field is announced
  // with its description.
  useEffect(() => {
    if (focusInvalid.current) {
      focusInvalid.current = false;
      datesRef.current?.focus();
    }
  }, [dateErrors]);

  // Expanding moves focus into the bar once it is shown.
  useEffect(() => {
    if (focusDestination.current) {
      focusDestination.current = false;
      inputRef.current?.focus();
    }
  }, [expanded]);

  function expand() {
    focusDestination.current = true;
    setExpanded(true);
  }

  /** Opening one picker closes the other, so overlays never stack. */
  function openChange(field: Exclude<OpenField, null>) {
    return (open: boolean) =>
      setOpenField((current) => (open ? field : current === field ? null : current));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems = validateStay(stay, getToday());
    if (problems.length > 0) {
      focusInvalid.current = true;
      setDateErrors(problems.map(problemMessage));
      return;
    }
    router.push(searchHref({ q: query, stay, party }));
  }

  function clearQuery() {
    setQuery("");
    inputRef.current?.focus();
  }

  const form = (
    <form
      id={formId}
      role="search"
      aria-label="Search hotels"
      noValidate
      onSubmit={onSubmit}
      className="flex min-h-18 flex-col rounded-md border border-primary bg-surface p-space-sm text-body-md text-on-surface md:flex-row md:flex-wrap md:items-center xl:flex-nowrap"
    >
      <div className="flex items-center gap-space-sm border-b border-primary px-space-sm py-space-xs md:basis-full xl:min-w-0 xl:flex-1 xl:basis-auto xl:border-r xl:border-b-0">
        <Icon name="location-pin" className="shrink-0 text-on-surface-muted" />
        <div className="flex min-w-0 flex-1 flex-col">
          <label htmlFor={inputId} className="text-body-sm text-on-surface-muted">
            Destination
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Where are you going?"
            autoComplete="off"
            enterKeyHint="search"
            className="min-h-11 w-full min-w-0 rounded-sm bg-surface text-input-mobile text-on-surface placeholder:text-on-surface-muted md:min-h-9.5 md:text-body-md"
          />
        </div>
        {query && (
          <button
            type="button"
            aria-label="Clear destination"
            onClick={clearQuery}
            className={iconButton}
          >
            <Icon name="close" />
          </button>
        )}
      </div>

      <div className="border-b border-primary px-space-sm py-space-xs md:flex-1 md:border-r md:border-b-0 xl:flex-none">
        {/* Invalid: 1px Coral border (DESIGN.md Input); transparent at rest, so nothing shifts. */}
        <div
          className={`rounded-sm border ${dateErrors.length > 0 ? "border-error" : "border-transparent"}`}
        >
          <DateRangeField
            today={today}
            value={stay}
            onChange={(next) => {
              setStay(next);
              setDateErrors([]);
            }}
            open={openField === "dates"}
            onOpenChange={openChange("dates")}
            triggerRef={datesRef}
            errorId={dateErrors.length > 0 ? datesErrorId : undefined}
            // The two-month calendar is wider than the field: below 1280px the
            // field starts the row, from 1280px it sits right of Destination.
            popoverPlacement="left-0 xl:right-0 xl:left-auto"
          />
        </div>
        {dateErrors.length > 0 && (
          <div id={datesErrorId} className="flex flex-col gap-space-xs pb-space-xs">
            {dateErrors.map((message) => (
              <p key={message} className="flex items-center gap-space-xs text-body-sm text-error">
                <Icon name="error" className="shrink-0" />
                {message}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="px-space-sm py-space-xs md:flex-1 xl:flex-none">
        <OccupancyField
          value={party}
          onChange={setParty}
          open={openField === "occupancy"}
          onOpenChange={openChange("occupancy")}
        />
      </div>

      <button
        type="submit"
        className={`${primaryButton} mt-space-sm w-full md:mt-0 md:ml-space-sm md:w-auto`}
      >
        Search
      </button>
    </form>
  );

  if (expanded) return form;

  const summary = searchSummary(query, stay, party);
  return (
    <div>
      <button
        type="button"
        aria-expanded={false}
        aria-controls={formId}
        aria-label={`Change search: ${summary}`}
        onClick={expand}
        className="flex min-h-14 w-full items-center gap-space-sm rounded-md border border-primary bg-surface px-space-md py-space-sm text-left text-body-md text-on-surface hover:border-tertiary md:hidden"
      >
        <Icon name="search" className="shrink-0 text-on-surface-muted" />
        <span className="min-w-0 flex-1">{summary}</span>
      </button>
      {/* Collapsed on phones only: from 768px the full bar shows. */}
      <div className="hidden md:block">{form}</div>
    </div>
  );
}

/**
 * A block the size of the search bar while today's date is read. `collapsed`
 * matches a collapsible bar, which is one line on phones.
 */
export function SearchBarSkeleton({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`${collapsed ? "min-h-14" : "min-h-72"} rounded-md border border-primary bg-primary-subtle motion-safe:animate-pulse md:min-h-36 xl:min-h-18`}
    />
  );
}
