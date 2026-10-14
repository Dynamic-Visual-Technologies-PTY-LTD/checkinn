/**
 * Booking references (AD-10, FR-22): `CI-` plus 6 characters a guest can read
 * off a projector and type on a phone, so no O, I, L, 0 or 1. Stored
 * uppercase with the prefix; every reference a guest types goes through
 * `normaliseReference` before it is compared.
 */

export const REFERENCE_PREFIX = "CI-";
export const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const REFERENCE_LENGTH = 6;

/** A random integer from 0 up to, but not including, `size`. */
export type RandomIndex = (size: number) => number;

/**
 * Web Crypto, available in Node and browsers. Rejection sampling keeps every
 * character equally likely.
 */
const cryptoIndex: RandomIndex = (size) => {
  const limit = 256 - (256 % size);
  const byte = new Uint8Array(1);
  do {
    globalThis.crypto.getRandomValues(byte);
  } while (byte[0] >= limit);
  return byte[0] % size;
};

/** A new reference, e.g. "CI-7K3P9Q". Uniqueness is the caller's to check. */
export function generateReference(random: RandomIndex = cryptoIndex): string {
  let code = "";
  for (let i = 0; i < REFERENCE_LENGTH; i += 1) {
    code += REFERENCE_ALPHABET[random(REFERENCE_ALPHABET.length)];
  }
  return `${REFERENCE_PREFIX}${code}`;
}

/** " ci-7k3p9q " and "7K3P9Q" both become "CI-7K3P9Q". */
export function normaliseReference(input: string): string {
  const value = input.trim().toUpperCase();
  return value.startsWith(REFERENCE_PREFIX) ? value : `${REFERENCE_PREFIX}${value}`;
}
