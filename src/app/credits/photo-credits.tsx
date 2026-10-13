import { getPhotoCredits } from "@/features/hotels/queries";

const LINK = "text-on-surface underline hover:text-tertiary";
const ROWS = "mt-space-lg flex flex-col divide-y divide-outline";
const ROW = "flex flex-col gap-space-xs py-space-md";

/**
 * The credits, read at request time inside the Suspense boundary (AD-2):
 * one row per City, then one per Hotel.
 */
export async function PhotoCreditsList() {
  const { cities, hotels } = await getPhotoCredits();
  return (
    <>
      <section aria-labelledby="credits-cities" className="pt-space-xl">
        <h2 id="credits-cities" className="text-headline-md">
          Cities
        </h2>
        <ul className={ROWS}>
          {cities.map((city) => (
            <li key={city.cityId} className={ROW}>
              <h3 className="text-headline-sm">{city.cityName}</h3>
              <p className="text-body-md">
                <a
                  href={city.sourceUrl}
                  aria-label={`Source and licence: ${city.cityName}`}
                  className={LINK}
                >
                  Source and licence
                </a>
              </p>
              <p className="text-body-sm text-on-surface-muted">{city.creditInstructions}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="credits-hotels" className="pt-space-xl">
        <h2 id="credits-hotels" className="text-headline-md">
          Hotels
        </h2>
        <ul className={ROWS}>
          {hotels.map((hotel) => (
            <li key={hotel.hotelId} className={ROW}>
              <h3 className="text-headline-sm">{hotel.hotelName}</h3>
              <ul className="flex flex-col gap-space-xs text-body-md">
                {hotel.photos.map((photo, index) => (
                  <li key={index}>
                    <a
                      href={photo.sourceUrl}
                      aria-label={`${photo.alt}, ${hotel.hotelName}`}
                      className={LINK}
                    >
                      {photo.alt}
                    </a>
                    {` · ${photo.provider} · `}
                    <a href={photo.licenseUrl} className={LINK}>
                      {photo.provider} licence
                    </a>
                  </li>
                ))}
              </ul>
              {hotel.note && (
                <p className="text-body-sm text-on-surface-muted">{hotel.note}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** Row-shaped skeleton blocks while the credits load (DESIGN.md Skeleton). */
export function PhotoCreditsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-space-md pt-space-xl">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-20 rounded-md bg-primary-subtle motion-safe:animate-pulse" />
      ))}
    </div>
  );
}
