"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icons/icons";

type ErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function ErrorPage({ error, retry }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto flex w-full max-w-page flex-1 flex-col items-start gap-space-lg px-gutter py-section">
      <div
        role="alert"
        className="flex items-start gap-space-sm rounded-md border border-error bg-surface p-space-md text-on-surface"
      >
        <Icon name="error" className="mt-0.5 shrink-0 text-error" />
        <p>Something went wrong on our side. Try again.</p>
      </div>
      <button
        type="button"
        onClick={() => retry()}
        className="min-h-14 rounded-lg border-2 border-primary bg-surface px-space-lg text-label-lg text-on-surface uppercase hover:bg-primary-strong hover:text-on-primary"
      >
        Try again
      </button>
    </section>
  );
}
