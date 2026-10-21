// npm run search:preflight: check the Azure deployments before going on
// stage (AD-32). Needs the presenter's key in `.env.local`; never part of
// `npm test`, `db:reset` or CI.
//
// Calls `interpret` 5 times (p95 within 2.5 s), `embed` once (1024
// dimensions) and `reasons` once. Prints the deployment names and OK, or the
// failing check, and exits non-zero on any failure. Output carries codes,
// statuses and deployment names only: never the key, the Query or the
// Preferences.
import { todayIn } from "@/domain/clock";
import { normaliseText } from "@/domain/text";
import { loadSeed } from "@/db/seed";
import { createAzureProvider, EMBEDDING_DIMENSIONS } from "@/features/search/provider/azure";
import { azureAuthKind, azureConfig, missingAzureVariables } from "@/features/search/provider/config";
import { type InterpretationContext, ProviderError } from "@/features/search/provider/types";
import { loadEnv } from "./load-env";

const INTERPRET_RUNS = 5;
const INTERPRET_TIMEOUT_MS = 2_500;
const EMBED_TIMEOUT_MS = 1_500;
const REASONS_TIMEOUT_MS = 5_000;

const SAMPLE_QUERY = "A quiet hotel in Cape Town this weekend for 2 adults, under R3000 a night";
const SAMPLE_PREFERENCES = "quiet, with a garden";

/** A failure as codes and statuses only. */
function describe(error: unknown, deployment: string): string {
  if (error instanceof ProviderError) {
    const status = error.status === undefined ? "" : `, status ${error.status}`;
    if (error.code === "RATE_LIMITED") {
      return `quota or rate limit reached on ${deployment} (RATE_LIMITED${status})`;
    }
    return `${error.code}${status}`;
  }
  return `unexpected ${error instanceof Error ? error.name : "error"}`;
}

/** Nearest-rank percentile. */
function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function main(): Promise<boolean> {
  loadEnv();
  const auth = azureAuthKind();
  if (!auth) {
    console.error("AZURE_OPENAI_AUTH must be key or managed-identity.");
    return false;
  }
  const config = azureConfig();
  if (!config) {
    console.error(`Not configured. Missing: ${missingAzureVariables().join(", ")}.`);
    console.error("Set them in .env.local (see .env.example).");
    return false;
  }
  const setting = process.env.CHECKINN_PROVIDER?.trim().toLowerCase();
  if (setting && setting !== "azure") {
    console.warn(`Note: CHECKINN_PROVIDER=${setting}, so the app will not use Azure.`);
  }

  console.log(`Auth: ${auth}`);
  console.log(`Chat deployment: ${config.chatDeployment}`);
  console.log(`Embedding deployment: ${config.embeddingDeployment}`);

  const provider = createAzureProvider(config);
  const seed = loadSeed();
  let ok = true;

  // Interpretation: 5 calls, p95 within the 2.5 s budget.
  const context: InterpretationContext = {
    today: todayIn(),
    cities: seed.cities.map((city) => ({ name: city.name, aliases: city.aliases })),
    nicknames: {},
  };
  const timings: number[] = [];
  try {
    for (let i = 0; i < INTERPRET_RUNS; i++) {
      const start = performance.now();
      await provider.interpret(
        normaliseText(SAMPLE_QUERY),
        context,
        AbortSignal.timeout(INTERPRET_TIMEOUT_MS),
      );
      timings.push(performance.now() - start);
    }
    const p95 = Math.round(percentile(timings, 95));
    if (p95 < INTERPRET_TIMEOUT_MS) {
      console.log(`interpret: OK, p95 ${p95} ms over ${INTERPRET_RUNS} calls`);
    } else {
      console.error(`interpret: FAILED, p95 ${p95} ms is not under ${INTERPRET_TIMEOUT_MS} ms`);
      ok = false;
    }
  } catch (error) {
    console.error(
      `interpret: FAILED on call ${timings.length + 1} of ${INTERPRET_RUNS}: ${describe(error, config.chatDeployment)}`,
    );
    ok = false;
  }

  // Embedding: one call, 1024 dimensions.
  try {
    const vectors = await provider.embed(
      [normaliseText(SAMPLE_PREFERENCES)],
      AbortSignal.timeout(EMBED_TIMEOUT_MS),
    );
    if (vectors.length === 1 && vectors[0].length === EMBEDDING_DIMENSIONS) {
      console.log(`embed: OK, ${EMBEDDING_DIMENSIONS} dimensions`);
    } else {
      console.error(`embed: FAILED, expected 1 vector of ${EMBEDDING_DIMENSIONS} dimensions`);
      ok = false;
    }
  } catch (error) {
    console.error(`embed: FAILED: ${describe(error, config.embeddingDeployment)}`);
    ok = false;
  }

  // Match reasons: one call with one sample Hotel and chunk.
  const hotel = seed.hotels[0];
  const chunkId = `${hotel.id}:overview:0`;
  try {
    const reasons = await provider.reasons(
      {
        preferences: normaliseText(SAMPLE_PREFERENCES),
        hotels: [{ hotelId: hotel.id, chunks: [{ id: chunkId, text: hotel.description }] }],
      },
      AbortSignal.timeout(REASONS_TIMEOUT_MS),
    );
    console.log(`reasons: OK, ${reasons.length} reason(s)`);
  } catch (error) {
    console.error(`reasons: FAILED: ${describe(error, config.chatDeployment)}`);
    ok = false;
  }

  return ok;
}

main().then(
  (ok) => {
    console.log(ok ? "OK" : "FAILED");
    if (!ok) process.exitCode = 1;
  },
  (error: unknown) => {
    console.error(`FAILED: ${describe(error, "the Provider")}`);
    process.exitCode = 1;
  },
);
