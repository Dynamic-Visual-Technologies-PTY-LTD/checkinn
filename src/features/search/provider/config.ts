/**
 * Which Provider Smart search uses, from the environment (AD-29). Read only
 * on the server, at request time after `io()`, in a server action, or in a
 * script; never `NEXT_PUBLIC_`.
 *
 * - `CHECKINN_PROVIDER=off`: no Provider, so the app is the MVP.
 * - `CHECKINN_PROVIDER=fake`: the fake, for e2e only. It logs one warning.
 * - `CHECKINN_PROVIDER` unset or `azure`: the Azure adapter, when the Azure
 *   variables for the chosen auth are set; otherwise no Provider.
 * - Anything else: no Provider.
 *
 * `AZURE_OPENAI_AUTH` picks how the adapter signs in:
 * - unset or `key`: `AZURE_OPENAI_API_KEY`, for local development.
 * - `managed-identity`: the host's managed identity, for Azure. Set
 *   `AZURE_CLIENT_ID` for a user-assigned identity.
 * - `azure-cli`: the account signed in with `az login`, for local development
 *   without a key.
 * - Anything else: no Provider.
 */
import {
  type AzureAuth,
  type AzureConfig,
  createAzureProvider,
} from "@/features/search/provider/azure";
import { createFakeProvider } from "@/features/search/provider/fake";
import type { Provider } from "@/features/search/provider/types";

type Env = Record<string, string | undefined>;

/** The variables every Azure auth needs (AD-29). */
const SHARED_VARIABLES = [
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_CHAT_DEPLOYMENT",
  "AZURE_OPENAI_EMBEDDING_DEPLOYMENT",
] as const;

/** The variables the Azure adapter needs, per auth. */
export const AZURE_VARIABLES = {
  key: [...SHARED_VARIABLES, "AZURE_OPENAI_API_KEY"],
  "managed-identity": [...SHARED_VARIABLES],
  "azure-cli": [...SHARED_VARIABLES],
} as const;

export type AzureAuthKind = keyof typeof AZURE_VARIABLES;

/** The chosen auth, or null when `AZURE_OPENAI_AUTH` is not one we know. */
export function azureAuthKind(env: Env = process.env): AzureAuthKind | null {
  const setting = env.AZURE_OPENAI_AUTH?.trim().toLowerCase() || "key";
  return Object.hasOwn(AZURE_VARIABLES, setting) ? (setting as AzureAuthKind) : null;
}

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

/** The Azure variables the chosen auth needs that are unset or blank, by name. */
export function missingAzureVariables(env: Env = process.env): string[] {
  const kind = azureAuthKind(env);
  if (!kind) return [];
  return AZURE_VARIABLES[kind].filter((name) => !env[name]?.trim());
}

function azureAuth(kind: AzureAuthKind, env: Env): AzureAuth {
  if (kind === "key") return { kind, apiKey: env.AZURE_OPENAI_API_KEY!.trim() };
  if (kind === "azure-cli") return { kind };
  return { kind, clientId: env.AZURE_CLIENT_ID?.trim() || null };
}

/**
 * The v1 API base URL for an Azure endpoint: the resource URL as the portal
 * shows it, with `/openai/v1/` added unless it is already there.
 */
export function v1BaseURL(endpoint: string): string {
  const root = endpoint.replace(/\/+$/, "").replace(/\/openai\/v1$/i, "");
  return `${root}/openai/v1/`;
}

/**
 * The Azure configuration, or null when the auth is unknown or any variable
 * it needs is missing.
 */
export function azureConfig(env: Env = process.env): AzureConfig | null {
  const kind = azureAuthKind(env);
  if (!kind || missingAzureVariables(env).length > 0) return null;
  const value = (name: (typeof SHARED_VARIABLES)[number]) => env[name]!.trim();
  return {
    baseURL: v1BaseURL(value("AZURE_OPENAI_ENDPOINT")),
    auth: azureAuth(kind, env),
    chatDeployment: value("AZURE_OPENAI_CHAT_DEPLOYMENT"),
    embeddingDeployment: value("AZURE_OPENAI_EMBEDDING_DEPLOYMENT"),
  };
}

function sameAuth(a: AzureAuth, b: AzureAuth): boolean {
  if (a.kind === "key" && b.kind === "key") return a.apiKey === b.apiKey;
  if (a.kind === "managed-identity" && b.kind === "managed-identity") {
    return a.clientId === b.clientId;
  }
  return a.kind === "azure-cli" && b.kind === "azure-cli";
}

function sameConfig(a: AzureConfig, b: AzureConfig): boolean {
  return (
    a.baseURL === b.baseURL &&
    sameAuth(a.auth, b.auth) &&
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
