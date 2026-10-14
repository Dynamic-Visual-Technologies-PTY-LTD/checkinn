// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  addAccessToken,
  addBookedReference,
  BOOKED_COOKIE,
  isBookedReference,
  parseBookedReferences,
  removeBookedReference,
  hasAccessToken,
  MAX_ACCESS_TOKENS,
  mintAccessToken,
  parseAccessTokens,
  serializeAccessTokens,
} from "./access";

describe("the access cookie", () => {
  it("is httpOnly, Lax, site-wide, not Secure and lasts 30 days", () => {
    expect(ACCESS_COOKIE).toBe("checkinn_access");
    expect(ACCESS_COOKIE_OPTIONS).toEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: 2_592_000,
    });
  });
});

describe("mintAccessToken", () => {
  it("is random and safe in a cookie", () => {
    const first = mintAccessToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(mintAccessToken()).not.toBe(first);
  });
});

describe("token lists", () => {
  it("round-trips through the cookie value", () => {
    const tokens = ["aaa", "b-b", "c_c"];
    expect(parseAccessTokens(serializeAccessTokens(tokens))).toEqual(tokens);
  });

  it("reads an absent or malformed cookie as no tokens", () => {
    expect(parseAccessTokens(undefined)).toEqual([]);
    expect(parseAccessTokens("")).toEqual([]);
    expect(parseAccessTokens("good..bad token.ok")).toEqual(["good", "ok"]);
  });

  it("adds a token once, as the newest", () => {
    expect(addAccessToken(["a", "b"], "a")).toEqual(["b", "a"]);
    expect(addAccessToken([], "a")).toEqual(["a"]);
  });

  it("drops the oldest token when 20 are already held", () => {
    const held = Array.from({ length: MAX_ACCESS_TOKENS }, (_, i) => `t${i}`);
    const next = addAccessToken(held, "new");
    expect(next).toHaveLength(20);
    expect(next[0]).toBe("t1");
    expect(next.at(-1)).toBe("new");
  });
});

describe("hasAccessToken", () => {
  it("is true only when the cookie holds that token", () => {
    const value = serializeAccessTokens(["abc", "def"]);
    expect(hasAccessToken(value, "def")).toBe(true);
    expect(hasAccessToken(value, "xyz")).toBe(false);
    expect(hasAccessToken(undefined, "abc")).toBe(false);
  });

  it("never matches an empty token or part of one", () => {
    expect(hasAccessToken("abc", "")).toBe(false);
    expect(hasAccessToken("abcdef", "abc")).toBe(false);
  });
});

describe("the just-booked cookie", () => {
  it("is named checkinn_booked and lists references", () => {
    expect(BOOKED_COOKIE).toBe("checkinn_booked");
    const value = serializeAccessTokens(addBookedReference(["CI-AAAAAA"], "CI-BBBBBB"));
    expect(value).toBe("CI-AAAAAA.CI-BBBBBB");
    expect(isBookedReference(value, "CI-BBBBBB")).toBe(true);
    expect(isBookedReference(value, "CI-CCCCCC")).toBe(false);
    expect(isBookedReference(undefined, "CI-BBBBBB")).toBe(false);
  });

  it("drops malformed entries", () => {
    expect(parseBookedReferences("CI-AAAAAA.<script>..ci-lower")).toEqual(["CI-AAAAAA"]);
  });

  it("keeps the newest 20", () => {
    const many = Array.from({ length: 20 }, (_, i) => `CI-${String(i).padStart(6, "0")}`);
    const next = addBookedReference(many, "CI-NEWEST");
    expect(next).toHaveLength(MAX_ACCESS_TOKENS);
    expect(next.at(-1)).toBe("CI-NEWEST");
    expect(next[0]).toBe(many[1]);
  });

  it("removes only the one reference", () => {
    expect(removeBookedReference(["CI-AAAAAA", "CI-BBBBBB"], "CI-AAAAAA")).toEqual(["CI-BBBBBB"]);
  });
});
