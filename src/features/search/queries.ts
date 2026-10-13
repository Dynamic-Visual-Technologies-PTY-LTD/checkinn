import "server-only";
import { io } from "next/cache";
import { getDb } from "@/db/client";
import type { CityTile } from "@/domain/types";
import { listCityTiles } from "@/features/hotels/catalog.repo";

/** Home's City tiles, read at request time (AD-2). */
export async function getCityTiles(): Promise<CityTile[]> {
  await io();
  return listCityTiles(getDb());
}
