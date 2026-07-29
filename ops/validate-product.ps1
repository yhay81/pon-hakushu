[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$PagesPath = Join-Path $RepoRoot "src\ui\pages.tsx"
$ProductPath = Join-Path $RepoRoot "src\config\product.ts"
$WorkerPath = Join-Path $RepoRoot "src\worker.tsx"
$MigrationPath = Join-Path $RepoRoot "migrations\0001_boxes.sql"
$PublicDirectory = Join-Path $RepoRoot "public"
$Pages = Get-Content -Raw -LiteralPath $PagesPath
$Product = Get-Content -Raw -LiteralPath $ProductPath
$Worker = Get-Content -Raw -LiteralPath $WorkerPath
$Migration = Get-Content -Raw -LiteralPath $MigrationPath

if ($Pages.Contains('data-template-surface="replace-before-release"')) {
    throw "Replace the starter workspace before release"
}
if ($Pages.Contains('class="hero"') -or $Pages.Contains('class="product-flow"')) {
    throw "Text-led hero and generic product-flow sections are not releaseable"
}
if (-not $Pages.Contains('class="clap-stage"') -or -not $Pages.Contains('class="flying-claps"')) {
    throw "Expected the product-specific page-to-clap-to-tray visualization"
}
if (-not $Pages.Contains('id="create-form"') -or -not $Pages.Contains('id="reaction-app"')) {
    throw "Expected the product-specific creation and reaction workspaces"
}
if ($Pages -match '(?i)public validation|success criteria|experiment|仮説|成功条件') {
    throw "Research copy must not appear on the product surface"
}
if (-not $Pages.Contains('class="reaction-buttons"') -or -not $Pages.Contains('id="public-total"')) {
    throw "Expected the four-reaction public surface"
}
if (-not $Pages.Contains('id="reaction-summary"') -or -not $Pages.Contains('id="day-chart"')) {
    throw "Expected the private reaction summary and 30-day chart"
}
if (-not $Worker.Contains('summary: await getAggregates') -or $Worker.Contains("sessionId: box.")) {
    throw "Public box API must expose aggregates without individual reader data"
}
if (-not $Worker.Contains("parseSourceUrl(source.sourceUrl)") -or -not $Worker.Contains('url.protocol !== "https:"')) {
    throw "Source URL must pass the HTTPS public-page validator"
}
if ($Migration -match '(?i)reader_name|email|message|comment|free_text') {
    throw "Reader names, email, and free-text messages are outside the product boundary"
}
if ($Product.Contains('"kairan-to"') -or $Product.Contains('"回覧灯"')) {
    throw "Replace the previous product identity before release"
}

$OgPath = Join-Path $PublicDirectory "og.svg"
if (-not (Test-Path -LiteralPath $OgPath) -or (Get-Item -LiteralPath $OgPath).Length -lt 3000) {
    throw "Expected a product-specific OG SVG larger than 3 KB"
}

$KeyFiles = @(
    Get-ChildItem -LiteralPath $PublicDirectory -File |
        Where-Object { $_.Name -match "^[a-zA-Z0-9-]{8,128}\.txt$" }
)
if ($KeyFiles.Count -ne 1) {
    throw "Expected exactly one generated IndexNow key file, found $($KeyFiles.Count)"
}
$Key = (Get-Content -Raw -LiteralPath $KeyFiles[0].FullName).Trim()
if ($Key -ne $KeyFiles[0].BaseName) {
    throw "IndexNow key file name and content do not match"
}

Write-Output "Product release contract is satisfied"
