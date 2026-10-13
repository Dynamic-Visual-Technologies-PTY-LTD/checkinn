import Link from "next/link";

/** Footer with the fictional-demo notice and Photo credits (DESIGN.md Footer). */
export function SiteFooter() {
  return (
    <footer className="bg-neutral p-space-xl text-body-sm text-on-surface-muted">
      <div className="mx-auto flex max-w-page flex-col gap-space-sm">
        <p>
          CheckInn is a demo. Hotels, prices and reviews are fictional. Photos
          are illustrative. No payment is taken.
        </p>
        <p>
          <Link
            href="/credits"
            // No prefetch until the route exists (a later story builds it).
            prefetch={false}
            className="text-on-surface underline hover:text-tertiary"
          >
            Photo credits
          </Link>
        </p>
      </div>
    </footer>
  );
}
