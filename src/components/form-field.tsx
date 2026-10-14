import type { ReactNode } from "react";
import { Icon } from "@/components/icons/icons";

/** The id of a field's error message, which the field names with `aria-describedby`. */
export function fieldErrorId(fieldId: string): string {
  return `${fieldId}-error`;
}

/** The attributes that tie a field to its error message (EXPERIENCE.md Guest form). */
export function fieldErrorProps(fieldId: string, error: string | undefined) {
  return error
    ? { "aria-invalid": true as const, "aria-describedby": fieldErrorId(fieldId) }
    : {};
}

/**
 * Input, select and textarea style (DESIGN.md Input): Midnight with a 1px
 * Brand Blue border, 44px high on phone and 38px from 768px; Coral when
 * invalid.
 */
export function fieldClassName(error: string | undefined): string {
  return `min-h-11 w-full rounded-sm border bg-surface p-space-sm text-input-mobile text-on-surface read-only:cursor-default disabled:cursor-default md:min-h-9.5 md:text-body-md ${error ? "border-error" : "border-primary"}`;
}

type FormFieldProps = {
  id: string;
  label: string;
  /** The field's message, shown under it in Coral. */
  error?: string;
  /** The control, given `id` and `fieldErrorProps(id, error)`. */
  children: ReactNode;
};

/**
 * A labelled form field (DESIGN.md Input): the visible `body-sm` label above
 * the control, and its error message under it with an error icon.
 */
export function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-space-xs">
      <label htmlFor={id} className="text-body-sm">
        {label}
      </label>
      {children}
      {error && (
        <p id={fieldErrorId(id)} className="flex items-start gap-space-xs text-body-sm text-error">
          <Icon name="error" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
