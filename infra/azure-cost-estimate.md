# Azure hosting cost estimate

Pricing pulled from Azure's public retail prices API (`prices.azure.com`) on 2026-10-20, region **South Africa North** (`southafricanorth`), currency USD, pay-as-you-go. Replicate any line below in the [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/) using the exact filters shown — the totals should match what's here.

## Chosen architecture: Azure Container Apps + Azure OpenAI (Foundry Models) RAG search

Containerizing the app on **Azure Container Apps** and adding natural-language hotel search via **Azure OpenAI embeddings** (billed under the Foundry Models service), with `sqlite-vec` for vector storage. AD-12 (see [architecture-checkinn.md](../_bmad-output/initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md)) constrains the app to one Node process with one local SQLite file, so the container runs a single pinned replica (`minReplicas: 1`, no scale-to-zero) with the SQLite file on a persistent Azure Files mount.

### Container Apps compute (1 vCPU / 2 GiB, `minReplicas: 1`, 730 hrs/month)

| Meter | Rate | Monthly cost |
|---|---|---|
| Standard vCPU (idle) | $0.000003/vCPU-sec | $7.88 |
| Standard Memory (2 GiB, idle) | $0.000003/GiB-sec | $15.77 |
| Standard Requests | $0.40 / 1M requests | $0.02 (50,000 req/mo) |
| Container Registry (Basic) | flat — Container Apps pulls the image from a registry | $5.00 |
| Azure Files (1 GiB, pay-as-you-go, transaction optimized) — persists `data/checkinn.db` | $0.000010/GiB-hr + per-10k-op transaction fees | $0.12 |
| **Subtotal** | | **≈ $28.79/month** |

A single always-on replica sits at the idle rate, since AD-12 rules out scale-to-zero or multiple replicas. Verify in the calculator whether the "Environment Management" / "Private Endpoint" / "Planned Maintenance" meters ($0.146/hr each) apply — they're tied to networking features a plain Consumption-only environment doesn't need, so they shouldn't, but confirm before committing.

**Can the storage account (Azure Files) be dropped?** Only if guests' bookings are allowed to disappear without warning. Container Apps' local filesystem is ephemeral — it survives only as long as the current replica instance does. `minReplicas: 1` stops the container from scaling to zero between requests, but it does **not** stop the platform from recycling that one replica: a new revision deploy, a crash restart, or routine node maintenance all wipe local disk and reset `checkinn.db` to whatever shipped in the image. A mounted Azure Files share is what actually satisfies AD-12's "one local SQLite file" requirement across those events. At this app's scale a 1 GiB pay-as-you-go share costs about **$0.12/month** — there's no meaningful saving in leaving it out, only the risk of an involuntary, unannounced reset mid-session.

**Why the calculator can show $0.00 for Container Apps**: left at its request-based defaults (e.g. 1M requests/month, 100ms execution, 20 concurrent), the calculator bills only the actual vCPU/memory-seconds consumed while handling requests — a few thousand vCPU-seconds, well inside the monthly free grant (180,000 vCPU-sec / 360,000 GiB-sec / 2M requests). That models a stateless workload that scales to zero between requests. It isn't a cheaper configuration of the same app — it's a different, incompatible one: scaling to zero wipes the container's local filesystem on the next cold start, losing `data/checkinn.db`. Pinning `minReplicas: 1` to keep that file alive is what moves the cost from the free grant to the idle rate above.

### Azure OpenAI (Foundry Models) embeddings

`sqlite-vec` stores vectors in the same `data/checkinn.db` file and runs in the same Node process — no new Azure service beyond the embedding API call itself.

| Resource / model | Price |
|---|---|
| Azure OpenAI / Foundry resource (the account itself) | **$0 — free to provision, no idle or base fee** |
| `text-embedding-3-small` (recommended) | ≈ $0.02–$0.024 per 1M tokens |
| `text-embedding-3-large` (higher quality, ~6× cost) | ≈ $0.14–$0.16 per 1M tokens |

- Catalog indexing: ~500 hotels × ~300 tokens ≈ 150,000 tokens ≈ **$0.003** per full reindex.
- Per-search query embedding: 50,000 searches/month × ~30 tokens ≈ 1.5M tokens ≈ **$0.03/month**.
- **Total: well under $1/month**, scaling linearly (≈$1/month even at 1M searches/month).

**Region note**: Azure OpenAI/Foundry Models embeddings are not deployable in South Africa North — the Retail Prices API lists no embedding meter there. Create the resource in the nearest supported region (e.g. West Europe, France Central, Germany West Central) and call it from the South Africa North container — a cross-region call, with no meaningful added cost.

**No fixed resource fee**: creating the Azure OpenAI/Foundry resource is free — pay-as-you-go consumption above is the entire bill. Provisioned Throughput (PTU), an optional reserved-capacity tier for guaranteed-throughput chat workloads, isn't available for embedding models and isn't needed here.

**Ask-first note**: Azure OpenAI is a paid external AI service. Per [AGENTS.md](../AGENTS.md) ("Ask first: Calling a paid or external service, including AI providers"), this needs explicit sign-off before implementation.

### Combined total

| Component | Monthly cost |
|---|---|
| Container Apps (`minReplicas: 1`) + registry + requests + Azure Files | ≈ $28.79 |
| Azure OpenAI / Foundry resource (the account itself) | $0 |
| Azure OpenAI embeddings (`text-embedding-3-small`) | < $1.00 |
| **Total** | **≈ $29–30/month (≈ $350/year)** |

### Steps to reproduce in the calculator

1. Go to [azure.microsoft.com/pricing/calculator](https://azure.microsoft.com/en-us/pricing/calculator/) → add **Azure Container Apps** → Consumption plan, region South Africa North, 1 vCPU / 2 GiB, `minReplicas: 1`.
2. Add **Container Registry** → Basic tier, same region.
3. Add **Azure Files** → Pay-as-you-go billing, Transaction Optimized tier, 1 GiB used storage, same region — this is the mount that keeps `data/checkinn.db` alive across restarts.
4. Add **Azure OpenAI** → pick a supported region (not South Africa North) → model `text-embedding-3-small` → enter your expected monthly token volume.

## Assumptions to confirm

- **Region**: South Africa North for the app (guest proximity, ZAR pricing); nearest supported region for Azure OpenAI. Re-run the calculator if these change.
- **Traffic**: assumed low enough to stay under the 100 GB/month free egress tier. If you expect more, add the next bandwidth tier (~$0.12/GB in the MEA zone) in the calculator.
- **Environments**: single demo environment, no separate staging/prod (per [infra/README.md](README.md)).

