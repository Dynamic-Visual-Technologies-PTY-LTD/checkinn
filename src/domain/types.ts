/**
 * Base domain types. Names follow the PRD Glossary.
 */

/** An ISO calendar date, `YYYY-MM-DD`, with no time and no time zone. */
export type IsoDate = string;

/** A check-in date and a check-out date. Nights = check-out minus check-in. */
export type Stay = {
  checkIn: IsoDate;
  checkOut: IsoDate;
};

/** The adults, children and Rooms a Guest asks for. Guests = adults + children. */
export type Party = {
  adults: number;
  children: number;
  rooms: number;
};

/** A City tile on Home: the City, its catalog Hotel count and its photo. */
export type CityTile = {
  id: string;
  name: string;
  hotelCount: number;
  image: {
    url: string;
    alt: string;
    /** The photo's source page, which holds the photographer credit. */
    sourceUrl: string;
  };
};
