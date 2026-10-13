"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { iconButton, secondaryButton } from "@/components/button-styles";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons/icons";
import { Popover } from "@/components/popover";
import { useIsDesktop } from "@/components/use-media-query";
import type { Party } from "@/domain/types";

type PartyKey = keyof Party;

/** Stepper limits (EXPERIENCE.md Occupancy picker). Rooms never exceed adults. */
export const PARTY_LIMITS = {
  adults: { min: 1, max: 10 },
  children: { min: 0, max: 6 },
  rooms: { min: 1, max: 5 },
} as const satisfies Record<PartyKey, { min: number; max: number }>;

const ROWS: { key: PartyKey; label: string }[] = [
  { key: "adults", label: "Adults" },
  { key: "children", label: "Children" },
  { key: "rooms", label: "Rooms" },
];

const NOUNS: Record<PartyKey, [string, string]> = {
  adults: ["adult", "adults"],
  children: ["child", "children"],
  rooms: ["room", "rooms"],
};

/** "1 adult", "0 children", "2 rooms" */
export function countLabel(key: PartyKey, n: number): string {
  return `${n} ${NOUNS[key][n === 1 ? 0 : 1]}`;
}

/** "2 adults · 0 children · 1 room" */
export function partyLabel(party: Party): string {
  return ROWS.map(({ key }) => countLabel(key, party[key])).join(" · ");
}

function maxOf(key: PartyKey, party: Party): number {
  return key === "rooms"
    ? Math.min(PARTY_LIMITS.rooms.max, party.adults)
    : PARTY_LIMITS[key].max;
}

type OccupancyFieldProps = {
  /** The current Party. */
  value: Party;
  /** Called when the picker closes with a different Party. */
  onChange: (party: Party) => void;
  /** Controlled open state, so a parent can keep one overlay open at a time. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The visible field label, which also names the popover. */
  label?: string;
};

/**
 * The Occupancy field: a trigger that opens steppers for adults, children
 * and Rooms, in a popover from 768px and in a modal sheet below it.
 */
export function OccupancyField({
  value,
  onChange,
  open: openProp,
  onOpenChange,
  label = "Occupancy",
}: OccupancyFieldProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const [draft, setDraft] = useState<Party>(value);
  const [wasOpen, setWasOpen] = useState(open);
  // `repeat` flips when the same text is set again, so the live region's
  // content changes and screen readers announce it again.
  const [message, setMessageState] = useState({ text: "", repeat: false });
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const idPrefix = useId();
  const desktop = useIsDesktop();

  // Each opening starts from the current Party.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(value);
      setMessageState({ text: "", repeat: false });
    }
  }

  function setOpen(next: boolean) {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  }

  function close() {
    if (
      draft.adults !== value.adults ||
      draft.children !== value.children ||
      draft.rooms !== value.rooms
    ) {
      onChange(draft);
    }
    setOpen(false);
  }

  function setMessage(text: string) {
    setMessageState((prev) => ({
      text,
      repeat: prev.text === text ? !prev.repeat : false,
    }));
  }

  function step(key: PartyKey, delta: 1 | -1) {
    const limit = delta > 0 ? maxOf(key, draft) : PARTY_LIMITS[key].min;
    const limitText = (n: number) =>
      `${delta > 0 ? "Maximum" : "Minimum"} ${countLabel(key, n)}`;

    if (delta > 0 ? draft[key] >= limit : draft[key] <= limit) {
      setMessage(limitText(limit));
      return;
    }

    const next = { ...draft, [key]: draft[key] + delta };
    const roomsLowered = next.rooms > next.adults;
    if (roomsLowered) next.rooms = next.adults;
    setDraft(next);

    const nextLimit = delta > 0 ? maxOf(key, next) : PARTY_LIMITS[key].min;
    const text = next[key] === nextLimit ? limitText(next[key]) : countLabel(key, next[key]);
    setMessage(roomsLowered ? `${text}, ${countLabel("rooms", next.rooms)}` : text);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      setOpen(true);
    }
  }

  const rows = (
    <div className="flex flex-col gap-space-md">
      {ROWS.map(({ key, label: rowLabel }) => {
        const labelId = `${idPrefix}-${key}`;
        const atMin = draft[key] <= PARTY_LIMITS[key].min;
        const atMax = draft[key] >= maxOf(key, draft);
        return (
          <div
            key={key}
            role="group"
            aria-labelledby={labelId}
            className="flex items-center justify-between gap-space-lg"
          >
            <span id={labelId} className="text-body-md">
              {rowLabel}
            </span>
            <span className="flex items-center gap-space-md">
              <button
                type="button"
                aria-label={`Decrease ${rowLabel.toLowerCase()}`}
                aria-disabled={atMin || undefined}
                onClick={() => step(key, -1)}
                className={`${iconButton} bg-surface`}
              >
                <Icon name="minus" />
              </button>
              <span className="w-8 text-center text-headline-sm">{draft[key]}</span>
              <button
                type="button"
                aria-label={`Increase ${rowLabel.toLowerCase()}`}
                aria-disabled={atMax || undefined}
                onClick={() => step(key, 1)}
                className={`${iconButton} bg-surface`}
              >
                <Icon name="plus" />
              </button>
            </span>
          </div>
        );
      })}
      <p role="status" aria-live="polite" className="sr-only">
        {message.text}
        {message.repeat ? " " : ""}
      </p>
    </div>
  );

  const done = (
    <button
      type="button"
      onClick={close}
      className={`${secondaryButton} ${desktop ? "self-end" : "w-full"}`}
    >
      Done
    </button>
  );

  return (
    <div ref={anchorRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={onTriggerKeyDown}
        className="relative flex min-h-11 w-full items-center gap-space-sm text-left"
      >
        <Icon name="person" className="shrink-0 text-on-surface-muted" />
        <span className="flex flex-col">
          <span className="text-body-sm text-on-surface-muted">{label}</span>{" "}
          <span className="text-body-md">{partyLabel(open ? draft : value)}</span>
        </span>
        {open && (
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-secondary" />
        )}
      </button>

      {desktop ? (
        <Popover
          id={panelId}
          open={open}
          onClose={close}
          label={label}
          anchorRef={anchorRef}
          returnFocusRef={triggerRef}
        >
          <div className="flex w-80 flex-col gap-space-lg">
            {rows}
            {done}
          </div>
        </Popover>
      ) : (
        <Dialog
          id={panelId}
          open={open}
          onClose={close}
          title="Select occupancy"
          variant="sheet"
          returnFocusRef={triggerRef}
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-space-md">{rows}</div>
          <div className="border-t border-primary p-space-md">{done}</div>
        </Dialog>
      )}
    </div>
  );
}
