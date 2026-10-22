---
title: 'Deploy CheckInn to Azure Container Apps with Foundry, using Bicep, PowerShell and GitHub Actions'
type: 'feature'
ticket: ''
created: '2026-10-20'
status: 'built'
baseline_revision: '2ed5d16a468a57b8541263773f8b54a2c54c81b7'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/infra/azure-cost-estimate.md'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** CheckInn runs only on a laptop. `infra/` is a placeholder and there is no deploy pipeline, so the app cannot be reached outside the stand.

**Approach:**
- **Hosting:** run the app as one container on Azure Container Apps in South Africa North, as chosen in `infra/azure-cost-estimate.md`.
- **Persistence:** the SQLite file lives on an Azure Files share.
- **Embeddings:** a Microsoft Foundry account and project in Sweden Central host `text-embedding-3-small` for the planned RAG search.
- **Delivery:** Bicep defines the infrastructure and a PowerShell script provisions it. A GitHub Actions workflow builds the image, pushes it to Azure Container Registry and rolls out a new revision, signing in through OIDC.
- **No secrets:** no secret, key or password is stored in the repo or in GitHub.

## Boundaries & Constraints

**Always:**
- Use CAF names: `<type>-<workload>-<env>-<region>[-<suffix>]`. Registry and storage names are alphanumeric only.
  - South Africa North (`san`): `rg-checkinn-prod-san`, `cae-checkinn-prod-san`, `ca-checkinn-prod-san`, `crcheckinnprodsan<4>`, `stcheckinnprodsan<4>`, `share-checkinn-data`, `id-checkinn-prod-san-app`, `id-checkinn-prod-san-github`.
  - Sweden Central (`sdc`): `aif-checkinn-prod-sdc-<4>`, `proj-checkinn-prod-sdc`.
  - Only globally unique names get a deterministic `uniqueString` suffix (`<4>`).
  - Tag every resource with `workload`, `environment` and `managedBy: bicep`.
- AD-12: `minReplicas` 1, `maxReplicas` 1, single revision mode, one Node process.
- Database: `CHECKINN_DB_PATH=/mnt/data/checkinn.db` on the Azure Files mount, which the non-root container user must be able to write.
- Container Apps settings:
  - Ingress is external on target port 3000, HTTPS only (`allowInsecure: false`).
  - Container size is 1 vCPU / 2 GiB, as in the estimate.
  - No Log Analytics workspace, because the estimate has no logging cost.
- The app identity (`id-…-app`, user-assigned) holds:
  - `AcrPull` on the registry;
  - `Cognitive Services OpenAI User` on Foundry.
- The container app has two non-secret env vars that the app does not read yet: `CHECKINN_EMBEDDINGS_ENDPOINT` and `CHECKINN_EMBEDDINGS_DEPLOYMENT`.
- The GitHub identity (`id-…-github`, user-assigned) has a federated credential bound to the `production` environment and holds only:
  - `AcrPush` on the registry;
  - `Contributor` scoped to the container app alone. Use a narrower built-in role if one allows updating a revision.
- Registry: Basic SKU, admin user disabled.
- Foundry:
  - an `AIServices` account with project management on and key auth disabled;
  - one project;
  - one `text-embedding-3-small` deployment (GlobalStandard, small capacity).
- Storage account security: HTTPS only, TLS 1.2, no public blob access.
- The Azure Files mount needs the storage account key. It is read inside Bicep with `listKeys()` and passed only to the managed environment's storage. It is never output, printed or written to a file.
- Re-running the script keeps the image that is currently deployed. Before a fresh image exists, it uses a public placeholder image.
- The Dockerfile is a multi-stage build on a Node 24 Debian slim image. It runs as the non-root `node` user and includes only what `next start` needs: production `node_modules`, `.next` (without its cache), `public`, `drizzle`, `data/seed`, `package*.json` and `next.config.ts`.
- The workflow reads Azure IDs only from GitHub environment variables (`vars.*`) and never uses `secrets.*`. It tags images with the commit SHA.

**Never:**
- Commit keys, connection strings, passwords, `.env` files or a local `*.db` file. Never output or print the storage key.
- Change application code, `next.config.ts`, dependencies or the schema. The `Secure` cookie (AD-15) is a follow-up.
- Let GitHub Actions deploy Bicep or hold rights beyond the two scoped roles.
- Add services beyond the estimate plus Foundry: no App Service, Application Insights, Log Analytics or chat models.
- Edit `infra/azure-cost-estimate.md`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| First provision | The script is run by an Owner who is signed in to `az` | Every resource and role is created, running the placeholder image. The script prints the GitHub variables | No error expected |
| Re-run after app deploys | Same parameters, and the container app runs `cr…/checkinn:<sha>` | The image is unchanged and nothing is duplicated | — |
| Preview | `-WhatIf` | `az deployment sub what-if` runs and nothing changes | — |
| Not signed in / bad sub | No `az` session, or a bad `-SubscriptionId` | A clear message before anything is deployed | Non-zero exit |
| Deploy from main | CI succeeds on `main`, or a manual dispatch | The image is built and pushed, and the container app is updated to `:<sha>`. The FQDN returns 200 on `/` | The job fails if the smoke check fails |
| Data survives a deploy | A Booking exists, then a new revision rolls out | The Booking is still there, because the DB is on the share | — |
| Fork / PR | A PR or fork run | No deploy | — |

</frozen-after-approval>

## Code Map

- `src/db/client.ts` -- creates the DB folder, migrates from `cwd/drizzle` and seeds from `cwd/data/seed` when empty. The image needs both under the WORKDIR. Do not change.
- `package.json` -- `start` is `next start`, and `next start` reads `PORT`. Set `PORT=3000` in the image. Node is 24.
- `next.config.ts` -- loaded at runtime. It was verified earlier to load with dev dependencies pruned.
- `.github/workflows/ci.yml` -- named `CI`. Reuse its action versions. Do not edit.
- **Implementation already in the working tree, built for App Service:**
  - Keep and adapt: `infra/bicepconfig.json`, `infra/main.bicep`, `infra/main.prod.bicepparam`, `infra/modules/github-identity.bicep`, `infra/modules/foundry.bicep`, `infra/scripts/Deploy-CheckInn.ps1`, `.github/workflows/deploy.yml` (its `workflow_run` guard, permissions, concurrency and OIDC login) and `infra/README.md`.
  - Delete: `infra/modules/app-service.bicep`.
- `infra/modules/foundry.bicep` -- `webAppPrincipalId` becomes the app UAMI's principal ID. With the UAMI, the endpoint cycle goes away, so pass the real endpoint output instead of the computed one.

## Tasks & Acceptance

**Execution:**
- [x] `Dockerfile` and `.dockerignore` (repo root) -- multi-stage build: deps, then build, then a slim runtime with `npm prune --omit=dev`, running as `USER node` with `EXPOSE 3000`. The ignore file excludes `node_modules`, `.next`, `data/*.db*`, `.env*`, `e2e`, test output, `_bmad*` and `.git`.
- [x] `infra/modules/registry.bicep` -- ACR Basic, admin user off.
- [x] `infra/modules/storage.bicep` -- storage account and file share (small quota).
- [x] `infra/modules/container-app.bicep` -- managed environment with no logs destination, environment storage (Azure Files using `listKeys`, `nobrl` plus `uid`/`gid` 1000 mount options), and the container app (UAMI, registry via identity, volume at `/mnt/data`, env vars, replicas 1/1, ingress). The `containerImage` parameter defaults to the placeholder.
- [x] `infra/modules/app-identity.bicep` -- the app UAMI with `AcrPull` on the registry.
- [x] Update `github-identity.bicep` (the two roles), `foundry.bicep`, `main.bicep` (wiring, outputs `AZURE_CONTAINERAPP_NAME`, `AZURE_REGISTRY_NAME`, `AZURE_REGISTRY_LOGIN_SERVER`, `AZURE_RESOURCE_GROUP`, client, tenant and subscription, the app URL and the Foundry endpoint) and `main.prod.bicepparam`. Delete `app-service.bicep`.
- [x] `infra/scripts/Deploy-CheckInn.ps1` -- before deploying, read the current image (`az containerapp show`, if the app exists) and pass it as `containerImage`. Update the variables it prints and sets.
- [x] `.github/workflows/deploy.yml` -- OIDC login, then `az acr build` (no local Docker needed) or `az acr login` plus `docker build/push`, tagged with the SHA. Then `az containerapp update --image`, then a curl smoke check on the FQDN.
- [x] `infra/README.md` -- rewrite for Container Apps: architecture, naming, setup, flow, no-secrets model, and the risks (SQLite on SMB, revision overlap).

**Acceptance Criteria:**
- Given the repo, when it is scanned for secrets, then no key, password, connection string or `secrets.*` is found, `listKeys` appears only as an input to the environment storage, and no output contains a key.
- Given `az bicep build` and `az bicep lint` on every `.bicep` file and the param file, when they run, then there are no errors or warnings.
- Given the PowerShell parser and `Get-Help`, when run on the script, then there are no errors, and a synopsis and examples are shown.
- Given the repo, when the Dockerfile's steps are run locally as plain commands (install, build, prune, then start from a copy containing only the files the Dockerfile copies), then `/` returns 200 with a temp `CHECKINN_DB_PATH`.

## Design Notes

Image build: `az acr build` builds the image inside ACR, so the runner needs no Docker daemon and only `AcrPush`. It does, however, need ACR Tasks, which is available on Basic. Prefer it.

Revision overlap: in single revision mode, Container Apps starts the new replica before it stops the old one. For a few seconds, two processes can share the SQLite file over SMB. That is accepted, given one-replica traffic, and the README documents it.

## Verification

**Commands:**
- `az bicep build` and `az bicep lint` on each `.bicep` file, and `az bicep build-params infra/main.prod.bicepparam` -- expected: clean
- PowerShell `[Parser]::ParseFile` and `Get-Help` -- expected: no errors
- `npm run lint`, `npm run typecheck`, `npx vitest run --maxWorkers=2`, `npm run build` -- expected: pass
- The local runtime smoke test (last AC) -- expected: 200

**Manual checks (if no CLI):**
- `deploy.yml` parses, uses only `vars.*`, and its `workflow_run` guard is unchanged.
- The Dockerfile is not built locally because Docker is unavailable. The first CI run proves it.

## Review Triage Log

Pass 1 (quick): high 2, medium 1, low 1, false 1, maybe-false 1.

| # | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|
| 1 | `deploy.yml` readiness `read` returns 1 at EOF under `bash -e` | high | patch | Reproduced: `bash -e -c 'read -r a b < <(printf "x\ny\n" \| tr "\n" " ")'` exits 1, so every rollout fails |
| 2 | `Deploy-CheckInn.ps1` treats any `az resource show` failure as "no app" and redeploys the placeholder | high | patch | Lines 138-144: `$LASTEXITCODE -ne 0` falls through to `$currentImage = $null`, with stderr discarded |
| 3 | README calls the revision-overlap risk `SQLITE_BUSY` | medium | patch | The `nobrl` mount and WAL (`src/db/client.ts`) leave cross-host writers unsynchronised, so writes can be lost or the file corrupted |
| 4 | `AGENTS.md` still calls `infra/` a placeholder and IaC undecided | low | defer | The fix edits an agent-context file |
| 5 | Workflow uses a token exchange plus `docker build` instead of `az acr build` | false | reject | The frozen block allows "`az acr login` plus `docker build/push`". `az acr build` needs ACR Tasks permissions outside the two allowed roles. The fix would edit the plan |
| 6 | `Container Apps Contributor` at app scope may fail linked checks on the environment or the app UAMI | maybe-false | defer | The role includes `managedEnvironments/join/action`, but only at app scope. Settled by the first real deploy. The fix (environment or RG scope) changes the frozen role scope |
