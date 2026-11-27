"use client";

import { secondaryButton } from "@/components/button-styles";
import { Icon, type IconName } from "@/components/icons/icons";
import { roomPriceRand, quantityOf } from "@/domain/selection";
import { nightsLabel } from "@/domain/dates";
import type { RoomOption, RoomSelection } from "@/domain/types";
import { formatZar, spokenZar } from "@/lib/format";
import { useDatesField } from "@/app/hotels/[hotelId]/stay-party-picker";

const AMENITY_ICONS: Record<string, IconName> = {
  private_bathroom: "shower",
  wifi: "wifi",
};

/** The most Rooms left that the table flags ("Only N left"). */
const FEW_LEFT = 3;

/** A whole-rand amount, shown with `formatZar` and spoken as "4 900 rand". */
function Price({ rand, suffix = "" }: { rand: number; suffix?: string }) {
  return (
    <>
      <span aria-hidden="true">
        {formatZar(rand)}
        {suffix}
      </span>
      <span className="sr-only">
        {spokenZar(rand)}
        {suffix}
      </span>
    </>
  );
}

function Sleeps({ maxGuests }: { maxGuests: number }) {
  return (
    <div className="flex flex-col gap-space-xs">
      <span role="img" aria-label={`Sleeps ${maxGuests}`} className="flex gap-space-xs">
        {Array.from({ length: maxGuests }, (_, i) => (
          <Icon key={i} name="person" />
        ))}
      </span>
      <p aria-hidden="true" className="text-body-sm text-on-surface-muted">
        Sleeps {maxGuests}
      </p>
    </div>
  );
}

type RoomTableProps = {
  rooms: RoomOption[];
  /** Nights of the Stay, or `null` when no dates are set. */
  nights: number | null;
  /** Availability per Room type id, or `null` when no dates are set. */
  availability: Readonly<Record<string, number>> | null;
  selection: RoomSelection[];
  /** Left out without dates: there are no selects. */
  onQuantityChange?: (roomTypeId: string, quantity: number) => void;
};

/**
 * The room table (FR-17): a real table from 768px, one card per Room type
 * below it. Without dates it lists the Room types and offers "Show prices".
 */
export function RoomTable({
  rooms,
  nights,
  availability,
  selection,
  onQuantityChange,
}: RoomTableProps) {
  const datesField = useDatesField();
  const priced = nights !== null && availability !== null;
  const th =
    "px-space-md py-space-sm text-left text-label-md text-on-surface-muted uppercase";
  const td = "px-space-md py-space-md align-top max-md:block max-md:px-0 max-md:py-space-sm";

  return (
    <div className="rounded-md border border-primary md:overflow-hidden max-md:border-0">
      <table role="table" className="w-full max-md:block">
        <caption className="sr-only">Room types</caption>
        <thead role="rowgroup" className="max-md:sr-only">
          <tr role="row" className="border-b border-outline">
            <th role="columnheader" scope="col" className={th}>
              Room type
            </th>
            <th role="columnheader" scope="col" className={th}>
              Sleeps
            </th>
            <th role="columnheader" scope="col" className={th}>
              {priced ? `Price for ${nightsLabel(nights)}` : "Price"}
            </th>
            {priced && (
              <th role="columnheader" scope="col" className={th}>
                Rooms
              </th>
            )}
          </tr>
        </thead>
        <tbody role="rowgroup" className="max-md:block max-md:space-y-space-md">
          {rooms.map((room) => {
            const left = priced ? (availability[room.id] ?? 0) : 0;
            const soldOut = priced && left === 0;
            const quantity = quantityOf(selection, room.id);
            return (
              <tr
                key={room.id}
                role="row"
                className="border-b border-outline last:border-b-0 max-md:block max-md:rounded-md max-md:border max-md:border-primary max-md:p-space-md max-md:last:border-b"
              >
                <td role="cell" className={td}>
                  <h3 className="text-headline-sm">{room.name}</h3>
                  <ul className="mt-space-sm flex flex-col gap-space-xs text-body-sm">
                    <li className="flex items-center gap-space-sm">
                      <Icon name="bed" className="shrink-0" />
                      {room.bedsLabel}
                    </li>
                    {room.amenities.map((amenity) => (
                      <li key={amenity.key} className="flex items-center gap-space-sm">
                        <Icon name={AMENITY_ICONS[amenity.key] ?? "check"} className="shrink-0" />
                        {amenity.label}
                      </li>
                    ))}
                  </ul>
                </td>
                <td role="cell" className={td}>
                  <Sleeps maxGuests={room.maxGuests} />
                </td>
                <td role="cell" className={td}>
                  {priced && !soldOut && (
                    <>
                      <p className="text-label-md text-on-surface-muted uppercase md:hidden">
                        Price for {nightsLabel(nights)}
                      </p>
                      <p className="text-price-lg">
                        <Price rand={roomPriceRand(room, nights)} />
                      </p>
                    </>
                  )}
                  {priced && (
                    <p className="text-body-sm text-on-surface-muted">
                      <Price rand={room.nightlyRand} suffix=" a night" />
                    </p>
                  )}
                  {!priced && (
                    <button
                      type="button"
                      onClick={datesField.open}
                      className={secondaryButton}
                    >
                      Show prices
                    </button>
                  )}
                </td>
                {priced && (
                  <td role="cell" className={td}>
                    {soldOut ? (
                      <p className="flex items-center gap-space-xs text-body-md text-error">
                        <Icon name="error" className="shrink-0" />
                        Sold out for your dates
                      </p>
                    ) : (
                      <div className="flex flex-col gap-space-xs">
                        <label className="flex flex-col gap-space-xs text-body-sm md:block">
                          <span aria-hidden="true" className="md:hidden">
                            Rooms
                          </span>
                          <select
                            aria-label={`Rooms of ${room.name}`}
                            value={quantity}
                            onChange={(event) =>
                              onQuantityChange?.(room.id, Number(event.target.value))
                            }
                            className="min-h-11 w-full rounded-sm border border-primary bg-surface px-space-sm text-input-mobile text-on-surface md:w-24 md:text-body-md"
                          >
                            {Array.from({ length: left + 1 }, (_, n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>
                        {left <= FEW_LEFT && (
                          <p className="flex items-center gap-space-xs text-body-sm text-on-surface">
                            <Icon name="warning" className="shrink-0" />
                            Only {left} left
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Skeleton rows while Availability loads (DESIGN.md Skeleton). */
export function RoomTableSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-space-md">
      {[0, 1].map((row) => (
        <div
          key={row}
          className="min-h-40 rounded-md border border-primary bg-primary-subtle motion-safe:animate-pulse"
        />
      ))}
    </div>
  );
}
