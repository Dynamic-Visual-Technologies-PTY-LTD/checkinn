/**
 * Which Provider Smart search uses, from the environment (AD-29). Read only
 * on the server, at request time after `io()`, in a server action, or in a
 * script; never `NEXT_PUBLIC_`.
 *
 * - `CHECKINN_PROVIDER=off`: no Provider, so the app is the MVP.
 * - `CHECKINN_PROVIDER=fake`: the fake, for e2e only. It logs one warning.
 * - Anything else: the Azure adapter once it exists (story 1.2); until then
 *   no Provider.
 */
import { createFakeProvider } from "@/features/search/provider/fake";
import type { Provider } from "@/features/search/provider/types";

type ProviderState = { fake?: Provider; warned?: boolean };

// One fake and one warning per process (AD-12).
const state = globalThis as typeof globalThis & { __checkinnProvider?: ProviderState };

function fakeProvider(): Provider {
  state.__checkinnProvider ??= {};
  const held = state.__checkinnProvider;
  if (!held.warned) {
    held.warned = true;
    console.warn("CHECKINN_PROVIDER=fake: Smart search answers from fixtures. For e2e only.");
  }
  held.fake ??= createFakeProvider();
  return held.fake;
}

/** The configured Provider, or null when Smart search is off. */
export function getProvider(
  env: Record<string, string | undefined> = process.env,
): Provider | null {
  const setting = env.CHECKINN_PROVIDER?.trim().toLowerCase();
  if (setting === "off") return null;
  if (setting === "fake") return fakeProvider();
  // The Azure adapter arrives in story 1.2.
  return null;
}
