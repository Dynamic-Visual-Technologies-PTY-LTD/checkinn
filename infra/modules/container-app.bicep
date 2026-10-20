// Container Apps environment, its Azure Files storage, and the CheckInn app.
// AD-12: one replica, single revision mode, one Node process, one SQLite file.

@description('Azure region for the environment and the app.')
param location string

@description('Container Apps environment name, for example cae-checkinn-prod-san.')
param environmentName string

@description('Container app name, for example ca-checkinn-prod-san.')
param containerAppName string

@description('Storage account that holds the database share.')
param storageAccountName string

@description('Azure Files share mounted at /mnt/data.')
param shareName string

@description('Resource ID of the user-assigned identity the app runs as.')
param appIdentityId string

@description('Registry login server, for example crcheckinnprodsanxxxx.azurecr.io.')
param registryLoginServer string

@description('Image to run. Deploy-CheckInn.ps1 passes the image that is running now, so a re-run keeps it.')
param containerImage string = 'mcr.microsoft.com/dotnet/samples:aspnetapp'

@description('Foundry OpenAI endpoint. Not a secret; the app does not read it yet.')
param embeddingsEndpoint string

@description('Foundry embedding deployment name. The app does not read it yet.')
param embeddingsDeploymentName string

@description('Tags applied to every resource.')
param tags object

var targetPort = 3000
var mountPath = '/mnt/data'
var environmentStorageName = 'data'

// The placeholder is an ASP.NET sample. Until the first real image ships it is
// told to listen on the same port as CheckInn; deploy.yml removes the setting.
var usesPlaceholder = startsWith(containerImage, 'mcr.microsoft.com/dotnet/samples')
var placeholderEnv = usesPlaceholder
  ? [
      {
        name: 'ASPNETCORE_HTTP_PORTS'
        value: string(targetPort)
      }
    ]
  : []

resource storageAccount 'Microsoft.Storage/storageAccounts@2026-04-01' existing = {
  name: storageAccountName
}

resource environment 'Microsoft.App/managedEnvironments@2026-01-01' = {
  name: environmentName
  location: location
  tags: tags
  properties: {
    // No logs destination: no Log Analytics workspace, no logging cost.
    appLogsConfiguration: {}
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
    zoneRedundant: false
  }
}

// The SMB mount needs the account key. It is read here and handed only to the
// environment storage; it is never output.
resource environmentStorage 'Microsoft.App/managedEnvironments/storages@2026-01-01' = {
  parent: environment
  name: environmentStorageName
  properties: {
    azureFile: {
      accountName: storageAccount.name
      accountKey: storageAccount.listKeys().keys[0].value
      shareName: shareName
      accessMode: 'ReadWrite'
    }
  }
}

resource containerApp 'Microsoft.App/containerApps@2026-01-01' = {
  name: containerAppName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${appIdentityId}': {}
    }
  }
  properties: {
    environmentId: environment.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: targetPort
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: registryLoginServer
          identity: appIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'checkinn'
          image: containerImage
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
          env: concat(
            [
              {
                name: 'CHECKINN_DB_PATH'
                value: '${mountPath}/checkinn.db'
              }
              {
                name: 'CHECKINN_EMBEDDINGS_ENDPOINT'
                value: embeddingsEndpoint
              }
              {
                name: 'CHECKINN_EMBEDDINGS_DEPLOYMENT'
                value: embeddingsDeploymentName
              }
            ],
            placeholderEnv
          )
          volumeMounts: [
            {
              volumeName: 'data'
              mountPath: mountPath
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
      volumes: [
        {
          name: 'data'
          storageType: 'AzureFile'
          storageName: environmentStorage.name
          // nobrl: SQLite's byte-range locks are not sent to SMB.
          // uid/gid 1000: the image's non-root node user can write the share.
          mountOptions: 'nobrl,uid=1000,gid=1000,dir_mode=0770,file_mode=0660'
        }
      ]
    }
  }
}

output containerAppName string = containerApp.name
output fqdn string = containerApp.properties.configuration.ingress.fqdn
