/**
 * Which Provider Smart search uses, from the environment (AD-29). Read only
 * on the server, at request time after `io()`, in a server action, or in a
 * script; never `NEXT_PUBLIC_`.
 *
 * - `CHECKINN_PROVIDER=off`: no Provider, so the app is the MVP.
 * - `CHECKINN_PROVIDER=fake`: the fake, for e2e only. It logs one warning.
 * - `CHECKINN_PROVIDER` unset or `azure`: the Azure adapter, when all four
 *   Azure variables are set; otherwise no Provider.
 * - Anything else: no Provider.
 */
import { type AzureConfig, createAzureProvider } from "@/features/search/provider/azure";
import { createFakeProvider } from "@/features/search/provider/fake";
import type { Provider } from "@/features/search/provider/types";

type Env = Record<string, string | undefined>;

/** The four variables the Azure adapter needs (AD-29). */
export const AZURE_VARIABLES = [
  "AZURE_OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "AZURE_OPENAI_CHAT_DEPLOYMENT",
  "AZURE_OPENAI_EMBEDDING_DEPLOYMENT",
] as const;

type ProviderState = {
  fake?: Provider;
  warned?: boolean;
  azure?: { config: AzureConfig; provider: Provider };
};

// One fake, one Azure adapter and one warning per process (AD-12).
const state = globalThis as typeof globalThis & { __checkinnProvider?: ProviderState };

function held(): ProviderState {
  state.__checkinnProvider ??= {};
  return state.__checkinnProvider;
}

function fakeProvider(): Provider {
  const current = held();
  if (!current.warned) {
    current.warned = true;
    console.warn("CHECKINN_PROVIDER=fake: Smart search answers from fixtures. For e2e only.");
  }
  current.fake ??= createFakeProvider();
  return current.fake;
}

/** The Azure variables that are unset or blank, by name. */
export function missingAzureVariables(env: Env = process.env): string[] {
  return AZURE_VARIABLES.filter((name) => !env[name]?.trim());
}

/** The Azure configuration, or null when any of its variables is missing. */
export function azureConfig(env: Env = process.env): AzureConfig | null {
  if (missingAzureVariables(env).length > 0) return null;
  const value = (name: (typeof AZURE_VARIABLES)[number]) => env[name]!.trim();
  return {
    baseURL: value("AZURE_OPENAI_BASE_URL"),
    apiKey: value("AZURE_OPENAI_API_KEY"),
    chatDeployment: value("AZURE_OPENAI_CHAT_DEPLOYMENT"),
    embeddingDeployment: value("AZURE_OPENAI_EMBEDDING_DEPLOYMENT"),
  };
}

function sameConfig(a: AzureConfig, b: AzureConfig): boolean {
  return (
    a.baseURL === b.baseURL &&
    a.apiKey === b.apiKey &&
    a.chatDeployment === b.chatDeployment &&
    a.embeddingDeployment === b.embeddingDeployment
  );
}

function azureProvider(config: AzureConfig): Provider {
  const current = held();
  if (!current.azure || !sameConfig(current.azure.config, config)) {
    current.azure = { config, provider: createAzureProvider(config) };
  }
  return current.azure.provider;
}

/**
 * Whether the Score breakdown shows (AD-29, FR-20): only when the server's
 * `CHECKINN_SEARCH_DEBUG` is exactly `1`. Read at request time after `io()`;
 * no URL parameter turns it on.
 */
export function searchDebug(env: Env = process.env): boolean {
  return env.CHECKINN_SEARCH_DEBUG === "1";
}

/** The configured Provider, or null when Smart search is off. */
export function getProvider(env: Env = process.env): Provider | null {
  const setting = env.CHECKINN_PROVIDER?.trim().toLowerCase();
  if (setting === "off") return null;
  if (setting === "fake") return fakeProvider();
  if (setting && setting !== "azure") return null;
  const config = azureConfig(env);
  return config ? azureProvider(config) : null;
}
