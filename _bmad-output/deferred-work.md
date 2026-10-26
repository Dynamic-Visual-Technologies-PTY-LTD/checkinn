# Deferred work

- source_plan: `_bmad-output/plan-gpt-6-luna-foundry-deployment.md`
  summary: Add gpt-6-luna chat token pricing to infra/azure-cost-estimate.md.
  evidence: The estimate prices only text-embedding-3-small, but the README links it as the cost reference and Foundry now also deploys gpt-6-luna, whose per-token rates are much higher; needs real rates from the Azure Retail Prices API.
