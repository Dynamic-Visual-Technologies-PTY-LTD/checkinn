import Image from "next/image";
import Link from "next/link";

/** Sticky, translucent header: logo on the left, Manage booking on the right. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 min-h-16 bg-neutral/80 shadow-[0_0_4px_rgba(0,0,0,0.1)] md:min-h-[100px] [@media(max-height:499px)]:static">
      <nav
        aria-label="Main"
        className="mx-auto flex min-h-[inherit] max-w-page items-center justify-between gap-space-md px-gutter"
      >
        <Link href="/" aria-label="CheckInn home" className="inline-flex shrink-0">
          <Image
            src="/logo/checkinn-logo-on-dark.webp"
            alt=""
            width={216}
            height={40}
            fetchPriority="high"
            className="hidden h-10 w-auto min-[480px]:block"
          />
          <Image
            src="/logo/checkinn-icon.png"
            alt=""
            width={40}
            height={40}
            fetchPriority="high"
            className="h-10 w-10 min-[480px]:hidden"
          />
        </Link>
        <Link
          href="/manage"
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg border-2 border-primary bg-neutral px-space-md text-label-md text-on-surface uppercase transition-colors hover:border-tertiary hover:bg-tertiary hover:text-on-tertiary md:px-space-lg"
        >
          Manage booking
        </Link>
      </nav>
    </header>
  );
}
