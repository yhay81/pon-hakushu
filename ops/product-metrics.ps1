[CmdletBinding()]
param(
    [switch]$Local
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SqlPath = Join-Path $PSScriptRoot "product-metrics.sql"
$Wrangler = Join-Path $RepoRoot "node_modules\.bin\wrangler.cmd"
$Target = if ($Local) { "--local" } else { "--remote" }
$Sql = (Get-Content $SqlPath) -join " "

$Output = & $Wrangler d1 execute pon-hakushu $Target --json --command $Sql
if ($LASTEXITCODE -ne 0) {
    throw "D1 metrics query failed with exit code $LASTEXITCODE"
}

$Payload = ($Output -join [Environment]::NewLine) | ConvertFrom-Json
$Row = $Payload[0].results[0]
if (-not $Row) {
    throw "D1 metrics query returned no result"
}

function Get-Percent {
    param([int]$Numerator, [int]$Denominator)
    if ($Denominator -eq 0) { return $null }
    return [Math]::Round(($Numerator / $Denominator) * 100, 1)
}

$Users = [int]$Row.users
$Owners = [int]$Row.owners
$Boxes = [int]$Row.boxes_created
$Activated = [int]$Row.boxes_with_reactions

[ordered]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    service = "pon-hakushu"
    environment = if ($Local) { "local" } else { "production" }
    funnel = [ordered]@{
        users = $Users
        owners = $Owners
        boxes_created = $Boxes
        links_copied = [int]$Row.links_copied
        owner_opened = [int]$Row.owner_opened
        reactions = [int]$Row.reactions
        reactors = [int]$Row.reactors
        boxes_with_reactions = $Activated
        boxes_with_5_reactors = [int]$Row.boxes_with_5_reactors
        clap_reactions = [int]$Row.clap_reactions
        more_reactions = [int]$Row.more_reactions
        useful_reactions = [int]$Row.useful_reactions
        thanks_reactions = [int]$Row.thanks_reactions
        repeat_owners = [int]$Row.repeat_owners
        returned = [int]$Row.returned
        users_7d = [int]$Row.users_7d
        boxes_7d = [int]$Row.boxes_7d
    }
    rates = [ordered]@{
        creation_percent = Get-Percent $Boxes $Users
        activation_percent = Get-Percent $Activated $Boxes
        repeat_owner_percent = Get-Percent ([int]$Row.repeat_owners) $Owners
    }
} | ConvertTo-Json -Depth 4
