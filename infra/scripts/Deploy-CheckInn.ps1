<#
.SYNOPSIS
    Provisions the CheckInn Azure infrastructure from infra/main.bicep.

.DESCRIPTION
    Creates or updates the resource group, the container registry, the storage
    account and its file share, the Container Apps environment and app, the app
    identity (AcrPull, Cognitive Services OpenAI User), the GitHub deploy
    identity (federated credential, AcrPush, Container Apps Contributor on the
    app; for canary also Contributor and User Access Administrator on the
    subscription, through gitHubCanDeployInfrastructure) and the Foundry
    account, project and its text-embedding-3-small and gpt-6-luna deployments.

    The deployment is idempotent. Before deploying, the script reads the image
    the container app runs now and passes it back, so a re-run never replaces
    the deployed image. On the first run there is no app yet and Bicep uses a
    public placeholder image until the deploy workflow ships the real one.

    The script checks that the Azure CLI is installed, that you are signed in
    and that the subscription is reachable before it deploys anything.

    With -WhatIf it runs 'az deployment sub what-if' and changes nothing.

    Afterwards it prints the GitHub environment variables the deploy workflow
    needs. With -ConfigureGitHub it also creates the GitHub environment
    (production, or the parameter file's gitHubEnvironment) with custom
    deployment branch policies, adds its deployment branch (main for
    production, otherwise the branch named after the environment, such as
    canary) if missing, and sets those variables through the GitHub CLI. It
    never removes branch policies already on the environment.

    Run it as a person with Owner (or Contributor plus User Access
    Administrator) on the subscription. GitHub Actions never runs it for
    production. The canary workflow (.github/workflows/deploy-canary.yml) runs
    it non-interactively with -ParameterFile infra/main.canary.bicepparam,
    signed in as the canary GitHub identity.

.PARAMETER SubscriptionId
    The Azure subscription to deploy into. Defaults to the Azure CLI's current
    subscription.

.PARAMETER ParameterFile
    The .bicepparam file to deploy. Defaults to infra/main.prod.bicepparam.

.PARAMETER Location
    Region that stores the deployment metadata. Defaults to southafricanorth.

.PARAMETER ConfigureGitHub
    Also create the GitHub environment with custom branch policies, add its
    deployment branch (main for production, otherwise the environment's name;
    existing policies are kept) and set its variables
    with 'gh variable set --env'. Safe to re-run. Requires the GitHub CLI, signed in with admin rights on the repository.

.PARAMETER GitHubEnvironment
    The GitHub environment to configure. Defaults to the parameter file's
    gitHubEnvironment value, or production when it has none. It must match the
    federated credential in modules/github-identity.bicep.

.EXAMPLE
    ./infra/scripts/Deploy-CheckInn.ps1 -WhatIf

    Previews the changes with 'az deployment sub what-if'. Nothing is deployed.

.EXAMPLE
    ./infra/scripts/Deploy-CheckInn.ps1 -SubscriptionId 00000000-0000-0000-0000-000000000000

    Deploys the production infrastructure and prints the GitHub variables to set.

.EXAMPLE
    ./infra/scripts/Deploy-CheckInn.ps1 -ConfigureGitHub

    Deploys, then creates the 'production' GitHub environment, allows only the
    main branch to deploy to it and sets its AZURE_* variables.

.EXAMPLE
    ./infra/scripts/Deploy-CheckInn.ps1 -ParameterFile infra/main.canary.bicepparam -ConfigureGitHub

    One-time canary bootstrap: deploys rg-checkinn-canary-san, then creates the
    'canary' GitHub environment, allows only the canary branch to deploy to it
    and sets its AZURE_* variables.

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

    # Empty means: read gitHubEnvironment from the parameter file.
    [string] $GitHubEnvironment
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

if (-not $GitHubEnvironment) {
    $GitHubEnvironment = Get-BicepParamValue 'gitHubEnvironment' 'production'
}
Write-Host "GitHub env:   $GitHubEnvironment"

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
    Write-Host "Set these in GitHub (Settings > Environments > $GitHubEnvironment > Variables),"
    Write-Host 'or re-run this script with -ConfigureGitHub.'
    return
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'The GitHub CLI (gh) is not installed or not on the PATH. Set the variables above by hand instead.'
}
$repo = Get-BicepParamValue 'gitHubRepo'

# The only branch allowed to deploy to the environment: main for production,
# otherwise the branch named after the environment (canary).
$allowedBranch = if ($GitHubEnvironment -eq 'production') { 'main' } else { $GitHubEnvironment }

if ($PSCmdlet.ShouldProcess("$repo environment '$GitHubEnvironment'", "Create the environment, allow only the '$allowedBranch' branch and set its variables")) {
    # Custom branch policies, so once this runs only listed branches can use
    # the environment and the identity Azure trusts for it. Policies already
    # on the environment are kept.
    $environmentBody = @{
        deployment_branch_policy = @{ protected_branches = $false; custom_branch_policies = $true }
    } | ConvertTo-Json -Compress
    $null = $environmentBody | & gh api --method PUT "repos/$repo/environments/$GitHubEnvironment" --input -
    if ($LASTEXITCODE -ne 0) { throw "Could not create or update the '$GitHubEnvironment' environment on $repo." }

    $policies = & gh api "repos/$repo/environments/$GitHubEnvironment/deployment-branch-policies" --jq '.branch_policies[] | select(.type != "tag") | .name'
    if ($LASTEXITCODE -ne 0) { throw "Could not read the deployment branch policies of '$GitHubEnvironment' on $repo." }
    if (@($policies) -notcontains $allowedBranch) {
        $null = & gh api --method POST "repos/$repo/environments/$GitHubEnvironment/deployment-branch-policies" -f "name=$allowedBranch" -f 'type=branch'
        if ($LASTEXITCODE -ne 0) { throw "Could not allow the '$allowedBranch' branch on the '$GitHubEnvironment' environment of $repo." }
    }
    Write-Host "GitHub environment '$GitHubEnvironment' allows deployments from '$allowedBranch'."

    foreach ($entry in $variables.GetEnumerator()) {
        & gh variable set $entry.Key --env $GitHubEnvironment --repo $repo --body $entry.Value
        if ($LASTEXITCODE -ne 0) { throw "Could not set $($entry.Key) on $repo." }
    }
    Write-Host "GitHub environment '$GitHubEnvironment' on $repo is configured."
}
