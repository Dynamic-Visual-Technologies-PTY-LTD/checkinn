import { Suspense } from "react";
import { CityTiles, CityTilesSkeleton } from "@/components/city-tiles";
import { getCityTiles } from "@/features/search/queries";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-page px-gutter pt-space-xl pb-space-xl">
      <h1 className="text-headline-display-responsive text-primary">
        Find your stay.
      </h1>
      <p className="mt-space-lg text-body-lg">
        Twelve hotels in six South African cities. Pick your dates and book in
        a few steps.
      </p>

      <section aria-labelledby="explore-heading" className="pt-section">
        <h2 id="explore-heading" className="text-headline-md">
          Explore a city
        </h2>
        <div className="mt-space-lg">
          <Suspense fallback={<CityTilesSkeleton />}>
            <CatalogCityTiles />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

/** Reads the tiles at request time, inside the Suspense boundary (AD-2). */
async function CatalogCityTiles() {
  const tiles = await getCityTiles();
  return <CityTiles tiles={tiles} />;
}
