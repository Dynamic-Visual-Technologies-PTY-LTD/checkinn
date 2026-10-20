// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProvider } from "@/features/search/provider/config";

const state = globalThis as typeof globalThis & { __checkinnProvider?: unknown };
const azure = {
  AZURE_OPENAI_BASE_URL: "https://example.openai.azure.com/openai/v1/",
  AZURE_OPENAI_API_KEY: "test-key",
  AZURE_OPENAI_CHAT_DEPLOYMENT: "chat",
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: "embed",
};

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  delete state.__checkinnProvider;
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
});

describe("getProvider", () => {
  it("is off in npm test", () => {
    expect(process.env.CHECKINN_PROVIDER).toBe("off");
    expect(getProvider()).toBeNull();
  });

  it("is null for off, unset or an unknown value", () => {
    expect(getProvider({ CHECKINN_PROVIDER: "off" })).toBeNull();
    expect(getProvider({ CHECKINN_PROVIDER: " OFF " })).toBeNull();
    expect(getProvider({})).toBeNull();
    expect(getProvider({ CHECKINN_PROVIDER: "something" })).toBeNull();
  });

  it("stays null for the Azure variables until the adapter exists", () => {
    expect(getProvider(azure)).toBeNull();
    expect(getProvider({ ...azure, CHECKINN_PROVIDER: "azure" })).toBeNull();
    expect(getProvider({ ...azure, CHECKINN_PROVIDER: "off" })).toBeNull();
  });

  it("gives the fake for fake, the same one each time, with one warning", () => {
    const first = getProvider({ CHECKINN_PROVIDER: "fake" });
    const second = getProvider({ CHECKINN_PROVIDER: "Fake" });
    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("fake");
  });
});
