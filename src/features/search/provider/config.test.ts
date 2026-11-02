// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AZURE_VARIABLES,
  azureAuthKind,
  azureConfig,
  getProvider,
  missingAzureVariables,
  searchDebug,
  v1BaseURL,
} from "@/features/search/provider/config";

const state = globalThis as typeof globalThis & { __checkinnProvider?: unknown };
const azure = {
  AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com/",
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
    for (const name of AZURE_VARIABLES.key) {
      const partial: Record<string, string | undefined> = { ...azure, [name]: undefined };
      expect(getProvider(partial)).toBeNull();
      expect(getProvider({ ...azure, [name]: "  " })).toBeNull();
      expect(missingAzureVariables(partial)).toEqual([name]);
    }
    expect(missingAzureVariables(azure)).toEqual([]);
  });

  it("reads trimmed Azure values", () => {
    expect(azureConfig({ ...azure, AZURE_OPENAI_CHAT_DEPLOYMENT: " chat " })).toEqual({
      baseURL: "https://example.openai.azure.com/openai/v1/",
      auth: { kind: "key", apiKey: "test-key" },
      chatDeployment: "chat",
      embeddingDeployment: "embed",
    });
  });

  it("uses the managed identity without a key when AZURE_OPENAI_AUTH is managed-identity", () => {
    const identity = { ...azure, AZURE_OPENAI_API_KEY: undefined, AZURE_OPENAI_AUTH: " Managed-Identity " };
    expect(missingAzureVariables(identity)).toEqual([]);
    expect(azureConfig(identity)?.auth).toEqual({ kind: "managed-identity", clientId: null });
    expect(azureConfig({ ...identity, AZURE_CLIENT_ID: " client-id " })?.auth).toEqual({
      kind: "managed-identity",
      clientId: "client-id",
    });
    expect(getProvider(identity)).not.toBeNull();
    for (const name of AZURE_VARIABLES["managed-identity"]) {
      expect(missingAzureVariables({ ...identity, [name]: undefined })).toEqual([name]);
    }
  });

  it("uses the Azure CLI sign-in without a key when AZURE_OPENAI_AUTH is azure-cli", () => {
    const cli = { ...azure, AZURE_OPENAI_API_KEY: undefined, AZURE_OPENAI_AUTH: " Azure-CLI " };
    expect(azureAuthKind(cli)).toBe("azure-cli");
    expect(missingAzureVariables(cli)).toEqual([]);
    expect(azureConfig(cli)?.auth).toEqual({ kind: "azure-cli" });
    expect(getProvider(cli)).not.toBeNull();
    expect(getProvider(cli)).toBe(getProvider(cli));
    for (const name of AZURE_VARIABLES["azure-cli"]) {
      expect(missingAzureVariables({ ...cli, [name]: undefined })).toEqual([name]);
    }
  });

  it("gives a new Azure provider when the auth changes", () => {
    const withKey = getProvider(azure);
    const withIdentity = getProvider({ ...azure, AZURE_OPENAI_AUTH: "managed-identity" });
    const withCli = getProvider({ ...azure, AZURE_OPENAI_AUTH: "azure-cli" });
    expect(withIdentity).not.toBeNull();
    expect(withIdentity).not.toBe(withKey);
    expect(withCli).not.toBeNull();
    expect(withCli).not.toBe(withIdentity);
  });

  it("reads key auth when AZURE_OPENAI_AUTH is unset, blank or key, and nothing else", () => {
    expect(azureAuthKind({})).toBe("key");
    expect(azureAuthKind({ AZURE_OPENAI_AUTH: " " })).toBe("key");
    expect(azureAuthKind({ AZURE_OPENAI_AUTH: "KEY" })).toBe("key");
    expect(azureAuthKind({ AZURE_OPENAI_AUTH: "something" })).toBeNull();
    expect(azureAuthKind({ AZURE_OPENAI_AUTH: "toString" })).toBeNull();
    expect(azureConfig({ ...azure, AZURE_OPENAI_AUTH: "something" })).toBeNull();
    expect(getProvider({ ...azure, AZURE_OPENAI_AUTH: "something" })).toBeNull();
  });

  it("adds /openai/v1/ to the endpoint unless it is already there", () => {
    const expected = "https://example.openai.azure.com/openai/v1/";
    for (const endpoint of [
      "https://example.openai.azure.com",
      "https://example.openai.azure.com/",
      "https://example.openai.azure.com/openai/v1",
      "https://example.openai.azure.com/openai/v1/",
    ]) {
      expect(v1BaseURL(endpoint)).toBe(expected);
    }
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
