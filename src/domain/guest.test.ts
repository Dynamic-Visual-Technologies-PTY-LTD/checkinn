// @vitest-environment node
import { describe, expect, it } from "vitest";
import { arrivalTimeOptions, GUEST_MESSAGES, normaliseEmail, validateGuest } from "./guest";

const valid = { firstName: "Thandi", lastName: "Nkosi", email: "thandi@example.com" };

describe("validateGuest", () => {
  it("accepts the required fields and trims them", () => {
    expect(
      validateGuest({
        firstName: " Thandi ",
        lastName: " Nkosi ",
        email: " Thandi@Example.COM ",
        phone: "  ",
        specialRequests: " Late check-in ",
      }),
    ).toEqual({
      ok: true,
      guest: {
        firstName: "Thandi",
        lastName: "Nkosi",
        email: "thandi@example.com",
        phone: null,
        arrivalTime: null,
        specialRequests: "Late check-in",
      },
    });
  });

  it("names each missing required field", () => {
    expect(validateGuest({})).toEqual({
      ok: false,
      fieldErrors: {
        firstName: GUEST_MESSAGES.firstName,
        lastName: GUEST_MESSAGES.lastName,
        email: GUEST_MESSAGES.email,
      },
    });
  });

  it("rejects a malformed email", () => {
    for (const email of ["thandi", "thandi@example", "thandi @example.com", "@example.com"]) {
      expect(validateGuest({ ...valid, email })).toEqual({
        ok: false,
        fieldErrors: { email: GUEST_MESSAGES.emailFormat },
      });
    }
  });

  it("rejects values that are too long", () => {
    const result = validateGuest({ ...valid, specialRequests: "x".repeat(1001) });
    expect(result).toEqual({
      ok: false,
      fieldErrors: { specialRequests: "Keep this to 1000 characters or fewer." },
    });
  });

  it("treats values that are not strings as empty", () => {
    const result = validateGuest({ ...valid, firstName: 42 as unknown as string });
    expect(result).toEqual({ ok: false, fieldErrors: { firstName: GUEST_MESSAGES.firstName } });
  });
});

describe("normaliseEmail", () => {
  it("trims and lowercases", () => {
    expect(normaliseEmail(" Thandi@Example.COM ")).toBe("thandi@example.com");
    expect(normaliseEmail(undefined)).toBe("");
  });
});

describe("arrivalTimeOptions", () => {
  it("runs hourly from the check-in time to midnight", () => {
    const options = arrivalTimeOptions("14:00");
    expect(options[0]).toBe("14:00 – 15:00");
    expect(options.at(-1)).toBe("23:00 – 00:00");
    expect(options).toHaveLength(10);
  });

  it("starts at the hour of a check-in time between hours", () => {
    expect(arrivalTimeOptions("15:30")[0]).toBe("15:00 – 16:00");
  });

  it("offers nothing for an unreadable time", () => {
    expect(arrivalTimeOptions("soon")).toEqual([]);
  });

  it("every option is a valid stored arrival time", () => {
    for (const arrivalTime of arrivalTimeOptions("00:00")) {
      expect(validateGuest({ ...valid, arrivalTime }).ok).toBe(true);
    }
  });
});
