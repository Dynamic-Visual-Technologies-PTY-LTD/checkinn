<#
.SYNOPSIS
    Provisions the CheckInn Azure infrastructure from infra/main.bicep.

.DESCRIPTION
    Creates or updates the resource group, the container registry, the storage
    account and its file share, the Container Apps environment and app, the app
    identity (AcrPull, Cognitive Services OpenAI User), the GitHub deploy
    identity (federated credential, AcrPush, Container Apps Contributor on the
    app) and the Foundry account, project and its text-embedding-3-small and
    gpt-6-luna deployments.

    The deployment is idempotent. Before deploying, the script reads the image
    the container app runs now and passes it back, so a re-run never replaces
    the deployed image. On the first run there is no app yet and Bicep uses a
    public placeholder image until the deploy workflow ships the real one.

    The script checks that the Azure CLI is installed, that you are signed in
    and that the subscription is reachable before it deploys anything.

    With -WhatIf it runs 'az deployment sub what-if' and changes nothing.

    Afterwards it prints the GitHub environment variables the deploy workflow
    needs. With -ConfigureGitHub it also creates the 'production' environment
    and sets those variables through the GitHub CLI.

    Run it as a person with Owner (or Contributor plus User Access
    Administrator) on the subscription. GitHub Actions never runs it.

.PARAMETER SubscriptionId
    The Azure subscription to deploy into. Defaults to the Azure CLI's current
    subscription.

.PARAMETER ParameterFile
    The .bicepparam file to deploy. Defaults to infra/main.prod.bicepparam.

.PARAMETER Location
    Region that stores the deployment metadata. Defaults to southafricanorth.

.PARAMETER ConfigureGitHub
    Also set the GitHub environment variables with 'gh variable set --env'.
    Requires the GitHub CLI, signed in with admin rights on the repository.

.PARAMETER GitHubEnvironment
    The GitHub environment to configure. Defaults to production. It must match
    the federated credential in modules/github-identity.bicep.

.EXAMPLE
    ./infra/scripts/Deploy-CheckInn.ps1 -WhatIf

    Previews the changes with 'az deployment sub what-if'. Nothing is deployed.

.EXAMPLE
    ./infra/scripts/Deploy-CheckInn.ps1 -SubscriptionId 00000000-0000-0000-0000-000000000000

    Deploys the production infrastructure and prints the GitHub variables to set.

.EXAMPLE
    ./infra/scripts/Deploy-CheckInn.ps1 -ConfigureGitHub

    Deploys, then creates the 'production' GitHub environment and sets its
    AZURE_* variables.

.NOTES
    No secret, key or password is printed or written anywhere. The storage key
    the file share mount needs is read inside Bicep and never leaves Azure. The
    values printed are identifiers, not credentials.
#>
#Requires -Version 7.0

[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidatePattern('^[0-9a-fA-F-]{36}$')]
    [string] $SubscriptionId,

    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string] $ParameterFile = (Join-Path $PSScriptRoot '..' 'main.prod.bicepparam'),

    [string] $Location = 'southafricanorth',

    [switch] $ConfigureGitHub,

    [string] $GitHubEnvironment = 'production'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Az {
    # Runs the Azure CLI and stops on a non-zero exit code.
    param([Parameter(Mandatory)] [string[]] $Arguments, [string] $FailureMessage)
    $output = & az @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw ($FailureMessage ? $FailureMessage : "az $($Arguments[0..2] -join ' ') failed with exit code $LASTEXITCODE.")
    }
    return $output
}

# 1. Azure CLI present and signed in.
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw 'The Azure CLI (az) is not installed or not on the PATH. Install it from https://aka.ms/installazurecli.'
}

$null = & az account show --only-show-errors 2>$null
if ($LASTEXITCODE -ne 0) {
    throw "Not signed in to the Azure CLI. Run 'az login' and try again."
}

# 2. Subscription reachable. It is passed to every call, so the CLI's
#    default subscription is left as it was.
$showArgs = @('account', 'show', '--output', 'json', '--only-show-errors')
if ($SubscriptionId) { $showArgs += @('--subscription', $SubscriptionId) }
$accountJson = & az @showArgs
if ($LASTEXITCODE -ne 0) {
    throw "Subscription '$SubscriptionId' was not found for the signed-in account. Check -SubscriptionId or run 'az account list'."
}
$account = $accountJson | ConvertFrom-Json
if ($account.state -ne 'Enabled') {
    throw "Subscription '$($account.name)' is $($account.state), not Enabled."
}
Write-Host "Subscription: $($account.name) ($($account.id))"
Write-Host "Parameters:   $(Resolve-Path -LiteralPath $ParameterFile)"

function Get-BicepParamValue {
    # Reads a simple string value (param name = 'value') from the .bicepparam file.
    param([Parameter(Mandatory)] [string] $Name, [string] $Default)
    $match = [regex]::Match((Get-Content -LiteralPath $ParameterFile -Raw), "(?m)^\s*param\s+$Name\s*=\s*'([^']+)'")
    if ($match.Success) { return $match.Groups[1].Value }
    if ($Default) { return $Default }
    throw "Could not read $Name from $ParameterFile."
}

# Names follow main.bicep: <type>-<workload>-<env>-<region>.
$nameBase = '{0}-{1}-{2}' -f (Get-BicepParamValue 'workload' 'checkinn'), (Get-BicepParamValue 'environment'), (Get-BicepParamValue 'locationAbbreviation')
$resourceGroup = "rg-$nameBase"
$containerAppName = "ca-$nameBase"

# 3. Keep the image that is deployed now. No app yet: Bicep uses the placeholder.
#    Any other error stops the script, so a failed lookup never redeploys the
#    placeholder over production.
$showOutput = & az resource show --subscription $account.id --resource-group $resourceGroup --name $containerAppName `
    --resource-type 'Microsoft.App/containerApps' --query 'properties.template.containers[0].image' --output tsv --only-show-errors 2>&1
$showExitCode = $LASTEXITCODE
$showError = ($showOutput | Where-Object { $_ -is [System.Management.Automation.ErrorRecord] }) -join [Environment]::NewLine
$currentImage = ($showOutput | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }) -join ''
if ($showExitCode -eq 0 -and $currentImage.Trim()) {
    $currentImage = $currentImage.Trim()
    Write-Host "Image:        $currentImage (kept)"
} elseif ($showExitCode -ne 0 -and $showError -match 'ResourceNotFound|ResourceGroupNotFound') {
    $currentImage = $null
    Write-Host 'Image:        placeholder (no container app yet)'
} else {
    throw "Could not read the image of $containerAppName, so the deployment was stopped to avoid replacing it. az said: $showError"
}

$deploymentName = "checkinn-$((Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss'))"
$deployArgs = @(
    '--subscription', $account.id,
    '--name', $deploymentName,
    '--location', $Location,
    '--parameters', $ParameterFile,
    '--only-show-errors'
)
if ($currentImage) { $deployArgs += @('--parameters', "containerImage=$currentImage") }

# 4. Preview or deploy.
if (-not $PSCmdlet.ShouldProcess("subscription $($account.id)", 'Deploy CheckInn infrastructure')) {
    if ($WhatIfPreference) {
        Write-Host 'Running what-if. Nothing will be changed.'
        & az deployment sub what-if @deployArgs
        if ($LASTEXITCODE -ne 0) { throw 'az deployment sub what-if failed.' }
    }
    return
}

Write-Host "Deploying '$deploymentName'..."
$outputsJson = Invoke-Az -Arguments (@('deployment', 'sub', 'create') + $deployArgs + @('--query', 'properties.outputs', '--output', 'json')) `
    -FailureMessage 'The deployment failed. See the error above, or the Deployments blade of the subscription in the Azure portal.'
$outputs = $outputsJson | ConvertFrom-Json

# 5. GitHub environment variables (identifiers only, never secrets).
$variableNames = 'AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_SUBSCRIPTION_ID', 'AZURE_RESOURCE_GROUP',
    'AZURE_CONTAINERAPP_NAME', 'AZURE_REGISTRY_NAME', 'AZURE_REGISTRY_LOGIN_SERVER'
$variables = [ordered]@{}
foreach ($name in $variableNames) { $variables[$name] = $outputs.$name.value }

Write-Host ''
Write-Host "App:                $($outputs.appUrl.value)"
Write-Host "Federated subject:  $($outputs.federatedSubject.value)"
Write-Host "Foundry endpoint:   $($outputs.foundryEndpoint.value) (deployments $($outputs.embeddingDeploymentName.value), $($outputs.chatDeploymentName.value))"
Write-Host ''
Write-Host "GitHub environment '$GitHubEnvironment' variables:"
$variables.GetEnumerator() | ForEach-Object { Write-Host ("  {0,-28} {1}" -f $_.Key, $_.Value) }

if (-not $ConfigureGitHub) {
    Write-Host ''
    Write-Host 'Set these in GitHub (Settings > Environments > production > Variables),'
    Write-Host 'or re-run this script with -ConfigureGitHub.'
    return
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'The GitHub CLI (gh) is not installed or not on the PATH. Set the variables above by hand instead.'
}
$repo = Get-BicepParamValue 'gitHubRepo'

if ($PSCmdlet.ShouldProcess("$repo environment '$GitHubEnvironment'", 'Create the environment and set its variables')) {
    $null = & gh api --method PUT "repos/$repo/environments/$GitHubEnvironment"
    if ($LASTEXITCODE -ne 0) { throw "Could not create or update the '$GitHubEnvironment' environment on $repo." }
    foreach ($entry in $variables.GetEnumerator()) {
        & gh variable set $entry.Key --env $GitHubEnvironment --repo $repo --body $entry.Value
        if ($LASTEXITCODE -ne 0) { throw "Could not set $($entry.Key) on $repo." }
    }
    Write-Host "GitHub environment '$GitHubEnvironment' on $repo is configured."
}
