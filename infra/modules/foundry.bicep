// Microsoft Foundry for the planned RAG search: one AIServices account with
// project management on, one project, one text-embedding-3-small deployment
// and one gpt-6-luna chat deployment. Key auth is on, but the container app
// signs in with its managed identity.

@description('Azure region for Foundry. Embeddings are not offered in South Africa North.')
param location string

@description('Foundry account name. Also the custom subdomain, so it must be globally unique.')
param accountName string

@description('Foundry project name, for example proj-checkinn-prod-sdc.')
param projectName string

@description('Name of the embedding deployment the app will call.')
param embeddingDeploymentName string = 'text-embedding-3-small'

@description('Embedding throughput in thousands of tokens per minute. Billing is per token, not per unit of capacity.')
@minValue(1)
param embeddingCapacity int = 10

@description('Name of the chat deployment the app will call.')
param chatDeploymentName string = 'gpt-6-luna'

@description('Chat throughput in thousands of tokens per minute. Billing is per token, not per unit of capacity.')
@minValue(1)
param chatCapacity int = 10

@description('Principal ID of the container app user-assigned identity.')
param appPrincipalId string

@description('Tags applied to every resource.')
param tags object

// Built-in role: Cognitive Services OpenAI User (call deployments, no management, no keys).
var openAiUserRoleId = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'

resource account 'Microsoft.CognitiveServices/accounts@2026-05-01' = {
  name: accountName
  location: location
  tags: tags
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    customSubDomainName: accountName
    allowProjectManagement: true
    disableLocalAuth: false
    publicNetworkAccess: 'Enabled'
  }
}

resource project 'Microsoft.CognitiveServices/accounts/projects@2026-05-01' = {
  parent: account
  name: projectName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    displayName: projectName
    description: 'CheckInn natural-language hotel search (RAG).'
  }
}

resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2026-05-01' = {
  parent: account
  name: embeddingDeploymentName
  tags: tags
  sku: {
    name: 'GlobalStandard'
    capacity: embeddingCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-3-small'
      version: '1'
    }
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
  }
  // The account accepts one change at a time.
  dependsOn: [
    project
  ]
}

resource chatDeployment 'Microsoft.CognitiveServices/accounts/deployments@2026-05-01' = {
  parent: account
  name: chatDeploymentName
  tags: tags
  sku: {
    name: 'GlobalStandard'
    capacity: chatCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-6-luna'
      version: '2026-09-22'
    }
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
  }
  // The account accepts one change at a time.
  dependsOn: [
    embeddingDeployment
  ]
}

resource appOpenAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(account.id, appPrincipalId, openAiUserRoleId)
  scope: account
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', openAiUserRoleId)
    principalId: appPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output accountName string = account.name
output projectName string = project.name
output endpoint string = account.properties.endpoints['OpenAI Language Model Instance API']
output embeddingDeploymentName string = embeddingDeployment.name
output chatDeploymentName string = chatDeployment.name
