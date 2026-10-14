// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  LOOKUP_LIMITS,
  LOOKUP_MESSAGES,
  prefilledReference,
  validateLookup,
} from "./lookup";

describe("validateLookup", () => {
  it("normalises the reference and the email", () => {
    expect(validateLookup({ reference: " ci-7k3p9q ", email: " Thandi@Example.COM " })).toEqual({
      ok: true,
      reference: "CI-7K3P9Q",
      email: "thandi@example.com",
    });
    expect(validateLookup({ reference: "7k3p9q", email: "t@example.com" })).toMatchObject({
      ok: true,
      reference: "CI-7K3P9Q",
    });
  });

  it("names each empty field with the guest form's email messages", () => {
    expect(validateLookup({ reference: "  ", email: "" })).toEqual({
      ok: false,
      fieldErrors: {
        reference: "Enter your booking reference.",
        email: "Enter your email address.",
      },
    });
    expect(validateLookup({})).toMatchObject({ ok: false });
  });

  it("rejects an email that is not one", () => {
    expect(validateLookup({ reference: "CI-7K3P9Q", email: "thandi" })).toEqual({
      ok: false,
      fieldErrors: { email: "Enter an email address like name@example.com." },
    });
  });

  it("does not check the reference's format: an unknown one is not found, not invalid", () => {
    expect(validateLookup({ reference: "nonsense", email: "t@example.com" })).toMatchObject({
      ok: true,
      reference: "CI-NONSENSE",
    });
  });

  it("limits the reference's length", () => {
    const long = "A".repeat(LOOKUP_LIMITS.reference + 1);
    expect(validateLookup({ reference: long, email: "t@example.com" })).toEqual({
      ok: false,
      fieldErrors: { reference: LOOKUP_MESSAGES.referenceTooLong },
    });
  });
});

describe("prefilledReference", () => {
  it("normalises the URL's reference", () => {
    expect(prefilledReference("CI-7K3P9Q")).toBe("CI-7K3P9Q");
    expect(prefilledReference(" ci-7k3p9q")).toBe("CI-7K3P9Q");
  });

  it("is empty without one", () => {
    expect(prefilledReference(undefined)).toBe("");
    expect(prefilledReference("  ")).toBe("");
  });

  it("cuts a long value to the field's limit, so the form's own rule accepts it", () => {
    const value = prefilledReference("b".repeat(20));
    expect(value).toBe(`CI-${"B".repeat(17)}`);
    expect(value).toHaveLength(LOOKUP_LIMITS.reference);
    expect(validateLookup({ reference: value, email: "t@example.com" })).toMatchObject({
      ok: true,
    });
  });
});
