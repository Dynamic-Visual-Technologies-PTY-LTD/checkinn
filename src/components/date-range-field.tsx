"use client";

import { useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { secondaryButton } from "@/components/button-styles";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons/icons";
import { Popover } from "@/components/popover";
import { RangeCalendar } from "@/components/range-calendar";
import { useIsDesktop } from "@/components/use-media-query";
import { pickDate, stayLabel, type DateRange } from "@/domain/dates";
import type { IsoDate, Stay } from "@/domain/types";

type DateRangeFieldProps = {
  today: IsoDate;
  /** The current Stay, or `null` when no dates are set. */
  value: Stay | null;
  /** Called when the picker closes with a different, complete Stay. */
  onChange: (stay: Stay) => void;
  /** Controlled open state, so a parent can keep one overlay open at a time. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The visible field label, which also names the popover. */
  label?: string;
  /**
   * While Smart search interprets a Query (AD-33): the trigger is
   * `aria-disabled`, ignores presses and is described by this status id.
   */
  busyStatusId?: string;
  /** The trigger, so a form can move focus to an invalid field. */
  triggerRef?: RefObject<HTMLButtonElement | null>;
  /** Id of the error message under the field, which describes the trigger. */
  errorId?: string;
  /** Popover placement classes (see `Popover`). */
  popoverPlacement?: string;
};

function toRange(stay: Stay | null): DateRange {
  return { checkIn: stay?.checkIn ?? null, checkOut: stay?.checkOut ?? null };
}

/**
 * The Dates field: a trigger that opens the range calendar in a popover from
 * 768px and in a modal sheet below it (EXPERIENCE.md Range calendar).
 */
export function DateRangeField({
  today,
  value,
  onChange,
  open: openProp,
  onOpenChange,
  label = "Dates",
  triggerRef: triggerRefProp,
  errorId,
  popoverPlacement,
  busyStatusId,
}: DateRangeFieldProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const [draft, setDraft] = useState<DateRange>(() => toRange(value));
  const [wasOpen, setWasOpen] = useState(open);
  const anchorRef = useRef<HTMLDivElement>(null);
  const ownTriggerRef = useRef<HTMLButtonElement>(null);
  const triggerRef = triggerRefProp ?? ownTriggerRef;
  const panelId = useId();
  const desktop = useIsDesktop();

  // Each opening starts from the current Stay.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(toRange(value));
  }

  function setOpen(next: boolean) {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  }

  /** Done, Escape, Close or an outside press: keep a complete range, else discard. */
  function close() {
    if (
      draft.checkIn &&
      draft.checkOut &&
      (draft.checkIn !== value?.checkIn || draft.checkOut !== value?.checkOut)
    ) {
      onChange({ checkIn: draft.checkIn, checkOut: draft.checkOut });
    }
    setOpen(false);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" && !open && !busyStatusId) {
      event.preventDefault();
      setOpen(true);
    }
  }

  const done = (
    <button
      type="button"
      onClick={close}
      className={`${secondaryButton} ${desktop ? "" : "w-full"}`}
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
        aria-describedby={[errorId, busyStatusId].filter(Boolean).join(" ") || undefined}
        aria-disabled={busyStatusId ? true : undefined}
        onClick={() => {
          if (busyStatusId) return;
          if (open) close();
          else setOpen(true);
        }}
        onKeyDown={onTriggerKeyDown}
        className="relative flex min-h-11 w-full items-center gap-space-sm text-left"
      >
        <Icon name="calendar" className="shrink-0 text-on-surface-muted" />
        <span className="flex flex-col">
          <span className="text-body-sm text-on-surface-muted">{label}</span>{" "}
          <span className="text-body-md">{value ? stayLabel(value) : "Add dates"}</span>
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
          placement={popoverPlacement}
        >
          <RangeCalendar
            today={today}
            range={draft}
            onPick={(date) => setDraft((range) => pickDate(range, date))}
            layout="desktop"
            action={done}
          />
        </Popover>
      ) : (
        <Dialog
          id={panelId}
          open={open}
          onClose={close}
          title="Select dates"
          variant="sheet"
          returnFocusRef={triggerRef}
        >
          <RangeCalendar
            today={today}
            range={draft}
            onPick={(date) => setDraft((range) => pickDate(range, date))}
            layout="phone"
            action={done}
          />
        </Dialog>
      )}
    </div>
  );
}
