---
title: 'Canary pipeline: deploy infrastructure and code from the canary branch'
type: 'feature'
ticket: ''
created: '2026-10-28'
status: 'built'
baseline_revision: 'a0f32693d9235946f4e8295a51d24947c1b8b409'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context: ['{project-root}/infra/README.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Production is the only Azure environment. Changes reach it straight from `main`, and its infrastructure is only ever deployed by a person running `Deploy-CheckInn.ps1`. There is no place to try infrastructure and code together before production.

**Approach:** Add a canary environment in its own resource group (`rg-checkinn-canary-san`) and a GitHub Actions workflow that, for pushes to the `canary` branch, deploys the Bicep infrastructure and then builds and rolls out the image there. Production's pipeline and permissions stay as they are.

## Boundaries & Constraints

**Always:** OIDC federation only, no secrets; GitHub variables are identifiers. Canary resources follow the CAF naming in `infra/README.md` with `canary` as the environment. The workflow only deploys from `refs/heads/canary` in this repository, never from pull requests or forks. Production resources and names are unchanged by any canary run.

**Decisions (human, 2026-10-28):**
- Infra rights: subscription scope. `main.bicep` stays subscription-scoped; the canary GitHub identity gets Contributor + User Access Administrator on the subscription. Accepted risk: a push to `canary` can alter production; the README states this.
- Smart search: canary gets its own Foundry account with low chat capacity (10K TPM) so it fits beside prod's quota.
- Gate: CI (lint, typecheck, test, build, e2e) must pass before a canary deploy.

**Never:** Give the production GitHub identity any new role. Change `deploy.yml`'s triggers, roles or production behaviour. Store keys or add `secrets.*`. Add a new dependency.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Push to `canary`, checks pass | Bicep deployed to canary RG, image `checkinn:<sha>` pushed to the canary registry, new revision ready, smoke check 200 | No error expected |
| PROD_UNTOUCHED | Push to `main` | Only `deploy.yml` runs, as today | — |
| PR_OR_FORK | PR targeting `canary` | Nothing deploys | Job skipped by `if:` |
| INFRA_FAILS | Bicep deployment errors | Workflow stops before building the image; running revision keeps serving | Job fails, error from `az` shown |
| KEEP_IMAGE | Infra step re-runs | Container app keeps its current image until the rollout step | Image read first; lookup error stops the job |
| REVISION_FAILS | New revision never becomes ready | Old revision keeps serving | Job fails after the wait loop |

</frozen-after-approval>

## Code Map

- `.github/workflows/deploy.yml` -- production pipeline. Reuse its registry token exchange, build/push, rollout wait loop and smoke check verbatim in the canary workflow. Do not modify.
- `.github/workflows/ci.yml` -- runs on PRs and pushes to `main` only; a push to `canary` triggers nothing today.
- `infra/main.bicep` -- subscription scope: creates `rg-${workload}-${environment}-${loc}` then calls modules at RG scope. `environment` is `@allowed(['dev','test','prod'])`. Outputs the `AZURE_*` values.
- `infra/modules/github-identity.bicep` -- GitHub identity, federated credential `repo:<subject>:environment:<gitHubEnvironment>` (default `production`), `AcrPush` + `Container Apps Contributor`. Reuse; parameterise.
- `infra/modules/foundry.bicep` -- `chatCapacity` param; `main.bicep` hard-codes 125. gpt-6-luna quota is per subscription and region, shared with prod.
- `infra/main.prod.bicepparam` -- template for the canary param file.
- `infra/scripts/Deploy-CheckInn.ps1` -- already takes `-ParameterFile`, `-GitHubEnvironment`, `-ConfigureGitHub`; reads image to keep it. Used for the one-time human bootstrap of canary.
- `infra/README.md` -- documents environments, identities, setup and deploy flow; must describe canary.
- Storage name check: `st` + `take('checkinncanarysan',18)` + 4 = 23 chars (limit 24), fits.

## Tasks & Acceptance

**Execution:**
- [x] `infra/main.bicep` -- allow `canary` in `environment`; add params `chatCapacity` (default 125, passed to Foundry), `gitHubEnvironment` (default `production`, passed to the GitHub identity module) and `gitHubCanDeployInfrastructure` (default false); when true, assign Contributor and User Access Administrator at subscription scope to the GitHub identity -- the pipeline must be able to run `az deployment sub create`; prod stays false so its identity is unchanged
- [x] `infra/modules/github-identity.bicep` -- output `principalId` for the subscription-scope assignments -- needed by `main.bicep`
- [x] `infra/main.canary.bicepparam` -- `environment = 'canary'`, same regions and repo as prod, `chatCapacity = 10`, `gitHubEnvironment = 'canary'`, `gitHubCanDeployInfrastructure = true` -- no secrets
- [x] `infra/scripts/Deploy-CheckInn.ps1` -- default `-GitHubEnvironment` to the param file's `gitHubEnvironment` (else `production`); update help text that says GitHub Actions never runs it -- canary workflow runs it non-interactively
- [x] `.github/workflows/ci.yml` -- add a `workflow_call:` trigger, nothing else -- lets the canary workflow require CI
- [x] `.github/workflows/deploy-canary.yml` -- on push to `canary` and `workflow_dispatch` (canary ref only); job `ci` uses `./.github/workflows/ci.yml`; job `deploy` needs `ci`, environment `canary`, concurrency `deploy-canary` (no cancel): OIDC sign-in, run `Deploy-CheckInn.ps1 -ParameterFile infra/main.canary.bicepparam` with `pwsh` (keeps the current image), then registry token exchange, build/push, rollout wait and smoke check copied from `deploy.yml`
- [x] `infra/README.md` -- canary section: resource names, identity rights and the accepted prod-reach risk, one-time human bootstrap (`Deploy-CheckInn.ps1 -ParameterFile infra/main.canary.bicepparam -ConfigureGitHub`, then run **Deploy canary** once to replace the placeholder), deploy flow. Keep every statement true for both environments: the "No secrets" OIDC bullet names both subjects; the `modules/github-identity.bicep` Files row and the script's `.DESCRIPTION` say canary's identity also gets subscription Contributor + User Access Administrator; the canary deploy-flow concurrency text says that a newer push cancels the older run's CI (ci.yml `cancel-in-progress`) and only one deploy waits pending. Production setup step 4 says the script now sets the branch rule
- [x] `infra/scripts/Deploy-CheckInn.ps1` (also) -- with `-ConfigureGitHub`, create the environment with custom deployment branch policies (`gh api --method PUT .../environments/<env>` with `deployment_branch_policy: {protected_branches: false, custom_branch_policies: true}`) and add exactly one allowed branch if it is not already listed: `main` for `production`, otherwise the environment name (`canary`). Idempotent on re-run -- closes the window where any branch could use the `canary` environment's subscription-wide identity

**Acceptance Criteria:**
- Given the canary bootstrap has run once, when a commit is pushed to `canary`, then the canary workflow deploys infra and code to `rg-checkinn-canary-san` and its run shows the canary app URL.
- Given `main.prod.bicepparam`, when `az deployment sub what-if` runs, then it reports no changes to production resources.
- Given the production GitHub identity, when its role assignments are listed after the change, then it still holds only `AcrPush` and `Container Apps Contributor`.
- Given a push to `canary` where CI fails, when the canary workflow runs, then the deploy job does not start.

## Implementation Notes

- Implemented by a subagent; diff since baseline read in full by the orchestrator. Files: `infra/main.bicep`, `infra/main.canary.bicepparam` (new), `infra/modules/github-identity.bicep`, `infra/scripts/Deploy-CheckInn.ps1`, `.github/workflows/ci.yml`, `.github/workflows/deploy-canary.yml` (new), `infra/README.md`. `deploy.yml` untouched.
- Subscription role-assignment names use the GitHub identity's computed resource ID, because a module output cannot be used in a resource name.
- `deploy-canary.yml` guards both jobs with the hard-coded repository name and `refs/heads/canary`; on `push`, `github.repository` of a fork is the fork, so the literal is what excludes forks.
- Verified locally: `az bicep build` (no warnings), `az bicep build-params` for both param files, PowerShell parser on the script, YAML parse of both workflows, lint, typecheck, test (667 passed), build.
- Matrix audit: every row describes Azure or GitHub Actions runtime behaviour (OIDC, deployments, revisions). None can be exercised by the repo's Vitest or Playwright suites; they are covered by the compiled-template inspection and the `if:`/`needs:` structure, and need a real canary run to prove. Not run: prod what-if, role listing, bootstrap.
- Iteration 1: prior diff applied as base; script now sets the environment's custom deployment branch policy (one branch: `main` for production, else the environment name) before setting variables; README and script help corrected per triage. Orchestrator softened the README claim that no other branch can use the canary identity "at any point": GitHub auto-creates an unprotected environment when a workflow names it, so a short window remains between the Bicep deployment and `-ConfigureGitHub`.
- Verification after iteration 1: lint, typecheck, test (667/667), Bicep build and both build-params pass; `deploy.yml` diff empty. `npm run build` first stopped with Next.js's `SecurityFatalError` advisory nudge (pre-existing, no package change here), then passed on retry.
- Review pass 2 patches applied by the orchestrator directly (wording only: README, script help and one comment).
- Known behaviour: `ci.yml`'s `cancel-in-progress` applies when called, so two quick pushes to `canary` cancel the first CI and only the newer commit deploys.

## Plan Change Log

- Iteration 1 (review finding: `-ConfigureGitHub` created the `canary` environment without a branch rule, leaving the subscription-wide identity usable from any branch until a manual step). Amended: script task now sets the deployment branch policy itself; README task lists the doc corrections the review found (concurrency text, OIDC bullet, identity rights in Files row and script help, bootstrap's final "run Deploy canary" step). Known-bad state avoided: an unprotected `canary` environment after bootstrap. KEEP: everything else in the prior implementation, saved at `C:/Users/mlaher/AppData/Local/Temp/canary-diff-iter0.patch` -- the Bicep params and conditional subscription role assignments (names from the computed identity resource ID), `main.canary.bicepparam`, the `principalId` output, the `-GitHubEnvironment` default from the param file, `ci.yml`'s single `workflow_call:` line, and `deploy-canary.yml` as written. Apply that patch as the base, then make the amendments.

## Review Triage Log

Pass 1 (quick): high 0, medium 1, low 4, false 0, maybe-false 0, rejected 1.
- medium, bad_plan -- `Deploy-CheckInn.ps1` `-ConfigureGitHub` PUTs the environment with no body, so `canary` has no branch rule until a manual step; any branch's workflow naming `environment: canary` gets a token Azure trusts, for an identity with subscription Contributor + UAA. Fix needs new script behaviour the plan did not settle.
- low, folded into plan -- README canary deploy flow says runs "never cancel each other"; `ci.yml`'s `cancel-in-progress` cancels the older run's CI when called.
- low, folded into plan -- README "No secrets" bullet says the only trusted subject is `environment:production`; canary adds `environment:canary`.
- low, folded into plan -- script `.DESCRIPTION` and README Files row list only the two GitHub identity roles.
- low, folded into plan -- canary bootstrap omits running the workflow once to replace the placeholder image.
- rejected -- "ACs unverified": not a defect in the diff; AC1-3 need Azure/GitHub access and are reported to the human as outstanding.

Pass 2 (quick, after iteration 1): high 0, medium 1, low 4, false 0, maybe-false 0.
- medium, patch -- the first push of the `canary` branch runs `deploy-canary.yml` before bootstrap; its deploy job auto-creates an unprotected `canary` environment and fails at sign-in. Fixed: README bootstrap says to run it before the first push.
- low, patch -- script help and README said "one allowed branch" / "restricts", but `-ConfigureGitHub` only adds the branch and keeps existing policies. Fixed: wording now says it adds the branch and keeps existing policies.
- low, patch -- script comment claimed no other branch could use the environment "at any point", contradicting the README window. Fixed: comment reworded.
- low, patch -- README "Pull requests never deploy" claimed the branch rule unconditionally. Fixed: "after the bootstrap".
- low, rejected -- an explicit `-GitHubEnvironment` that contradicts the parameter file is not checked; needs a deliberate wrong argument, and the fix adds a guard.

## Design Notes

Order matters: infra first with the current image kept (same lookup as `Deploy-CheckInn.ps1` step 3), then build/push/rollout. Deploying the new image through Bicep would need the image pushed first, and the registry might not exist yet.

The federated credential's GitHub environment must be `canary`, and that environment allows only the `canary` branch, mirroring production's `main`-only rule.

CI gate via `workflow_call`, not `workflow_run`: a `workflow_run` workflow always runs from the default branch's file with `github.ref` = `main`, which would fail a `canary`-only environment rule and would not work until merged to `main`. Calling `ci.yml` from a push-to-`canary` workflow keeps `github.ref` = `refs/heads/canary` and still blocks deploy on a red CI.

The first canary deploy must be a human bootstrap: the identity the workflow signs in as is created by that Bicep deployment.

## Verification

**Commands:**
- `az bicep build --file infra/main.bicep --stdout` -- expected: no errors or linter warnings
- `az bicep build-params --file infra/main.canary.bicepparam` -- expected: builds
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` -- expected: pass (no app change)

**Manual checks (if no CLI):**
- `./infra/scripts/Deploy-CheckInn.ps1 -WhatIf` against prod shows no resource changes (run by someone with Azure access).
- Workflow YAML: `if:` only admits `canary` pushes from this repo; no `secrets.*`.
