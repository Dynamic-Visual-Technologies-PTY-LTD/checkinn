"use client";

/* eslint-disable @next/next/no-img-element -- seed photos render as plain
   <img> so no remote-host config is needed and nothing is fetched on the
   server (AD-14). This is the only file allowed to do it. */

import { useEffect, useRef, useState } from "react";

type RemoteImageProps = {
  src: string;
  /** The seed alt text. The placeholder keeps it as its accessible name. */
  alt: string;
  /** Size, radius and layout. Applied to the photo and to the placeholder. */
  className?: string;
  /** Hotel or City name shown centred on the placeholder (DESIGN.md). */
  label?: string;
};

// Wikimedia's Special:FilePath serves the full original (one City photo is
// ~5 MB) unless asked for a width. The seed URL is kept; only the request is
// sized. Other hosts are left as they are (the Unsplash URLs already set w=).
const WIKIMEDIA_WIDTH = 800;

export function sizedPhotoUrl(src: string): string {
  try {
    const url = new URL(src);
    if (
      url.hostname === "commons.wikimedia.org" &&
      url.pathname.startsWith("/wiki/Special:FilePath/") &&
      !url.searchParams.has("width")
    ) {
      url.searchParams.set("width", String(WIKIMEDIA_WIDTH));
      return url.toString();
    }
  } catch {
    // Not an absolute URL: use it as it is.
  }
  return src;
}

/**
 * Renders a seed photo, and swaps to the Night Blue image placeholder when
 * the photo fails to load (AD-14, FR-11).
 */
export function RemoteImage({ src, alt, className = "", label }: RemoteImageProps) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // The photo can fail before hydration, when React is not yet listening for
  // `error`. A finished image with no width is a failed one.
  useEffect(() => {
    const image = ref.current;
    if (image && image.complete && image.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center rounded-md border border-primary bg-primary-subtle p-space-md text-center text-headline-sm text-on-surface-muted ${className}`}
      >
        {label ? <span aria-hidden="true">{label}</span> : null}
      </div>
    );
  }

  return (
    <img
      ref={ref}
      src={sizedPhotoUrl(src)}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`rounded-md object-cover ${className}`}
    />
  );
}
