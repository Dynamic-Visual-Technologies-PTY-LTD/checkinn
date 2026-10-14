"use client";

import { useId } from "react";
import { primaryButton } from "@/components/button-styles";
import { Icon } from "@/components/icons/icons";
import type { ReserveBlock } from "@/domain/selection";

/** Reserve: `aria-disabled` stays focusable and described by its reason. */
export const reserveButton = `${primaryButton} aria-disabled:cursor-default aria-disabled:bg-surface aria-disabled:text-on-surface-disabled aria-disabled:hover:bg-surface aria-disabled:hover:text-on-surface-disabled aria-disabled:border-2 aria-disabled:border-on-surface-disabled`;

export type ReserveProps = {
  /** Why Reserve is off, or null when it is on. */
  block: ReserveBlock | null;
  onReserve: () => void;
  /** The `startBooking` failure message, if the last try failed. */
  error: string | null;
};

/**
 * The reason above Reserve and the Reserve button itself, the Hotel page's
 * summary action. The reason is in a polite live region, so a fit message is
 * announced.
 */
export function ReserveButton({
  block,
  onReserve,
  error,
  inBar = false,
}: ReserveProps & {
  /** In the phone bar the reason spans the bar above the text and button. */
  inBar?: boolean;
}) {
  const reasonId = useId();
  const reason = (
    <div
      aria-live="polite"
      className={`flex flex-col gap-space-xs text-body-sm ${inBar ? "order-first col-span-2" : ""}`}
    >
      {block && (
        <p id={reasonId} className="flex items-start gap-space-xs">
          {block.kind === "capacity" && <Icon name="warning" className="mt-0.5 shrink-0" />}
          {block.message}
        </p>
      )}
      {error && (
        <p className="flex items-start gap-space-xs text-error">
          <Icon name="error" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
  const button = (
    <button
      type="button"
      aria-disabled={block ? true : undefined}
      aria-describedby={block ? reasonId : undefined}
      onClick={() => {
        if (!block) onReserve();
      }}
      className={`${reserveButton} ${inBar ? "min-w-36" : "w-full"}`}
    >
      Reserve
    </button>
  );
  if (inBar) {
    return (
      <>
        {reason}
        {button}
      </>
    );
  }
  return (
    <div className="flex flex-col gap-space-sm">
      {reason}
      {button}
    </div>
  );
}
