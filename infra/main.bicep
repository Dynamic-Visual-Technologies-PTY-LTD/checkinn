// CheckInn on Azure: one resource group holding a Container Apps environment
// and app (one replica), its registry, the Azure Files share for the SQLite
// database, the app and GitHub identities, and Foundry (embeddings and a
// gpt-6-luna chat model) for the planned search. A person deploys production
// with scripts/Deploy-CheckInn.ps1; GitHub Actions never does. The canary
// workflow runs the same script against main.canary.bicepparam. See README.md.
targetScope = 'subscription'

@description('Workload name used in every resource name.')
@minLength(2)
@maxLength(12)
param workload string = 'checkinn'

@description('Environment name used in resource names and tags.')
@allowed([
  'dev'
  'test'
  'canary'
  'prod'
])
param environment string

@description('Azure region for everything except Foundry.')
param location string

@description('Short CAF region code for names, for example san for southafricanorth.')
@minLength(2)
@maxLength(5)
param locationAbbreviation string

@description('GitHub repository allowed to deploy, as <org>/<repo>.')
param gitHubRepo string

@description('The repository as it appears in the OIDC token subject: <org>/<repo>, or <org>@<org id>/<repo>@<repo id> when the repository uses immutable subject claims.')
param gitHubSubjectRepo string = gitHubRepo

@description('Azure region for Foundry. Embedding models are not offered in South Africa North.')
param foundryLocation string

@description('Short CAF region code for Foundry names, for example sdc for swedencentral.')
@minLength(2)
@maxLength(5)
param foundryLocationAbbreviation string

@description('Chat deployment capacity in thousands of tokens per minute. The gpt-6-luna quota is per subscription and region, so canary takes little.')
@minValue(1)
param chatCapacity int = 125

@description('GitHub environment that the GitHub identity federated credential trusts.')
param gitHubEnvironment string = 'production'

@description('Give the GitHub identity Contributor and User Access Administrator on the subscription, so its workflow can deploy this template. Keep false for production.')
param gitHubCanDeployInfrastructure bool = false

@description('Image the container app runs. Leave empty for the placeholder; Deploy-CheckInn.ps1 passes the image running now.')
param containerImage string?

var nameBase = '${workload}-${environment}-${locationAbbreviation}'
var compactNameBase = '${workload}${environment}${locationAbbreviation}'
var foundryNameBase = '${workload}-${environment}-${foundryLocationAbbreviation}'
var embeddingDeploymentName = 'text-embedding-3-small'
var chatDeploymentName = 'gpt-6-luna'
var tags = {
  workload: workload
  environment: environment
  managedBy: 'bicep'
}

resource rg 'Microsoft.Resources/resourceGroups@2024-11-01' = {
  name: 'rg-${nameBase}'
  location: location
  tags: tags
}

// Only globally unique names (registry, storage account, Foundry subdomain)
// get a short, deterministic suffix. Re-runs produce the same names.
var uniqueSuffix = take(uniqueString(subscription().id, rg.id), 4)

module registry 'modules/registry.bicep' = {
  name: 'registry'
  scope: rg
  params: {
    location: location
    registryName: 'cr${compactNameBase}${uniqueSuffix}'
    tags: tags
  }
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  scope: rg
  params: {
    location: location
    // Storage names are capped at 24 characters.
    storageAccountName: 'st${take(compactNameBase, 18)}${uniqueSuffix}'
    shareName: 'share-${workload}-data'
    tags: tags
  }
}

module appIdentity 'modules/app-identity.bicep' = {
  name: 'app-identity'
  scope: rg
  params: {
    location: location
    identityName: 'id-${nameBase}-app'
    registryName: registry.outputs.registryName
    tags: tags
  }
}

module foundry 'modules/foundry.bicep' = {
  name: 'foundry'
  scope: rg
  params: {
    location: foundryLocation
    accountName: 'aif-${foundryNameBase}-${uniqueSuffix}'
    projectName: 'proj-${foundryNameBase}'
    embeddingDeploymentName: embeddingDeploymentName
    chatDeploymentName: chatDeploymentName
    // Production: 125K tokens per minute, as the live deployment runs, so
    // Smart search is not rate-limited when several guests search at once.
    chatCapacity: chatCapacity
    appPrincipalId: appIdentity.outputs.principalId
    tags: tags
  }
}

module containerApp 'modules/container-app.bicep' = {
  name: 'container-app'
  scope: rg
  params: {
    location: location
    environmentName: 'cae-${nameBase}'
    containerAppName: 'ca-${nameBase}'
    storageAccountName: storage.outputs.storageAccountName
    shareName: storage.outputs.shareName
    // Using this output also waits for the whole module, so AcrPull exists
    // before the app pulls with the identity.
    appIdentityId: appIdentity.outputs.identityId
    appIdentityClientId: appIdentity.outputs.clientId
    registryLoginServer: registry.outputs.loginServer
    containerImage: containerImage
    embeddingsEndpoint: foundry.outputs.endpoint
    embeddingsDeploymentName: foundry.outputs.embeddingDeploymentName
    chatDeploymentName: foundry.outputs.chatDeploymentName
    tags: tags
  }
}

module gitHubIdentity 'modules/github-identity.bicep' = {
  name: 'github-identity'
  scope: rg
  params: {
    location: location
    identityName: 'id-${nameBase}-github'
    registryName: registry.outputs.registryName
    containerAppName: containerApp.outputs.containerAppName
    gitHubSubjectRepo: gitHubSubjectRepo
    gitHubEnvironment: gitHubEnvironment
    tags: tags
  }
}

// Canary only: the workflow deploys this template itself, at subscription
// scope, and the template assigns roles. Accepted risk: these rights reach
// production too. Production's identity never gets them.
var contributorRoleId = 'b24988ac-6180-42a0-ab88-20f7382dd24c'
var userAccessAdministratorRoleId = '18d7d88d-d35e-4fb5-a5c3-7773c20a72d9'
var gitHubIdentityId = resourceId(
  subscription().subscriptionId,
  rg.name,
  'Microsoft.ManagedIdentity/userAssignedIdentities',
  'id-${nameBase}-github'
)

resource gitHubContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (gitHubCanDeployInfrastructure) {
  name: guid(subscription().id, gitHubIdentityId, contributorRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', contributorRoleId)
    principalId: gitHubIdentity.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

resource gitHubUserAccessAdministrator 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (gitHubCanDeployInfrastructure) {
  name: guid(subscription().id, gitHubIdentityId, userAccessAdministratorRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', userAccessAdministratorRoleId)
    principalId: gitHubIdentity.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

// Identifiers, not credentials. Deploy-CheckInn.ps1 turns the AZURE_* outputs
// into GitHub environment variables. No output contains a key.
output AZURE_CLIENT_ID string = gitHubIdentity.outputs.clientId
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_SUBSCRIPTION_ID string = subscription().subscriptionId
output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_CONTAINERAPP_NAME string = containerApp.outputs.containerAppName
output AZURE_REGISTRY_NAME string = registry.outputs.registryName
output AZURE_REGISTRY_LOGIN_SERVER string = registry.outputs.loginServer
output appUrl string = 'https://${containerApp.outputs.fqdn}'
output federatedSubject string = gitHubIdentity.outputs.federatedSubject
output foundryEndpoint string = foundry.outputs.endpoint
output embeddingDeploymentName string = foundry.outputs.embeddingDeploymentName
output chatDeploymentName string = foundry.outputs.chatDeploymentName
