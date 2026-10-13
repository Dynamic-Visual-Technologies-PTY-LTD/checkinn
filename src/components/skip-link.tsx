/** The first focusable element on every page (EXPERIENCE.md Landmarks). */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only bg-neutral px-space-md py-space-sm text-body-sm text-on-surface underline focus:not-sr-only focus:fixed focus:top-space-sm focus:left-space-sm focus:z-50"
    >
      Skip to main content
    </a>
  );
}
