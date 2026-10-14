/* Shared Tailwind classes for the buttons overlays use (DESIGN.md Components). */

/** Primary button: Deep Blue fill, Gold with Midnight text on hover. One per screen. */
export const primaryButton =
  "min-h-14 rounded-lg bg-primary-strong px-space-lg text-label-lg text-on-primary uppercase hover:bg-tertiary hover:text-on-tertiary";

/** Secondary button: Midnight fill, 2px Brand Blue border, uppercase label. */
export const secondaryButton =
  "min-h-14 rounded-lg border-2 border-primary bg-neutral px-space-lg text-label-lg text-on-surface uppercase hover:bg-primary-strong hover:text-on-primary";

/** Icon button: a 44px circle with a 2px Brand Blue border, Gold on hover. */
export const iconButton =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-primary text-on-surface hover:border-tertiary aria-disabled:cursor-default aria-disabled:border-on-surface-disabled aria-disabled:text-on-surface-disabled aria-disabled:hover:border-on-surface-disabled";

/** Fade in under 200ms; nothing animates under reduced motion. */
export const overlayEnter =
  "motion-safe:transition-opacity motion-safe:duration-150 motion-safe:starting:opacity-0";

/**
 * A disabled primary button (DESIGN.md Primary button): Midnight fill, muted
 * text and a 2px disabled-grey border, with no hover. Add to `primaryButton`.
 */
export const primaryButtonDisabled =
  "disabled:cursor-default disabled:border-2 disabled:border-on-surface-disabled disabled:bg-surface disabled:text-on-surface-muted disabled:hover:bg-surface disabled:hover:text-on-surface-muted";

/** A disabled secondary button: the disabled-grey border, muted text, no hover. Add to `secondaryButton`. */
export const secondaryButtonDisabled =
  "disabled:cursor-default disabled:border-on-surface-disabled disabled:text-on-surface-muted disabled:hover:bg-neutral disabled:hover:text-on-surface-muted";
