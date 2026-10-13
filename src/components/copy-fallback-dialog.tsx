"use client";

import { useId, type RefObject } from "react";
import { secondaryButton } from "@/components/button-styles";
import { Dialog } from "@/components/dialog";

type CopyFallbackDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  /** The read-only field's visible label. */
  label: string;
  /** The text to copy, shown selected in the field. */
  value: string;
  /** Focused on close. Defaults to the element that opened the dialog. */
  returnFocusRef?: RefObject<HTMLElement | null>;
};

/** Selects all of the field's text, so the guest only has to copy it. */
function selectAll(field: HTMLInputElement | null) {
  field?.setSelectionRange(0, field.value.length);
}

/**
 * Shown when the browser blocks the clipboard (EXPERIENCE.md Share): the
 * text in a read-only field, already selected, for the guest to copy by
 * hand. Focus starts on Close.
 */
export function CopyFallbackDialog({
  open,
  onClose,
  title,
  body,
  label,
  value,
  returnFocusRef,
}: CopyFallbackDialogProps) {
  const fieldId = useId();
  return (
    <Dialog open={open} onClose={onClose} title={title} returnFocusRef={returnFocusRef}>
      <p className="text-body-md">{body}</p>
      <div className="flex flex-col gap-space-xs">
        <label htmlFor={fieldId} className="text-body-sm">
          {label}
        </label>
        <input
          ref={selectAll}
          id={fieldId}
          type="text"
          readOnly
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-11 w-full rounded-sm border border-primary bg-surface p-space-sm text-input-mobile text-on-surface md:min-h-9.5 md:text-body-md"
        />
      </div>
      <div className="flex flex-col pt-space-sm md:flex-row md:justify-end">
        <button type="button" data-autofocus onClick={onClose} className={secondaryButton}>
          Close
        </button>
      </div>
    </Dialog>
  );
}
