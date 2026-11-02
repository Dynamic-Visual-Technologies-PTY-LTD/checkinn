import { describe, expect, it } from "vitest";
import { normaliseText } from "./text";

describe("normaliseText", () => {
  it("trims, collapses whitespace and lowercases", () => {
    expect(normaliseText("  Pet friendly\n\tfamily   PLACE  ")).toBe("pet friendly family place");
  });

  it("gives the same key for the same words written differently", () => {
    expect(normaliseText("Quiet Hotel")).toBe(normaliseText(" quiet   hotel "));
  });

  it("is empty for whitespace only", () => {
    expect(normaliseText(" \n ")).toBe("");
  });

  it("keeps punctuation", () => {
    expect(normaliseText("Up to R2000, a night")).toBe("up to r2000, a night");
  });
});
