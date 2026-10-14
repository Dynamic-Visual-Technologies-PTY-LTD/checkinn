// @vitest-environment node
import { describe, expect, it } from "vitest";
import { redirectTarget } from "./server-action";

describe("redirectTarget", () => {
  it("reads the URL from Next's redirect digest", () => {
    const error = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;push;/bookings/CI-7K3P9Q?notice=cancelled;303;",
    });
    expect(redirectTarget(error)).toBe("/bookings/CI-7K3P9Q?notice=cancelled");
  });

  it("is null for any other error", () => {
    expect(redirectTarget(new Error("Failed to fetch"))).toBeNull();
    expect(redirectTarget({ digest: "DYNAMIC_SERVER_USAGE" })).toBeNull();
    expect(redirectTarget(null)).toBeNull();
  });
});
