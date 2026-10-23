import Link from "next/link";
import { secondaryButton } from "@/components/button-styles";
import { Icon } from "@/components/icons/icons";
import { RemoteImage } from "@/components/remote-image";
import { Stars } from "@/components/stars";
import type {
  BestFitRoom,
  ListingCard as ListingCardModel,
  ScoreBreakdown as ScoreBreakdownModel,
} from "@/domain/types";
import { formatZar, spokenZar } from "@/lib/format";

type ListingCardProps = {
  card: ListingCardModel;
  /** The Hotel page URL with the search criteria kept (FR-6). */
  href: string;
};

const CARD_GRID =
  "grid grid-cols-1 gap-space-lg md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:grid-cols-[33%_minmax(0,1fr)_auto]";
const PHOTO = "h-[200px] w-full md:h-[230px]";

function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** A rand amount shown as "R 4 900" and read as "4 900 rand". */
function Rand({ amount }: { amount: number }) {
  return (
    <>
      <span aria-hidden="true">{formatZar(amount)}</span>
      <span className="sr-only">{spokenZar(amount)}</span>
    </>
  );
}

/** The Review score badge with its text equivalent (DESIGN.md Score badge). */
function Score({ card }: { card: ListingCardModel }) {
  const score = card.reviewScore.toFixed(1);
  const reviews = counted(card.reviewCount, "review", "reviews");
  const spoken = [`Rated ${score} out of 5`, card.reviewLabel, reviews]
    .filter(Boolean)
    .join(", ");
  return (
    <p className="flex flex-wrap items-center gap-space-sm">
      <span aria-hidden="true" className="rounded-sm bg-primary-strong p-space-sm text-label-md leading-none text-on-primary">
        {score}
      </span>
      <span aria-hidden="true" className="text-body-sm text-on-surface-muted">
        {card.reviewLabel ? `${card.reviewLabel} · ${reviews}` : reviews}
      </span>
      <span className="sr-only">{spoken}</span>
    </p>
  );
}

/**
 * The cancellation line for the Stay, worded as on the Hotel page: "Free
 * cancellation" as a Mint pill with its deadline, the ended sentence once the
 * deadline has passed, or "Non-refundable" with a warning icon.
 */
function Cancellation({ card }: { card: ListingCardModel }) {
  const line = card.cancellation;
  if (line.kind === "free") {
    return (
      <p className="flex flex-wrap items-center gap-x-space-sm gap-y-space-xs text-body-sm">
        <span className="inline-block rounded-full bg-success px-space-sm text-label-md text-on-success">
          Free cancellation
        </span>
        <span>{line.until}</span>
      </p>
    );
  }
  if (line.kind === "ended") {
    return <p className="text-body-sm">{line.text}</p>;
  }
  return (
    <p className="flex items-center gap-space-sm text-body-sm">
      <Icon name="warning" className="shrink-0" />
      {/* The card keeps FR-6's short label; the Hotel page has the sentence. */}
      Non-refundable
    </p>
  );
}

/** "Family Room · 1 room · sleeps 4" (EXPERIENCE.md Best-fit room line). */
export function bestFitLine(room: BestFitRoom): string {
  return `${room.name} · ${counted(room.rooms, "room", "rooms")} · sleeps ${room.sleeps}`;
}

const BREAKDOWN_ROWS: [label: string, key: keyof ScoreBreakdownModel][] = [
  ["Relevance, meaning", "meaning"],
  ["Relevance, exact words", "exact"],
  ["Review score signal", "reviewSignal"],
  ["Price signal", "priceSignal"],
  ["Ranking blend score", "score"],
];

/**
 * The Score breakdown (FR-20, DESIGN.md score-breakdown): a display-only
 * table for the presenter, shown only under the server debug flag. It sits
 * outside the card link and is never focusable.
 */
function ScoreBreakdown({ name, breakdown }: { name: string; breakdown: ScoreBreakdownModel }) {
  return (
    <div className="relative min-w-0 rounded-sm border border-primary bg-surface p-space-sm text-body-sm text-on-surface-muted md:col-span-2 lg:col-span-3">
      <table className="w-full border-collapse">
        <caption className="pb-space-xs text-left">Score breakdown, {name}</caption>
        <thead>
          <tr className="border-b border-outline">
            <td />
            <th scope="col" className="py-space-xs text-right font-normal">
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {BREAKDOWN_ROWS.map(([label, key]) => (
            <tr key={key} className="border-b border-outline last:border-b-0">
              <th scope="row" className="py-space-xs pr-space-sm text-left font-normal">
                {label}
              </th>
              <td className="py-space-xs text-right tabular-nums">{breakdown[key].toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A Listing card (FR-6, DESIGN.md Listing card). The hotel name is the only
 * link, stretched over the card, so the whole card is clickable but reads as
 * one link. "See availability" is a visual label only.
 *
 * Under Smart search the price block starts with the Best-fit room line and
 * the price is that room's, with no "from" (FR-14). The Score breakdown, when
 * present, sits at the bottom across the full card width (FR-20).
 */
export function ListingCard({ card, href }: ListingCardProps) {
  return (
    <article
      className={`relative rounded-md border border-primary bg-surface p-space-lg text-on-surface hover:border-tertiary ${CARD_GRID}`}
    >
      {card.firstImage ? (
        <RemoteImage
          src={card.firstImage.url}
          alt={card.firstImage.alt}
          label={card.name}
          className={PHOTO}
        />
      ) : (
        <div
          role="img"
          aria-label={card.name}
          className={`flex items-center justify-center rounded-md border border-primary bg-primary-subtle p-space-md text-center text-headline-sm text-on-surface-muted ${PHOTO}`}
        >
          <span aria-hidden="true">{card.name}</span>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-space-xs">
        <p className="text-label-md text-on-surface-muted uppercase">{card.category}</p>
        <h2 className="text-headline-sm">
          <Link
            href={href}
            className="hover:underline after:absolute after:inset-0 after:rounded-md"
          >
            {card.name}
          </Link>
        </h2>
        <Stars count={card.starRating} />
        <p className="text-body-sm text-on-surface-muted">
          {card.area}, {card.cityName}
        </p>
        <div className="flex flex-col gap-space-md pt-space-sm">
          <Score card={card} />
          {card.facilities.length > 0 && (
            <ul aria-label="Facilities" className="flex flex-wrap gap-space-sm">
              {card.facilities.map((facility) => (
                <li
                  key={facility}
                  className="rounded-full border border-primary px-space-md py-space-xs text-label-md whitespace-nowrap uppercase"
                >
                  {facility}
                </li>
              ))}
            </ul>
          )}
          <Cancellation card={card} />
        </div>
      </div>

      <div className="flex flex-col items-start justify-end gap-space-xs md:col-span-2 md:items-end md:text-right lg:col-span-1">
        {card.bestFit && (
          <p className="text-body-sm text-on-surface-muted">{bestFitLine(card.bestFit)}</p>
        )}
        <p className="text-body-sm text-on-surface-muted">
          {counted(card.nights, "night", "nights")}, {counted(card.adults, "adult", "adults")}
          {card.bestFit ? "" : ": from"}
        </p>
        <p className="text-price-lg whitespace-nowrap">
          <Rand amount={card.totalRand} />
        </p>
        <p className="text-body-sm text-on-surface-muted">
          <Rand amount={card.nightlyRand} /> a night
        </p>
        <span
          aria-hidden="true"
          className={`${secondaryButton} mt-space-md inline-flex items-center whitespace-nowrap`}
        >
          See availability
        </span>
      </div>

      {card.breakdown && <ScoreBreakdown name={card.name} breakdown={card.breakdown} />}
    </article>
  );
}

/** A card-shaped skeleton while results load (DESIGN.md Skeleton). */
export function ListingCardSkeleton() {
  return (
    <div aria-hidden="true" className={`rounded-md border border-primary p-space-lg ${CARD_GRID}`}>
      <div className={`rounded-md bg-primary-subtle motion-safe:animate-pulse ${PHOTO}`} />
      <div className="flex flex-col gap-space-sm">
        <div className="h-5 w-1/4 rounded-md bg-primary-subtle motion-safe:animate-pulse" />
        <div className="h-7 w-2/3 rounded-md bg-primary-subtle motion-safe:animate-pulse" />
        <div className="h-5 w-1/2 rounded-md bg-primary-subtle motion-safe:animate-pulse" />
        <div className="h-9 w-3/4 rounded-md bg-primary-subtle motion-safe:animate-pulse" />
      </div>
      <div className="flex flex-col items-start justify-end gap-space-sm md:col-span-2 md:items-end lg:col-span-1">
        <div className="h-8 w-32 rounded-md bg-primary-subtle motion-safe:animate-pulse" />
        <div className="h-14 w-48 rounded-md bg-primary-subtle motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
