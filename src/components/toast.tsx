"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How long a toast stays up while it is not hovered. */
export const TOAST_DURATION_MS = 5000;

export type ToastMessage = {
  /** New for every `show`, so the same text shown twice restarts the timer. */
  id: number;
  text: string;
};

/** The toast state for one `Toast`: `show` replaces any toast already up. */
export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const nextId = useRef(0);
  const show = useCallback((text: string) => {
    nextId.current += 1;
    setToast({ id: nextId.current, text });
  }, []);
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, show, dismiss };
}

type ToastProps = {
  toast: ToastMessage | null;
  onDismiss: () => void;
};

/**
 * A short confirmation such as "Link copied" (EXPERIENCE.md Toast, DESIGN.md
 * Toast). The `role="status"` region is always in the page, so screen readers
 * announce each message. It sits at the bottom centre for 5 seconds, held
 * while hovered.
 */
export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-space-lg z-40 flex justify-center px-gutter"
    >
      {toast ? <ToastPanel key={toast.id} text={toast.text} onDismiss={onDismiss} /> : null}
    </div>
  );
}

function ToastPanel({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (hovered) return;
    const timer = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [hovered, onDismiss]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="pointer-events-auto max-w-120 rounded-md border border-primary bg-primary-subtle p-space-md text-body-sm text-on-surface"
    >
      {text}
    </div>
  );
}
