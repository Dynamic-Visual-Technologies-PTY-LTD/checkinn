// Production values. Nothing secret belongs in this file.
using 'main.bicep'

param workload = 'checkinn'
param environment = 'prod'
param location = 'southafricanorth'
param locationAbbreviation = 'san'
param gitHubRepo = 'Dynamic-Visual-Technologies-PTY-LTD/checkinn'
// The repository uses immutable OIDC subject claims (owner and repo IDs).
// Read it with: gh api repos/<org>/<repo>/actions/oidc/customization/sub
param gitHubSubjectRepo = 'Dynamic-Visual-Technologies-PTY-LTD@107921294/checkinn@1408493918'
param foundryLocation = 'swedencentral'
param foundryLocationAbbreviation = 'sdc'
