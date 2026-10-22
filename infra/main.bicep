// CheckInn on Azure: one resource group holding a Container Apps environment
// and app (one replica), its registry, the Azure Files share for the SQLite
// database, the app and GitHub identities, and Foundry (embeddings) for the
// planned search. A person deploys this with scripts/Deploy-CheckInn.ps1;
// GitHub Actions never does. See README.md.
targetScope = 'subscription'

@description('Workload name used in every resource name.')
@minLength(2)
@maxLength(12)
param workload string = 'checkinn'

@description('Environment name used in resource names and tags.')
@allowed([
  'dev'
  'test'
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

@description('Azure region for Foundry. Embedding models are not offered in South Africa North.')
param foundryLocation string

@description('Short CAF region code for Foundry names, for example sdc for swedencentral.')
@minLength(2)
@maxLength(5)
param foundryLocationAbbreviation string

@description('Image the container app runs. Leave empty for the placeholder; Deploy-CheckInn.ps1 passes the image running now.')
param containerImage string?

var nameBase = '${workload}-${environment}-${locationAbbreviation}'
var compactNameBase = '${workload}${environment}${locationAbbreviation}'
var foundryNameBase = '${workload}-${environment}-${foundryLocationAbbreviation}'
var embeddingDeploymentName = 'text-embedding-3-small'
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
    registryLoginServer: registry.outputs.loginServer
    containerImage: containerImage
    embeddingsEndpoint: foundry.outputs.endpoint
    embeddingsDeploymentName: foundry.outputs.embeddingDeploymentName
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
    gitHubRepo: gitHubRepo
    tags: tags
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
