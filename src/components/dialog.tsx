"use client";

import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { iconButton, overlayEnter } from "@/components/button-styles";
import { initialFocusTarget, tabbables } from "@/components/focus";
import { Icon } from "@/components/icons/icons";

type DialogProps = {
  open: boolean;
  /** Called on Escape and on the sheet's Close button. */
  onClose: () => void;
  /** The visible title, which also names the dialog. */
  title: string;
  children: ReactNode;
  /**
   * `dialog`: centred, at most 480px wide, over the dimmed page.
   * `sheet`: covers the screen, with a Close button beside the title.
   */
  variant?: "dialog" | "sheet";
  /** Focused on open. Defaults to `[data-autofocus]`, then the first tabbable. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Focused on close. Defaults to whatever had focus when the dialog opened. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  id?: string;
};

const subscribeNothing = () => () => {};

/**
 * A modal dialog (EXPERIENCE.md Dialog, Popover and sheet). It renders into
 * `document.body`, makes everything else inert, keeps Tab inside, closes on
 * Escape and gives focus back on close.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  variant = "dialog",
  initialFocusRef,
  returnFocusRef,
  id,
}: DialogProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Portals need the document, so the dialog renders on the client only.
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);

  useEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    if (!open || !root || !panel) return;

    const returnTo =
      returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);

    const madeInert: Element[] = [];
    for (const el of Array.from(document.body.children)) {
      if (el === root || el.hasAttribute("inert")) continue;
      el.setAttribute("inert", "");
      madeInert.push(el);
    }

    (initialFocusRef?.current ?? initialFocusTarget(panel)).focus();

    // Inert keeps focus out in browsers; this also catches anything that
    // slips past it, such as a programmatic focus.
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !root.contains(event.target)) {
        initialFocusTarget(panel).focus();
      }
    };
    document.addEventListener("focusin", onFocusIn);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      for (const el of madeInert) el.removeAttribute("inert");
      returnTo?.focus();
    };
  }, [open, isClient, initialFocusRef, returnFocusRef]);

  if (!open || !isClient) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) return;

    const items = tabbables(panelRef.current);
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const sheet = variant === "sheet";

  return createPortal(
    <div
      ref={rootRef}
      className={
        sheet
          ? `fixed inset-0 z-50 bg-neutral ${overlayEnter}`
          : `fixed inset-0 z-50 flex items-center justify-center bg-neutral/70 p-space-md ${overlayEnter}`
      }
    >
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={
          sheet
            ? "flex h-full flex-col text-on-surface"
            : "flex max-h-full w-full max-w-120 flex-col gap-space-md overflow-y-auto rounded-md border border-primary bg-neutral p-space-lg text-on-surface"
        }
      >
        {sheet ? (
          <div className="flex min-h-18 items-center justify-between gap-space-md p-space-md">
            <h2 id={titleId} className="text-headline-sm">
              {title}
            </h2>
            <button type="button" aria-label="Close" onClick={onClose} className={iconButton}>
              <Icon name="close" />
            </button>
          </div>
        ) : (
          <h2 id={titleId} className="text-headline-sm">
            {title}
          </h2>
        )}
        {sheet ? <div className="flex min-h-0 flex-1 flex-col">{children}</div> : children}
      </div>
    </div>,
    document.body,
  );
}
