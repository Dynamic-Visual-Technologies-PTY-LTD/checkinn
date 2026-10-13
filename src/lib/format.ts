/**
 * Display formatting. Every rand amount on screen goes through `formatZar`
 * (AD-9, FR-19). `Intl` `en-ZA` separates the symbol and digit groups with a
 * no-break space (U+00A0) and uses a decimal comma: "R 4 900,00".
 */

const wholeRand = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const withCents = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * "R 4 900" for Listing cards and the room table, or "R 4 900,00" with
 * `{ cents: true }` for the booking summary and confirmation.
 */
export function formatZar(
  amountRand: number,
  { cents = false }: { cents?: boolean } = {},
): string {
  return (cents ? withCents : wholeRand).format(amountRand);
}

function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** A Listing card's price line (FR-6): "2 nights, 2 adults: from R 4 900". */
export function stayPriceLine(
  nights: number,
  adults: number,
  totalRand: number,
): string {
  return `${counted(nights, "night", "nights")}, ${counted(adults, "adult", "adults")}: from ${formatZar(totalRand)}`;
}
