/**
 * City nicknames (FR-4): common names a Guest uses for a seed City. Query
 * interpretation puts the City's name in the Search bar instead. Keys are
 * normalised with `normaliseText` (AD-28).
 */
import { normaliseText } from "@/domain/text";

/** Normalised nickname → seed City name. */
export const CITY_NICKNAMES: Readonly<Record<string, string>> = {
  joburg: "Johannesburg",
  jozi: "Johannesburg",
  pe: "Gqeberha",
  cape: "Cape Town",
  durbs: "Durban",
};

/** The City a nickname stands for, or the text unchanged when it is not a nickname. */
export function cityFromNickname(text: string): string {
  return CITY_NICKNAMES[normaliseText(text)] ?? text;
}
