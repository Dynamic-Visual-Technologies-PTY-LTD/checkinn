"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/icons";
import { parseCriteria, serializeCriteria } from "@/domain/criteria";
import type { IsoDate } from "@/domain/types";

/** True while the address bar still carries a notice. Read only after commit. */
function noticeInUrl(): boolean {
  return new URLSearchParams(window.location.search).has("notice");
}

/**
 * Removes `notice` and `rt` from the address bar, replacing the history entry
 * rather than pushing one, so a reload or Back does not show the alert again.
 * Smart search parameters are dropped too: the Hotel page never carries them
 * (AD-21).
 */
function clearNoticeFromUrl(today: IsoDate) {
  const { criteria } = parseCriteria(new URLSearchParams(window.location.search), today, {
    defaultStay: false,
  });
  const query = serializeCriteria({ ...criteria, notice: null, smart: null });
  window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
}

/**
 * The room-ran-out alert (EXPERIENCE.md Room ran out at confirm): an
 * `alert-error` at the top of the Availability section. It takes focus once
 * when it appears, so it is not also a live region, and then clears the
 * notice from the URL. Whether to show comes from the server's notice; the
 * address bar is read only in the effect, after Next has committed the URL
 * (a client redirect updates it at commit). A page restored from history
 * after the notice was cleared, without the notice in its URL, hides it.
 */
export function AvailabilityAlert({ message, today }: { message: string; today: IsoDate }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!noticeInUrl()) {
      // Already shown and cleared: this is a restore from history.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL is only reliable after commit
      setVisible(false);
      return;
    }
    ref.current?.focus();
    clearNoticeFromUrl(today);
  }, [today]);

  if (!visible) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="group"
      aria-label="Room no longer available"
      className="mb-space-lg flex items-start gap-space-sm rounded-md border border-error bg-surface p-space-md text-body-md text-on-surface"
    >
      <Icon name="error" className="mt-0.5 shrink-0 text-error" />
      <p>{message}</p>
    </div>
  );
}
