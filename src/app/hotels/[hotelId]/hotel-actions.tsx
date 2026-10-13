"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { iconButton, secondaryButton } from "@/components/button-styles";
import { CopyFallbackDialog } from "@/components/copy-fallback-dialog";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons/icons";
import { Toast, useToast } from "@/components/toast";
import { availabilityHeadingId } from "@/domain/hotel";
import { copyText } from "@/lib/clipboard";

/** Where Save keeps the saved Hotel ids: a JSON array, in this browser only. */
export const SAVED_KEY = "checkinn:saved";

const SAVED_EVENT = "checkinn:saved-change";

/** Saved Hotel ids from a stored value. Anything unreadable counts as none. */
export function parseSaved(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function readSaved(): string | null {
  try {
    return window.localStorage.getItem(SAVED_KEY);
  } catch {
    return null;
  }
}

function writeSaved(ids: string[]) {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch {
    // Storage is blocked, so the Hotel can't be saved in this browser.
  }
  window.dispatchEvent(new Event(SAVED_EVENT));
}

function subscribeSaved(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SAVED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SAVED_EVENT, onChange);
  };
}

/** Whether the Hotel is saved in this browser. Not saved while server rendering. */
function useSaved(hotelId: string): [boolean, () => void] {
  const raw = useSyncExternalStore(subscribeSaved, readSaved, () => null);
  const saved = parseSaved(raw).includes(hotelId);
  const toggle = () => {
    const ids = parseSaved(readSaved()).filter((id) => id !== hotelId);
    writeSaved(saved ? ids : [...ids, hotelId]);
  };
  return [saved, toggle];
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Scrolls to the Availability section and focuses its heading (EXPERIENCE.md See rooms). */
function seeRooms(hotelId: string) {
  const heading = document.getElementById(availabilityHeadingId(hotelId));
  if (!heading) return;
  const section = heading.closest("section") ?? heading;
  section.scrollIntoView?.({
    behavior: prefersReducedMotion() ? "instant" : "smooth",
    block: "start",
  });
  heading.focus({ preventScroll: true });
}

type HotelActionsProps = {
  hotelId: string;
  hotelName: string;
  /** The Hotel page path with the search criteria, e.g. `/hotels/hotel-001?…`. */
  sharePath: string;
};

/**
 * The Hotel header's actions (FR-9, EXPERIENCE.md Save, Share, Chip, See
 * rooms): Save, Share, the "We Price Match" chip and See rooms.
 */
export function HotelActions({ hotelId, hotelName, sharePath }: HotelActionsProps) {
  const [saved, toggleSaved] = useSaved(hotelId);
  const { toast, show, dismiss } = useToast();
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [priceMatchOpen, setPriceMatchOpen] = useState(false);
  // Some browsers don't focus a clicked button, so dialogs return focus by ref.
  const shareRef = useRef<HTMLButtonElement>(null);
  const priceMatchRef = useRef<HTMLButtonElement>(null);

  const share = async () => {
    const url = new URL(sharePath, window.location.origin).toString();
    if (await copyText(url)) show("Link copied");
    else setFallbackUrl(url);
  };

  return (
    <div className="flex flex-wrap items-center gap-space-md">
      <button
        type="button"
        aria-pressed={saved}
        aria-label={`Save ${hotelName}`}
        onClick={toggleSaved}
        className={iconButton}
      >
        <Icon name="heart" className={saved ? "fill-on-surface" : undefined} />
      </button>
      <button
        ref={shareRef}
        type="button"
        aria-label="Share"
        onClick={share}
        className={iconButton}
      >
        <Icon name="share" />
      </button>
      <button
        ref={priceMatchRef}
        type="button"
        onClick={() => setPriceMatchOpen(true)}
        className="min-h-11 rounded-full border border-primary bg-surface px-space-sm text-label-md whitespace-nowrap text-on-surface uppercase hover:border-tertiary"
      >
        We Price Match
      </button>
      <button type="button" onClick={() => seeRooms(hotelId)} className={secondaryButton}>
        See rooms
      </button>

      <Dialog
        open={priceMatchOpen}
        onClose={() => setPriceMatchOpen(false)}
        title="We Price Match"
        returnFocusRef={priceMatchRef}
      >
        <p className="text-body-md">
          CheckInn is a demo, so no price matching happens. Prices shown are fictional.
        </p>
        <div className="flex flex-col pt-space-sm md:flex-row md:justify-end">
          <button
            type="button"
            data-autofocus
            onClick={() => setPriceMatchOpen(false)}
            className={secondaryButton}
          >
            Close
          </button>
        </div>
      </Dialog>

      <CopyFallbackDialog
        open={fallbackUrl !== null}
        onClose={() => setFallbackUrl(null)}
        title="Copy this link"
        body="Your browser blocked copying. Select the link and copy it."
        label="Hotel page link"
        value={fallbackUrl ?? ""}
        returnFocusRef={shareRef}
      />

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
