"use client";

import { useId, type Ref } from "react";
import { Icon } from "@/components/icons/icons";

export type SummaryError = {
  /** The id of the field the message belongs to. */
  fieldId: string;
  message: string;
};

/** "1 detail needs fixing", "3 details need fixing". */
export function errorSummaryTitle(count: number): string {
  return count === 1 ? "1 detail needs fixing" : `${count} details need fixing`;
}

/**
 * The error summary at the top of a form (DESIGN.md Error summary, GOV.UK
 * practice): an `alert-error` with a title and one link per problem. The
 * form moves focus to it on a submit with errors, so it is not also a live
 * region. Each link moves focus to its field.
 */
export function ErrorSummary({
  errors,
  ref,
}: {
  errors: SummaryError[];
  ref?: Ref<HTMLDivElement>;
}) {
  const titleId = useId();
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="group"
      aria-labelledby={titleId}
      className="flex items-start gap-space-md rounded-md border border-error bg-surface p-space-md text-on-surface"
    >
      <Icon name="error" className="mt-0.5 shrink-0 text-error" />
      <div className="min-w-0">
        <h2 id={titleId} className="text-headline-sm">
          {errorSummaryTitle(errors.length)}
        </h2>
        <ul className="mt-space-sm flex flex-col gap-space-xs text-body-sm">
          {errors.map((error) => (
            <li key={error.fieldId}>
              <a
                href={`#${error.fieldId}`}
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById(error.fieldId)?.focus();
                }}
                className="inline-flex min-h-11 items-center underline hover:text-tertiary md:min-h-0"
              >
                {error.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
