// Azure Container Registry for the CheckInn image. Basic SKU, admin user off:
// pulls and pushes use Entra ID (managed identities) only.

@description('Azure region for the registry.')
param location string

@description('Registry name: 5-50 alphanumeric characters, globally unique.')
@minLength(5)
@maxLength(50)
param registryName string

@description('Tags applied to every resource.')
param tags object

resource registry 'Microsoft.ContainerRegistry/registries@2025-11-01' = {
  name: registryName
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    anonymousPullEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

output registryName string = registry.name
output loginServer string = registry.properties.loginServer
