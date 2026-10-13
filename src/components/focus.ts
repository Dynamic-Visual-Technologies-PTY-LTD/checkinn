const CANDIDATES =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** The elements inside `container` that Tab reaches, in DOM order. */
export function tabbables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(CANDIDATES)).filter(
    (el) => el.tabIndex >= 0 && !el.hasAttribute("disabled") && !el.closest("[inert]"),
  );
}

/**
 * The element an overlay focuses when it opens: the one marked
 * `data-autofocus`, else the first tabbable element, else the container.
 */
export function initialFocusTarget(container: HTMLElement): HTMLElement {
  return (
    container.querySelector<HTMLElement>("[data-autofocus]") ??
    tabbables(container)[0] ??
    container
  );
}
