"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dialog } from "@/components/dialog";
import { roomsLabel, summaryTriggerLabel } from "@/domain/selection";
import { formatZar, spokenZar } from "@/lib/format";

/** How far the toast rises so it clears the bar (the bar is 72px or more). */
const TOAST_OFFSET = "7rem";

type MobileSummaryBarProps = {
  roomCount: number;
  totalRand: number;
  /**
   * The step's primary action: Reserve on the Hotel page, Confirm booking on
   * Booking details. Its items sit in the bar's two-column grid.
   */
  action: ReactNode;
  /** The full booking summary, shown in the sheet. */
  summary: ReactNode;
};

/**
 * The phone summary bar (EXPERIENCE.md Mobile summary bar): fixed to the
 * bottom below 768px, with the rooms, the total and the step's primary
 * button. Tapping the text opens the full summary as a sheet. The toast sits
 * above it (the bar sets `--toast-offset` on the body, which the toast reads).
 */
export function MobileSummaryBar({ roomCount, totalRand, action, summary }: MobileSummaryBarProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.body.style.setProperty("--toast-offset", TOAST_OFFSET);
    return () => {
      document.body.style.removeProperty("--toast-offset");
    };
  }, []);

  return (
    <>
      <div
        role="region"
        aria-label="Booking summary"
        className="fixed inset-x-0 bottom-0 z-30 grid min-h-18 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-space-md gap-y-space-xs border-t border-primary bg-neutral px-gutter py-space-sm md:hidden"
      >
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-label={summaryTriggerLabel(roomCount, spokenZar(totalRand))}
          onClick={() => setOpen(true)}
          className="min-h-11 text-left text-label-md"
        >
          {roomsLabel(roomCount)} · {formatZar(totalRand, { cents: true })}
        </button>
        {action}
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Booking summary"
        variant="sheet"
        returnFocusRef={triggerRef}
      >
        <div className="min-h-0 flex-1 overflow-y-auto p-space-md">{summary}</div>
      </Dialog>
    </>
  );
}
