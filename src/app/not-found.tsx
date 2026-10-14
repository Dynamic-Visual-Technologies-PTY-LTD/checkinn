import type { Metadata } from "next";
import Link from "next/link";

// The root layout's title template does not apply to root-segment files.
export const metadata: Metadata = {
  title: { absolute: "Page not found · CheckInn" },
};

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-page flex-1 flex-col gap-space-lg px-gutter py-section">
      <h1 className="text-headline-lg-responsive">
        {"We can't find that page."}
      </h1>
      <ul className="flex flex-col gap-space-sm text-body-md">
        <li>
          <Link href="/" className="underline hover:text-tertiary">
            Home
          </Link>
        </li>
        <li>
          <Link href="/search" className="underline hover:text-tertiary">
            Back to search
          </Link>
        </li>
      </ul>
    </section>
  );
}
