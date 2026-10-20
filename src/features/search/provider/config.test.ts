// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AZURE_VARIABLES,
  azureConfig,
  getProvider,
  missingAzureVariables,
  searchDebug,
} from "@/features/search/provider/config";

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

  it("gives one Azure provider when all four variables are set and the setting is unset or azure", () => {
    const first = getProvider(azure);
    expect(first).not.toBeNull();
    expect(getProvider(azure)).toBe(first);
    expect(getProvider({ ...azure, CHECKINN_PROVIDER: "azure" })).toBe(first);
    expect(getProvider({ ...azure, CHECKINN_PROVIDER: " Azure " })).toBe(first);
    expect(getProvider({ ...azure, CHECKINN_PROVIDER: "" })).toBe(first);
    expect(warn).not.toHaveBeenCalled();
  });

  it("is null for the Azure variables when the setting is off or unknown", () => {
    expect(getProvider({ ...azure, CHECKINN_PROVIDER: "off" })).toBeNull();
    expect(getProvider({ ...azure, CHECKINN_PROVIDER: "something" })).toBeNull();
  });

  it("is null when any Azure variable is missing or blank", () => {
    for (const name of AZURE_VARIABLES) {
      const partial: Record<string, string | undefined> = { ...azure, [name]: undefined };
      expect(getProvider(partial)).toBeNull();
      expect(getProvider({ ...azure, [name]: "  " })).toBeNull();
      expect(missingAzureVariables(partial)).toEqual([name]);
    }
    expect(missingAzureVariables(azure)).toEqual([]);
  });

  it("reads trimmed Azure values", () => {
    expect(azureConfig({ ...azure, AZURE_OPENAI_CHAT_DEPLOYMENT: " chat " })).toEqual({
      baseURL: azure.AZURE_OPENAI_BASE_URL,
      apiKey: "test-key",
      chatDeployment: "chat",
      embeddingDeployment: "embed",
    });
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

describe("searchDebug", () => {
  it("is on only when CHECKINN_SEARCH_DEBUG is exactly 1", () => {
    expect(searchDebug({ CHECKINN_SEARCH_DEBUG: "1" })).toBe(true);
    for (const value of [undefined, "", "0", "true", "yes", " 1", "1 "]) {
      expect(searchDebug({ CHECKINN_SEARCH_DEBUG: value })).toBe(false);
    }
  });
});
