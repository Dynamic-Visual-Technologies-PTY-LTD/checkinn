---
title: 'Add a gpt-6-luna deployment to the Foundry Bicep'
type: 'feature'
ticket: ''
created: '2026-10-23'
status: 'built'
baseline_revision: 'e6d754dd3b4b4bc88cf093fa18cfcd871bafe7af'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Foundry account in `infra/` deploys only `text-embedding-3-small`. The team wants a `gpt-6-luna` chat model deployed next to it, and wants the app told its name the same way it is told the embedding deployment's.

**Approach:** Add a second deployment to `infra/modules/foundry.bicep`: `gpt-6-luna`, OpenAI format, version `2026-09-22` (the GA default in Sweden Central), GlobalStandard, with a capacity parameter defaulting to 10. Thread its name through `main.bicep` into a new `CHECKINN_CHAT_DEPLOYMENT` env var on the container app, add a main output, and update `infra/README.md` and the deploy script's summary line. The app does not read the variable yet.

Decisions (user, 2026-10-23): rebase `features/luna` onto `origin/main`; model `gpt-6-luna`; wire it to the container app like the embeddings.

</frozen-after-approval>

## Implementation Notes

Oneshot: about 40 lines across five infra files, one deployment resource following an existing pattern.

- Rebased `features/luna` onto `origin/main` (`e6d754d`) first. Identical untracked `_bmad/render/` copies were moved to the scratchpad so the checkout could proceed.
- Model catalogue (`az cognitiveservices model list -l swedencentral`): `gpt-6-luna` 2026-09-22, GA, default, SKUs GlobalStandard and DataZoneStandard.
- The chat deployment depends on the embedding deployment, because the account accepts one change at a time (the same reason the embedding depends on the project).
- The endpoint is shared with the embeddings, so no second endpoint variable.

## Review Triage Log

Quick review, pass 1: 0 high, 1 medium, 5 low, 0 false, 0 maybe-false.

- medium, defer: `infra/azure-cost-estimate.md` prices only the embeddings; chat rates need real Retail Prices data. Logged in `_bmad-output/deferred-work.md`.
- low, patch: `infra/main.bicep` header said "Foundry (embeddings)"; now names the chat model.
- low, patch: `infra/modules/app-identity.bicep` header said the identity calls only the embedding model; the role is account-wide, so it now says embedding and chat.
- low, patch: `infra/modules/foundry.bicep` header line over the ~80-column wrap; rewrapped.
- low, patch: `Deploy-CheckInn.ps1` `.DESCRIPTION` line too long with a double "and"; reworded and rewrapped.
- low, rejected: README "Foundry for search" bullet does not say what gpt-6-luna is for. The region reason it gives still holds, and the purpose is not decided yet.

## Verification

**Commands:**
- `az bicep build --file infra/main.bicep --stdout > /dev/null` -- expected: no errors or linter warnings
- `az bicep build-params --file infra/main.prod.bicepparam --stdout > /dev/null` -- expected: succeeds
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` -- expected: all pass (no app code changes)
