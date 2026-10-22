- source_plan: `_bmad-output/initiative-checkinn-mvp/plan-azure-deploy.md`
  summary: Update AGENTS.md (Project Structure `infra/` row, the "Agreed but not installed yet" table) to record Container Apps, Foundry, Bicep, the Dockerfile and deploy.yml.
  evidence: AGENTS.md still says infra/ is a placeholder and IaC is undecided, which contradicts the repo after the Azure deploy change. It was deferred because agent-context edits are out of a build's patch scope.
- source_plan: `_bmad-output/initiative-checkinn-mvp/plan-azure-deploy.md`
  summary: Confirm the GitHub identity's Container Apps Contributor role, scoped to the app only, is enough for `az containerapp update`. If not, scope it to the environment or RG, and add Managed Identity Operator on id-…-app if an identity assign check fires.
  evidence: Unverified (medium if true). The role has managedEnvironments/join/action, but ARM checks it at the environment's scope. The first real deploy settles it.
