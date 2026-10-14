"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/icons/icons";

/**
 * The room-ran-out alert (EXPERIENCE.md Room ran out at confirm): an
 * `alert-error` at the top of the Availability section. It takes focus once
 * when it appears, so it is not also a live region. It leaves the page when
 * the next criteria change drops the notice from the URL.
 */
export function AvailabilityAlert({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

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
