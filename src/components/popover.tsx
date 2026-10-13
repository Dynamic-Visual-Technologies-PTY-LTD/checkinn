"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { overlayEnter } from "@/components/button-styles";
import { initialFocusTarget } from "@/components/focus";

type PopoverProps = {
  open: boolean;
  /** Called on Escape, a pointer press outside `anchorRef`, or focus leaving it. */
  onClose: () => void;
  /** The accessible name: the field's label, such as "Dates". */
  label: string;
  /** The field around the trigger and the popover. Presses inside it don't close. */
  anchorRef: RefObject<HTMLElement | null>;
  /** The field's trigger. Focus returns to it on close. */
  returnFocusRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  id?: string;
};

/**
 * A non-modal popover under its field (EXPERIENCE.md Popover and sheet). It
 * takes focus on open, closes on Escape or an outside press, and gives focus
 * back to the trigger. Render it inside a `relative` anchor.
 */
export function Popover({
  open,
  onClose,
  label,
  anchorRef,
  returnFocusRef,
  children,
  id,
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const trigger = returnFocusRef.current;

    initialFocusTarget(panel).focus();

    const onPointerDown = (event: Event) => {
      const anchor = anchorRef.current;
      if (event.target instanceof Node && anchor && !anchor.contains(event.target)) {
        close();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);

    // Tabbing out of the field closes it too, so overlays never stack. Focus
    // stays where the guest moved it.
    let focusLeft = false;
    const anchor = anchorRef.current;
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && anchor && !anchor.contains(next)) {
        focusLeft = true;
        close();
      }
    };
    anchor?.addEventListener("focusout", onFocusOut);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      anchor?.removeEventListener("focusout", onFocusOut);
      if (!focusLeft) trigger?.focus();
    };
  }, [open, anchorRef, returnFocusRef]);

  if (!open) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={`absolute top-full left-0 z-50 mt-space-sm rounded-md border border-primary bg-neutral p-space-lg text-on-surface ${overlayEnter}`}
    >
      {children}
    </div>
  );
}
