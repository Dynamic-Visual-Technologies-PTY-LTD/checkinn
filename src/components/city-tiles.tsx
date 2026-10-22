"use client";

import Link from "next/link";
import { RemoteImage } from "@/components/remote-image";
import { useSearchState } from "@/components/search-state";
import { DEFAULT_PARTY, searchHref } from "@/domain/criteria";
import type { CityTile } from "@/domain/types";

const TILE_GRID = "grid grid-cols-1 gap-space-md md:grid-cols-2 lg:grid-cols-3";

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
      {tiles.map((tile) => (
        <li key={tile.id} className="relative">
          <Link
            href={searchHref({ q: tile.name, stay, party })}
            aria-label={tile.name}
            className="group relative block h-[220px] overflow-hidden rounded-md bg-primary-subtle"
          >
            <RemoteImage
              src={tile.image.url}
              alt={tile.image.alt}
              className="h-full w-full"
            />
            <div className="absolute inset-x-0 bottom-0 rounded-b-md bg-linear-to-t from-neutral to-neutral/0 pt-space-xl pr-32 pb-space-md pl-space-md">
              <p className="text-headline-sm text-on-surface group-hover:underline">
                {tile.name}
              </p>
            </div>
          </Link>
          {/* A sibling of the tile link, laid over the photo's bottom corner. */}
          <a
            href={tile.image.sourceUrl}
            aria-label={`Photo credit: ${tile.name}`}
            className="absolute right-space-md bottom-space-md inline-flex min-h-6 items-center rounded-full border border-on-surface/30 bg-neutral/75 px-space-sm py-space-xs text-body-sm leading-none text-on-surface shadow-[0_2px_8px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-colors hover:border-tertiary hover:text-tertiary"
          >
            Photo credit
          </a>
        </li>
      ))}
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
