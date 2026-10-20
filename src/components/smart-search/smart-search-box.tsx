"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { iconButton } from "@/components/button-styles";
import { Icon } from "@/components/icons/icons";
import { useRequiredSearchState } from "@/components/search-state";
import {
  SMART_INPUT_ID,
  SMART_STATUS_ID,
  useSmartSearch,
} from "@/components/smart-search/smart-search-context";
import { MAX_QUERY_LENGTH } from "@/domain/criteria";

const INPUT_ID = SMART_INPUT_ID;
const HINT_ID = "ss-hint";
const COUNTER_ID = "ss-counter";
const ERROR_ID = "ss-error";

/** The counter shows from this many characters (EXPERIENCE.md Character counter). */
export const COUNTER_FROM = 250;

/** Said once, politely, when the box reaches its limit (EXPERIENCE.md Character counter). */
export const LIMIT_MESSAGE = `${MAX_QUERY_LENGTH} of ${MAX_QUERY_LENGTH} characters, the limit`;

export const SMART_SEARCH_PLACEHOLDER = "Try: quiet hotel with a pool in Cape Town this weekend";

type SmartSearchBoxProps = {
  /** The submitted Query from the URL; empty on Home. */
  initialQuery?: string;
  /** The Destination in the URL, sent as part of the current criteria. */
  destination?: string;
};

/**
 * The Smart search box (EXPERIENCE.md Smart search box): a one-line textarea
 * that grows to two, labelled "Describe your stay". Enter or the submit
 * button sends the Query with the Search bar's current Stay and Party. It
 * needs a `SmartSearchProvider` and a `SearchStateProvider` around it.
 */
export function SmartSearchBox({ initialQuery = "", destination = "" }: SmartSearchBoxProps) {
  const smart = useSmartSearch();
  if (!smart) throw new Error("SmartSearchBox needs a SmartSearchProvider.");
  const { stay, party } = useRequiredSearchState();
  const [value, setValue] = useState(initialQuery);
  // Every submit, such as an Example query, fills the box with its Query,
  // even when it repeats the last one.
  const [shownCount, setShownCount] = useState(smart.submitCount);
  if (smart.submitCount !== shownCount) {
    setShownCount(smart.submitCount);
    setValue(smart.submittedQuery);
  }
  // Set when the box reaches 300 characters, so the status region says it once.
  const [limitMessage, setLimitMessage] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { pending, error, setBoxIsEmpty, submit } = smart;

  // The box is re-mounted with each URL and shows its Query, so the Search
  // bar's "box is empty" starts from that Query (AD-33).
  useEffect(() => {
    setBoxIsEmpty(initialQuery.trim() === "");
  }, [initialQuery, setBoxIsEmpty]);

  const empty = value.trim() === "";
  const length = value.length;

  function change(next: string) {
    const capped = next.slice(0, MAX_QUERY_LENGTH);
    const reached = capped.length === MAX_QUERY_LENGTH;
    if (reached && value.length < MAX_QUERY_LENGTH) setLimitMessage(LIMIT_MESSAGE);
    else if (!reached) setLimitMessage("");
    setValue(capped);
    setBoxIsEmpty(capped.trim() === "");
  }

  function trySubmit() {
    if (pending || empty) return;
    setLimitMessage("");
    submit(value.trim(), { q: destination, stay, party });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    // Enter never adds a line break (EXPERIENCE.md Interaction Primitives).
    event.preventDefault();
    trySubmit();
  }

  function clear() {
    if (pending) return;
    change("");
    inputRef.current?.focus();
  }

  const describedBy = [HINT_ID, COUNTER_ID, SMART_STATUS_ID, error ? ERROR_ID : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-space-xs">
      <label htmlFor={INPUT_ID} className="text-body-sm text-on-surface-muted">
        Describe your stay
      </label>
      {/* The 2px blue-to-cyan border (Smart search DESIGN.md); solid CanvasText in forced colours. */}
      <div className="flex min-h-14 items-center gap-space-sm rounded-md border-2 border-transparent [background:linear-gradient(var(--color-surface),var(--color-surface))_padding-box,linear-gradient(to_right,var(--color-primary),var(--color-secondary))_border-box] p-1.5 has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-tertiary forced-colors:[border-color:CanvasText] forced-colors:[background:Canvas]">
        <Icon name="search" className="ml-space-xs shrink-0 text-on-surface-muted" />
        <textarea
          ref={inputRef}
          id={INPUT_ID}
          name="sq"
          rows={1}
          maxLength={MAX_QUERY_LENGTH}
          enterKeyHint="search"
          value={value}
          readOnly={pending}
          onChange={(event) => change(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={SMART_SEARCH_PLACEHOLDER}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="max-h-[3.2em] min-w-0 flex-1 resize-none bg-surface py-space-xs text-input-mobile text-on-surface placeholder:text-on-surface-muted focus-visible:outline-none md:text-body-md field-sizing-content"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear description"
            aria-disabled={pending || undefined}
            onClick={clear}
            className={iconButton}
          >
            <Icon name="close" />
          </button>
        )}
        <button
          type="button"
          aria-label="Search by description"
          aria-disabled={pending || empty || undefined}
          onClick={trySubmit}
          className={iconButton}
        >
          {pending ? (
            <Icon name="spinner" className="motion-safe:animate-spin" />
          ) : (
            <Icon name="search" />
          )}
        </button>
      </div>
      <p id={HINT_ID} className="sr-only">
        Press Enter to search
      </p>
      <div className="flex items-start justify-between gap-space-sm text-body-sm text-on-surface-muted">
        <p id={SMART_STATUS_ID} role="status">
          {pending ? "Reading your search…" : limitMessage}
        </p>
        <p id={COUNTER_ID} className="shrink-0">
          {length >= COUNTER_FROM && (
            <>
              <span aria-hidden="true">
                {length} / {MAX_QUERY_LENGTH}
              </span>
              <span className="sr-only">
                {length} of {MAX_QUERY_LENGTH} characters used
              </span>
            </>
          )}
        </p>
      </div>
      {error && (
        <p id={ERROR_ID} className="flex items-center gap-space-xs text-body-sm text-error">
          <Icon name="error" className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
