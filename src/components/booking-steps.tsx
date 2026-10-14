const STEPS = ["Your selection", "Your details", "Confirmation"] as const;

export type BookingStep = 1 | 2 | 3;

/**
 * The step indicator across the booking flow (EXPERIENCE.md Step indicator,
 * DESIGN.md Step indicator): an ordered list with `aria-current="step"` on
 * the current step, which also has a Cyan accent rule. Display only.
 */
export function BookingSteps({ current }: { current: BookingStep }) {
  return (
    <ol aria-label="Booking steps" className="flex flex-wrap gap-x-space-lg gap-y-space-sm">
      {STEPS.map((step, index) => {
        const isCurrent = index + 1 === current;
        return (
          <li
            key={step}
            aria-current={isCurrent ? "step" : undefined}
            className={
              isCurrent
                ? "border-b-2 border-secondary pb-space-xs text-label-md"
                : "text-label-sm text-on-surface-muted"
            }
          >
            {index + 1} {step}
          </li>
        );
      })}
    </ol>
  );
}
