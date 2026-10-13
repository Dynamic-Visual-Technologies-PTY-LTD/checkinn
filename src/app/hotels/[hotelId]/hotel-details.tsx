import { io } from "next/cache";
import { notFound } from "next/navigation";
import { HotelActions } from "@/app/hotels/[hotelId]/hotel-actions";
import { ResultsHeading } from "@/app/search/results-heading";
import { Icon, type IconName } from "@/components/icons/icons";
import { RemoteImage } from "@/components/remote-image";
import { Stars } from "@/components/stars";
import { todayIn } from "@/domain/clock";
import { availabilityHeadingId } from "@/domain/hotel";
import { hotelHref, parseCriteria } from "@/domain/criteria";
import type { HotelPage } from "@/domain/types";
import { getHotelPage } from "@/features/hotels/queries";

export type HotelRouteParams = Promise<{ hotelId: string }>;
export type HotelSearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Seed amenity keys whose icon name differs from the key. */
const FACILITY_ICONS: Record<string, IconName> = {
  wifi: "wifi",
  pool: "pool",
  spa: "spa",
  restaurant: "restaurant",
  parking: "parking",
  gym: "gym",
  air_conditioning: "snowflake",
  meeting_rooms: "meeting-room",
  kitchenette: "kitchenette",
  play_area: "play-area",
  private_bathroom: "shower",
};

const PHOTO = "h-[240px] w-full md:h-[420px]";

/**
 * Reads the URL and today at request time, inside the Suspense boundary
 * (AD-2), and renders the Hotel page, or the not-found page for an unknown
 * id. The search criteria are kept for Share.
 */
export async function HotelContent({
  params,
  searchParams,
}: {
  params: HotelRouteParams;
  searchParams: HotelSearchParams;
}) {
  const { hotelId } = await params;
  const query = await searchParams;
  await io();
  const { criteria } = parseCriteria(query, todayIn(), { defaultStay: false });
  const hotel = await getHotelPage(hotelId);
  if (!hotel) notFound();

  const sharePath = hotelHref(hotel.hotelId, {
    q: criteria.q,
    stay: criteria.stay,
    party: criteria.party,
  });
  return <HotelDetails hotel={hotel} sharePath={sharePath} />;
}

/**
 * The Hotel page sections (FR-9, FR-10, FR-12–FR-14, DESIGN.md Hotel page):
 * header, photos, review panel and facilities, about and house rules, then
 * the Availability section.
 */
export function HotelDetails({ hotel, sharePath }: { hotel: HotelPage; sharePath: string }) {
  // Ids carry the Hotel id: Next can keep a previous Hotel page hidden in the DOM.
  const id = (name: string) => `${name}-${hotel.hotelId}`;
  return (
    <>
      <HotelHeader hotel={hotel} sharePath={sharePath} />
      <Photos hotel={hotel} />

      <div className="mt-space-xl grid grid-cols-1 gap-space-lg lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <ReviewPanel hotel={hotel} />
        <Facilities hotel={hotel} />
      </div>

      <div className="mt-section grid grid-cols-1 gap-space-xl md:grid-cols-2">
        <section aria-labelledby={id("about-heading")}>
          <h2 id={id("about-heading")} className="text-headline-md">
            About this property
          </h2>
          <p className="mt-space-lg text-body-lg">{hotel.description}</p>
        </section>
        <section aria-labelledby={id("house-rules-heading")}>
          <h2 id={id("house-rules-heading")} className="text-headline-md">
            House rules
          </h2>
          <dl className="mt-space-lg">
            {hotel.houseRules.map((rule, index) => (
              <div
                key={rule.term}
                className={`grid grid-cols-1 gap-space-xs py-space-md sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-space-md ${index > 0 ? "border-t border-outline" : ""}`}
              >
                <dt className="text-label-md text-on-surface-muted uppercase">{rule.term}</dt>
                <dd className="text-body-md">{rule.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section
        id={id("availability")}
        aria-labelledby={availabilityHeadingId(hotel.hotelId)}
        className="mt-section"
      >
        <h2 id={availabilityHeadingId(hotel.hotelId)} tabIndex={-1} className="text-headline-md">
          Availability
        </h2>
      </section>
    </>
  );
}

function HotelHeader({ hotel, sharePath }: { hotel: HotelPage; sharePath: string }) {
  return (
    <div className="flex flex-col gap-space-lg lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 flex-col gap-space-xs">
        <p className="text-label-md text-on-surface-muted uppercase">{hotel.category}</p>
        <div className="flex flex-wrap items-center gap-x-space-md gap-y-space-xs">
          <ResultsHeading>{hotel.name}</ResultsHeading>
          <Stars count={hotel.starRating} />
        </div>
        <p className="flex items-center gap-space-sm text-body-md">
          <Icon name="location-pin" className="shrink-0" />
          {hotel.area}, {hotel.cityName}, {hotel.province}
        </p>
      </div>
      <HotelActions hotelId={hotel.hotelId} hotelName={hotel.name} sharePath={sharePath} />
    </div>
  );
}

/** Both seed photos, large and small side by side on desktop, stacked on phone (FR-10). */
function Photos({ hotel }: { hotel: HotelPage }) {
  if (hotel.photos.length === 0) return null;
  return (
    <ul
      aria-label="Photos"
      className="mt-space-lg grid grid-cols-1 gap-space-md md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
    >
      {hotel.photos.map((photo) => (
        <li key={photo.url}>
          <RemoteImage src={photo.url} alt={photo.alt} label={hotel.name} className={PHOTO} />
        </li>
      ))}
    </ul>
  );
}

/** "Guest reviews": the score badge with "/ 5", the label and the review count, read as one sentence (FR-12). */
function ReviewPanel({ hotel }: { hotel: HotelPage }) {
  const score = hotel.reviewScore.toFixed(1);
  const reviews = `${hotel.reviewCount} ${hotel.reviewCount === 1 ? "review" : "reviews"}`;
  const spoken = [`Rated ${score} out of 5`, hotel.reviewLabel, reviews].filter(Boolean).join(", ");
  return (
    <section
      aria-labelledby={`reviews-heading-${hotel.hotelId}`}
      className="rounded-md border border-primary bg-surface p-space-lg"
    >
      <h2 id={`reviews-heading-${hotel.hotelId}`} className="text-headline-md">
        Guest reviews
      </h2>
      <p aria-hidden="true" className="mt-space-lg flex items-center gap-space-sm">
        <span className="rounded-sm bg-primary-strong p-space-sm text-label-md leading-none text-on-primary">
          {score}
        </span>
        <span>/ 5</span>
      </p>
      {hotel.reviewLabel ? (
        <p aria-hidden="true" className="mt-space-md text-headline-sm">
          {hotel.reviewLabel}
        </p>
      ) : null}
      <p aria-hidden="true" className="text-body-sm text-on-surface-muted">
        {reviews}
      </p>
      <p className="sr-only">{spoken}</p>
    </section>
  );
}

/** "Most popular facilities": every Facility with its icon and seed label (FR-13). */
function Facilities({ hotel }: { hotel: HotelPage }) {
  return (
    <section aria-labelledby={`facilities-heading-${hotel.hotelId}`}>
      <h2 id={`facilities-heading-${hotel.hotelId}`} className="text-headline-md">
        Most popular facilities
      </h2>
      <ul className="mt-space-lg grid grid-cols-1 gap-space-md md:grid-cols-2">
        {hotel.facilities.map((facility) => (
          <li key={facility.key} className="flex items-center gap-space-sm text-body-md">
            <Icon name={FACILITY_ICONS[facility.key] ?? "check"} className="shrink-0" />
            {facility.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The page's shape while the Hotel loads (DESIGN.md Skeleton). */
export function HotelSkeleton() {
  const block = "rounded-md bg-primary-subtle motion-safe:animate-pulse";
  return (
    <div aria-hidden="true">
      <div className="flex flex-col gap-space-sm">
        <div className={`h-5 w-24 ${block}`} />
        <div className={`h-10 w-2/3 md:w-1/2 ${block}`} />
        <div className={`h-5 w-1/2 md:w-1/3 ${block}`} />
      </div>
      <div className="mt-space-lg grid grid-cols-1 gap-space-md md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className={`${PHOTO} ${block}`} />
        <div className={`${PHOTO} ${block}`} />
      </div>
    </div>
  );
}
