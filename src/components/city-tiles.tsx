"use client";

import Link from "next/link";
import { RemoteImage } from "@/components/remote-image";
import { useSearchState } from "@/components/search-state";
import { DEFAULT_PARTY, searchHref } from "@/domain/criteria";
import type { CityTile } from "@/domain/types";

const TILE_GRID = "grid grid-cols-1 gap-space-md md:grid-cols-2 lg:grid-cols-3";

function hotelCountLabel(count: number): string {
  return `${count} ${count === 1 ? "hotel" : "hotels"}`;
}

/**
 * The City tiles on Home (DESIGN.md City tile, FR-27). Each links to a search
 * for its City with the search bar's current Stay and Party.
 */
export function CityTiles({ tiles }: { tiles: CityTile[] }) {
  const shared = useSearchState();
  const stay = shared?.stay ?? null;
  const party = shared?.party ?? DEFAULT_PARTY;
  return (
    <ul className={TILE_GRID}>
      {tiles.map((tile) => {
        const count = hotelCountLabel(tile.hotelCount);
        return (
          <li key={tile.id}>
            <Link
              href={searchHref({ q: tile.name, stay, party })}
              aria-label={`${tile.name}, ${count}`}
              className="group relative block h-[220px] overflow-hidden rounded-md bg-primary-subtle"
            >
              <RemoteImage
                src={tile.image.url}
                alt={tile.image.alt}
                className="h-full w-full"
              />
              <div className="absolute inset-x-0 bottom-0 rounded-b-md bg-linear-to-t from-neutral to-neutral/0 px-space-md pt-space-xl pb-space-md">
                <p className="text-headline-sm text-on-surface group-hover:underline">
                  {tile.name}
                </p>
                <p className="text-body-sm text-on-surface-muted">{count}</p>
              </div>
            </Link>
            <p className="mt-space-xs text-body-sm text-on-surface-muted">
              <a
                href={tile.image.sourceUrl}
                aria-label={`Photo credit: ${tile.name}`}
                className="underline hover:text-tertiary"
              >
                Photo credit
              </a>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/** Six tile-sized skeleton blocks while the tiles load (DESIGN.md Skeleton). */
export function CityTilesSkeleton() {
  return (
    <div aria-hidden="true" className={TILE_GRID}>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-[220px] rounded-md bg-primary-subtle motion-safe:animate-pulse"
        />
      ))}
    </div>
  );
}
