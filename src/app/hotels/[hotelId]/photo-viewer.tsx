"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { iconButton } from "@/components/button-styles";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons/icons";
import { RemoteImage } from "@/components/remote-image";

type Photo = { url: string; alt: string };

type HotelPhotosProps = {
  photos: Photo[];
  hotelName: string;
  /** Size classes for each photo on the page. */
  photoClassName: string;
};

/** The shortest horizontal swipe, in CSS px, that changes the photo. */
const SWIPE_MIN = 50;

/** The index `by` steps from `index`, wrapping at both ends. */
const wrap = (index: number, by: number, count: number) => (index + by + count) % count;

/**
 * The Hotel page photos (FR-10, EXPERIENCE.md Photos, Photo viewer). Each
 * photo is a button that opens the full-screen viewer at that photo, which
 * steps by buttons, arrow keys and swipe, wrapping at both ends.
 */
export function HotelPhotos({ photos, hotelName, photoClassName }: HotelPhotosProps) {
  const [index, setIndex] = useState<number | null>(null);
  // The photo button that opened the viewer gets focus back on close.
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const open = index !== null;
  const count = photos.length;
  const step = useCallback(
    (by: number) =>
      setIndex((current) => (current === null ? current : wrap(current, by, count))),
    [count],
  );

  // Arrow keys step wherever focus is inside the viewer (its Close button
  // sits outside the photo area), so they are read from the window.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const by = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
      if (by === 0) return;
      event.preventDefault();
      step(by);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, step]);

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    // A second finger makes it a pinch or a two-finger drag, not a swipe.
    touchStart.current =
      touch && event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return;
    step(dx < 0 ? 1 : -1);
  };

  if (count === 0) return null;
  const current = index === null ? null : photos[index];

  return (
    <>
      <ul
        aria-label="Photos"
        className="mt-space-lg grid grid-cols-1 gap-space-md md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        {photos.map((photo, i) => (
          <li key={photo.url}>
            <button
              type="button"
              aria-label={photo.alt}
              onClick={(event) => {
                openerRef.current = event.currentTarget;
                setIndex(i);
              }}
              className="block w-full cursor-pointer rounded-md"
            >
              <RemoteImage
                src={photo.url}
                alt={photo.alt}
                label={hotelName}
                className={photoClassName}
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        open={open}
        onClose={() => setIndex(null)}
        title={`${hotelName} photos`}
        variant="sheet"
        returnFocusRef={openerRef}
      >
        {current && index !== null ? (
          <>
            <div
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              onTouchCancel={() => {
                touchStart.current = null;
              }}
              className="flex min-h-0 flex-1 items-center justify-center px-space-md"
            >
              <RemoteImage
                key={current.url}
                src={current.url}
                alt={current.alt}
                label={hotelName}
                fit="contain"
                className="size-full"
              />
            </div>
            <div className="flex items-center justify-center gap-space-lg p-space-md">
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => step(-1)}
                className={iconButton}
              >
                <Icon name="chevron-left" />
              </button>
              <p aria-hidden="true" className="min-w-16 text-center text-label-lg">
                {`${index + 1} / ${count}`}
              </p>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => step(1)}
                className={iconButton}
              >
                <Icon name="chevron-right" />
              </button>
            </div>
            <p aria-live="polite" className="sr-only">
              {`Photo ${index + 1} of ${count}`}
            </p>
          </>
        ) : null}
      </Dialog>
    </>
  );
}
