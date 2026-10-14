// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  bookingPath,
  generateReference,
  normaliseReference,
  REFERENCE_ALPHABET,
} from "./reference";

const PATTERN = /^CI-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

describe("generateReference", () => {
  it("is CI- plus 6 characters from the readable alphabet", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateReference()).toMatch(PATTERN);
    }
  });

  it("takes its characters from the injected random source", () => {
    const picks = [0, 1, 2, 3, 4, REFERENCE_ALPHABET.length - 1];
    let call = 0;
    expect(generateReference(() => picks[call++])).toBe("CI-ABCDE9");
  });

  it("leaves out O, I, L, 0 and 1", () => {
    expect(REFERENCE_ALPHABET).not.toMatch(/[OIL01]/);
    expect(REFERENCE_ALPHABET).toHaveLength(31);
  });
});

describe("normaliseReference", () => {
  it("trims, uppercases and adds the prefix if missing", () => {
    expect(normaliseReference(" ci-7k3p9q ")).toBe("CI-7K3P9Q");
    expect(normaliseReference("7K3P9Q")).toBe("CI-7K3P9Q");
    expect(normaliseReference("CI-7K3P9Q")).toBe("CI-7K3P9Q");
  });
});

describe("bookingPath", () => {
  it("is the Booking's page under /bookings", () => {
    expect(bookingPath("CI-7K3P9Q")).toBe("/bookings/CI-7K3P9Q");
  });

  it("encodes anything unsafe in a path", () => {
    expect(bookingPath("CI-7K/3P")).toBe("/bookings/CI-7K%2F3P");
  });
});
