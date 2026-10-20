// Storage account and Azure Files share that hold the SQLite database, so
// Bookings survive restarts and new revisions.

@description('Azure region for the storage account.')
param location string

@description('Storage account name: 3-24 lowercase letters and digits, globally unique.')
@minLength(3)
@maxLength(24)
param storageAccountName string

@description('File share name.')
param shareName string

@description('Share quota in GiB.')
@minValue(1)
param shareQuotaGiB int = 1

@description('Tags applied to every resource.')
param tags object

resource storageAccount 'Microsoft.Storage/storageAccounts@2026-04-01' = {
  name: storageAccountName
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    // The SMB mount in Container Apps authenticates with the account key.
    allowSharedKeyAccess: true
    publicNetworkAccess: 'Enabled'
  }
}

resource fileService 'Microsoft.Storage/storageAccounts/fileServices@2026-04-01' = {
  parent: storageAccount
  name: 'default'
}

resource share 'Microsoft.Storage/storageAccounts/fileServices/shares@2026-04-01' = {
  parent: fileService
  name: shareName
  properties: {
    shareQuota: shareQuotaGiB
    enabledProtocols: 'SMB'
  }
}

output storageAccountName string = storageAccount.name
output shareName string = share.name
