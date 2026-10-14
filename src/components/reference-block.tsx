"use client";

import { useRef } from "react";
import { iconButton } from "@/components/button-styles";
import { Icon } from "@/components/icons/icons";
import { Toast, useToast } from "@/components/toast";
import { copyText } from "@/lib/clipboard";

/** Selects the element's text, so the guest can copy it by hand. */
function selectText(element: HTMLElement | null) {
  const selection = window.getSelection();
  if (!element || !selection) return;
  selection.selectAllChildren(element);
}

/**
 * The Booking reference on the confirmation (EXPERIENCE.md Reference block,
 * DESIGN.md Reference block): a muted eyebrow, the reference as selectable
 * text in `reference-code`, and COPY. COPY shows the toast "Reference
 * copied"; when the browser blocks the clipboard (plain HTTP at the stand,
 * AD-13) it selects the reference instead.
 */
export function ReferenceBlock({ reference }: { reference: string }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const { toast, show, dismiss } = useToast();

  const copy = async () => {
    if (await copyText(reference)) show("Reference copied");
    else selectText(textRef.current);
  };

  return (
    <div>
      <p className="text-label-md text-on-surface-muted uppercase">Booking reference</p>
      <div className="mt-space-xs flex flex-wrap items-center gap-x-space-lg gap-y-space-sm">
        <p ref={textRef} className="text-reference-code break-all select-all">
          {reference}
        </p>
        <button
          type="button"
          aria-label={`Copy booking reference ${reference}`}
          onClick={copy}
          className={iconButton}
        >
          <Icon name="copy" />
        </button>
      </div>
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
