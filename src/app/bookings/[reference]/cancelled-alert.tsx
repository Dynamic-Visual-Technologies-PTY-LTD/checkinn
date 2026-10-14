"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/icons";

export const CANCELLED_MESSAGE = "Your booking is cancelled.";

/** True while the address bar still carries a notice. Read only after commit. */
function noticeInUrl(): boolean {
  return new URLSearchParams(window.location.search).has("notice");
}

/**
 * The cancelled alert (EXPERIENCE.md Cancelled): an `alert-success` after the
 * cancel. It takes focus once when it appears, so it is not also a live
 * region, and then takes `notice` out of the address bar (replacing the
 * history entry), so a reload shows the cancelled Booking without it. A page
 * restored from history without the notice in its URL hides it.
 */
export function CancelledAlert() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  // Set once shown, so a second run of the effect (StrictMode in
  // development, or Activity showing the page again) never hides it.
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    if (!noticeInUrl()) {
      // Already shown and cleared: this is a restore from history.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL is only reliable after commit
      setVisible(false);
      return;
    }
    shown.current = true;
    ref.current?.focus();
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  if (!visible) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="group"
      aria-labelledby="cancelled-alert-message"
      className="flex items-start gap-space-sm rounded-md border border-success bg-surface p-space-md text-on-surface"
    >
      <Icon name="check" className="mt-0.5 shrink-0 text-success" />
      <p id="cancelled-alert-message">{CANCELLED_MESSAGE}</p>
    </div>
  );
}
