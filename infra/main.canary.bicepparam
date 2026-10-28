// Canary values. Same regions and repository as production, its own resource
// group (rg-checkinn-canary-san). Nothing secret belongs in this file.
using 'main.bicep'

param workload = 'checkinn'
param environment = 'canary'
param location = 'southafricanorth'
param locationAbbreviation = 'san'
param gitHubRepo = 'Dynamic-Visual-Technologies-PTY-LTD/checkinn'
// The repository uses immutable OIDC subject claims (owner and repo IDs).
// Read it with: gh api repos/<org>/<repo>/actions/oidc/customization/sub
param gitHubSubjectRepo = 'Dynamic-Visual-Technologies-PTY-LTD@107921294/checkinn@1408493918'
param foundryLocation = 'swedencentral'
param foundryLocationAbbreviation = 'sdc'
// 10K tokens per minute, so canary fits beside production's gpt-6-luna quota.
param chatCapacity = 10
// The federated credential trusts the 'canary' GitHub environment, which
// allows the canary branch only.
param gitHubEnvironment = 'canary'
// The canary workflow deploys this template itself, so its identity needs
// Contributor and User Access Administrator on the subscription.
param gitHubCanDeployInfrastructure = true
