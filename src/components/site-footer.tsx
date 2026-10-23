import Link from "next/link";

/** Footer with the fictional-demo notice and Photo credits (DESIGN.md Footer). */
export function SiteFooter() {
  return (
    <footer className="border-t border-primary/40 bg-neutral px-gutter py-space-xl text-body-sm text-on-surface-muted">
      <div className="mx-auto flex max-w-page flex-col items-start gap-space-md md:flex-row md:items-center md:justify-between">
        <p className="max-w-[60ch]">
          CheckInn is a demo. Hotels, prices and reviews are fictional. Photos
          are illustrative. No payment is taken.
        </p>
        <Link
          href="/credits"
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-primary bg-primary-subtle px-space-lg text-label-md text-on-surface uppercase shadow-[0_4px_16px_rgba(0,127,186,0.35)] transition-colors hover:border-tertiary hover:text-tertiary"
        >
          Photo credits
        </Link>
      </div>
    </footer>
  );
}
