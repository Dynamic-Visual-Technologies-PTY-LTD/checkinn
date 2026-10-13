/* Shared Tailwind classes for the buttons overlays use (DESIGN.md Components). */

/** Secondary button: Midnight fill, 2px Brand Blue border, uppercase label. */
export const secondaryButton =
  "min-h-14 rounded-lg border-2 border-primary bg-neutral px-space-lg text-label-lg text-on-surface uppercase hover:bg-primary-strong hover:text-on-primary";

/** Icon button: a 44px circle with a 2px Brand Blue border, Gold on hover. */
export const iconButton =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-primary text-on-surface hover:border-tertiary aria-disabled:cursor-default aria-disabled:border-on-surface-disabled aria-disabled:text-on-surface-disabled aria-disabled:hover:border-on-surface-disabled";

/** Fade in under 200ms; nothing animates under reduced motion. */
export const overlayEnter =
  "motion-safe:transition-opacity motion-safe:duration-150 motion-safe:starting:opacity-0";
