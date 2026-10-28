// The identity GitHub Actions signs in as, through OIDC federation. No secret.
// Least privilege: push images to the one registry and update the one
// container app, nothing else. main.bicep adds subscription rights for canary
// only, through principalId.

@description('Azure region for the identity.')
param location string

@description('User-assigned managed identity name, for example id-checkinn-prod-san-github.')
param identityName string

@description('Name of the registry the workflow pushes to.')
param registryName string

@description('Name of the container app the workflow updates.')
param containerAppName string

@description('The repository as it appears in the OIDC token subject: <org>/<repo>, or <org>@<org id>/<repo>@<repo id> when the repository uses immutable subject claims.')
param gitHubSubjectRepo string

@description('GitHub environment the federated credential is bound to.')
param gitHubEnvironment string = 'production'

@description('Tags applied to every resource.')
param tags object

// Built-in roles. Container Apps Contributor is narrower than Contributor:
// it manages container apps (including new revisions) and nothing else.
var acrPushRoleId = '8311e382-0749-4cb8-b61a-304f252e45ec'
var containerAppsContributorRoleId = '358470bc-b998-42bd-ab17-a7e34c199c0f'

resource registry 'Microsoft.ContainerRegistry/registries@2025-11-01' existing = {
  name: registryName
}

resource containerApp 'Microsoft.App/containerApps@2026-01-01' existing = {
  name: containerAppName
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: identityName
  location: location
  tags: tags
}

resource federatedCredential 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2024-11-30' = {
  parent: identity
  name: 'github-${gitHubEnvironment}'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    subject: 'repo:${gitHubSubjectRepo}:environment:${gitHubEnvironment}'
    audiences: [
      'api://AzureADTokenExchange'
    ]
  }
}

resource acrPush 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, identity.id, acrPushRoleId)
  scope: registry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPushRoleId)
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource containerAppDeploy 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerApp.id, identity.id, containerAppsContributorRoleId)
  scope: containerApp
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', containerAppsContributorRoleId)
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

output clientId string = identity.properties.clientId
output principalId string = identity.properties.principalId
output federatedSubject string = federatedCredential.properties.subject
output acrPushAssignmentId string = acrPush.id
output containerAppDeployAssignmentId string = containerAppDeploy.id
