// The identity the container app runs as. It pulls the image from the
// registry (AcrPull) and, through foundry.bicep, calls the embedding and chat
// models.

@description('Azure region for the identity.')
param location string

@description('User-assigned managed identity name, for example id-checkinn-prod-san-app.')
param identityName string

@description('Name of the registry the app pulls from.')
param registryName string

@description('Tags applied to every resource.')
param tags object

// Built-in role: AcrPull.
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource registry 'Microsoft.ContainerRegistry/registries@2025-11-01' existing = {
  name: registryName
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: identityName
  location: location
  tags: tags
}

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, identity.id, acrPullRoleId)
  scope: registry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

output identityId string = identity.id
output principalId string = identity.properties.principalId
// The app passes it as AZURE_CLIENT_ID to pick this identity when it signs in.
output clientId string = identity.properties.clientId
output acrPullAssignmentId string = acrPull.id
