import { io } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingDetailsForm } from "@/app/book/booking-details-form";
import { BookingConfirmation } from "@/components/booking-confirmation";
import { BookingSteps } from "@/components/booking-steps";
import { PageHeading } from "@/components/page-heading";
import {
  type CancellationLine,
  cancellationLine,
  snapshotCancellationLine,
} from "@/domain/cancellation";
import { nowIso, todayIn } from "@/domain/clock";
import { type CriteriaParams, hotelHref, parseCriteria, searchHref } from "@/domain/criteria";
import { roomTableHref } from "@/domain/hotel";
import type { BookingQuote, BookingView } from "@/domain/types";
import { getBookingByKey, getBookingQuote } from "@/features/booking/queries";

/** What `/book` shows for its URL, or where it sends the guest instead. */
export type BookPageState =
  | { kind: "redirect"; href: string }
  | {
      kind: "form";
      quote: BookingQuote;
      cancellation: CancellationLine;
      q: string;
      k: string;
      /** The Hotel page's room table with the criteria and selection kept. */
      backHref: string;
    }
  /** The key was used and this browser holds the Booking's token: Already booked. */
  | { kind: "booked"; booking: BookingView; cancellation: CancellationLine }
  /** The key was used by a Booking this browser can't open. */
  | { kind: "already-confirmed" };

export const ALREADY_CONFIRMED_HEADLINE = "This booking is already confirmed";

/**
 * Reads `/book`'s URL through the criteria codec (AD-8) and decides what to
 * show, at request time (AD-2):
 *
 * 1. A key that already has a Booking: that Booking's confirmation for a
 *    browser holding its token (Already booked, FR-22); otherwise only that
 *    it was already confirmed. Checked first, so a refresh or Back after
 *    confirming never shows the form again.
 * 2. No Hotel, or an unknown one: Search results with the criteria.
 * 3. No valid Stay, selection or key, or a selection that does not fit the
 *    Party: the Hotel page's room table with the criteria.
 * 4. Rooms that ran out since Reserve: the Hotel page with the
 *    room-unavailable notice, as at confirm.
 * 5. Otherwise the summary, priced as `createBooking` will store it.
 */
export async function loadBookPage(query: CriteriaParams): Promise<BookPageState> {
  await io();
  const today = todayIn();
  const now = nowIso();
  const { criteria, problems } = parseCriteria(query, today, { defaultStay: false });
  const { q, stay, party, hotel, k } = criteria;
  const sel = problems.includes("sel-invalid") ? null : criteria.sel;
  const kept = { q, stay, party };

  if (k) {
    const used = await getBookingByKey(k);
    if (used?.access) {
      const { booking } = used;
      return {
        kind: "booked",
        booking,
        cancellation: snapshotCancellationLine(
          booking.cancellationPolicy,
          booking.cancellationDeadline,
          now,
        ),
      };
    }
    if (used) return { kind: "already-confirmed" };
  }

  if (!hotel) return { kind: "redirect", href: searchHref(kept) };
  const result = await getBookingQuote({ hotelId: hotel, stay, party, sel });
  if (result.kind === "no-hotel") return { kind: "redirect", href: searchHref(kept) };
  if (!k || result.kind === "invalid") {
    return { kind: "redirect", href: roomTableHref(hotel, { ...kept, sel }) };
  }
  if (result.kind === "unavailable") {
    return {
      kind: "redirect",
      href: hotelHref(hotel, {
        ...kept,
        sel,
        notice: { type: "room-unavailable", roomTypeIds: result.roomTypeIds },
      }),
    };
  }

  const { quote } = result;
  return {
    kind: "form",
    quote,
    cancellation: cancellationLine(
      quote.cancellationPolicy,
      quote.stay.checkIn,
      quote.checkInTime,
      now,
    ),
    q,
    k,
    backHref: roomTableHref(hotel, { ...kept, sel }),
  };
}

/** The page title for each state ("{context} · CheckInn"). */
export function bookPageTitle(state: BookPageState): string {
  switch (state.kind) {
    case "form":
      return `Your details · ${state.quote.hotelName}`;
    case "booked":
      return `Booking ${state.booking.reference}`;
    case "already-confirmed":
      return ALREADY_CONFIRMED_HEADLINE;
    case "redirect":
      return "Your details";
  }
}

/** Renders `/book` for its URL; reads only inside the page's Suspense boundary. */
export async function BookContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const state = await loadBookPage(await searchParams);
  switch (state.kind) {
    case "redirect":
      return redirect(state.href);
    case "booked":
      return <BookingConfirmation booking={state.booking} cancellation={state.cancellation} />;
    case "already-confirmed":
      return <AlreadyConfirmed />;
    case "form":
      return <BookingDetails state={state} />;
  }
}

/**
 * Booking details (FR-21, EXPERIENCE.md Booking details): step 2, Back to
 * rooms, the headline, the no-payment statement, then the guest form beside
 * the booking summary.
 */
export function BookingDetails({ state }: { state: Extract<BookPageState, { kind: "form" }> }) {
  return (
    <>
      <BookingSteps current={2} />
      <p className="mt-space-lg">
        <Link
          href={state.backHref}
          className="inline-flex min-h-11 items-center text-body-sm underline hover:text-tertiary"
        >
          Back to rooms
        </Link>
      </p>
      <div className="mt-space-sm">
        <PageHeading>Your details</PageHeading>
      </div>
      <p className="mt-space-md text-on-surface-muted">
        No payment is taken. This hotel is fictional.
      </p>
      <BookingDetailsForm
        quote={state.quote}
        cancellation={state.cancellation}
        q={state.q}
        k={state.k}
      />
    </>
  );
}

/**
 * A `/book` link whose key another browser already confirmed (AD-10, AD-15):
 * no Booking data and no form, only the way to look the Booking up.
 */
export function AlreadyConfirmed() {
  return (
    <div className="max-w-2xl">
      <PageHeading>{ALREADY_CONFIRMED_HEADLINE}</PageHeading>
      <p className="mt-space-lg">
        This link has already been used to confirm a booking. If it&apos;s yours, find it with
        your booking reference and email.
      </p>
      <p className="mt-space-sm">
        <Link
          href="/manage"
          prefetch={false}
          className="inline-flex min-h-11 items-center underline hover:text-tertiary"
        >
          Manage booking
        </Link>
      </p>
    </div>
  );
}

/** The page's shape while it loads (DESIGN.md Skeleton). */
export function BookSkeleton() {
  const block = "rounded-md bg-primary-subtle motion-safe:animate-pulse";
  return (
    <div aria-hidden="true">
      <div className={`h-6 w-full max-w-md ${block}`} />
      <div className={`mt-space-lg h-10 w-2/3 md:w-1/3 ${block}`} />
      <div className="mt-space-lg grid grid-cols-1 gap-space-xl lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className={`h-80 ${block}`} />
        <div className={`order-first h-80 lg:order-none ${block}`} />
      </div>
    </div>
  );
}
