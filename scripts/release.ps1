# Automated Tag & Release Script
param(
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "        LocalStream Automated GitHub Release         " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# 1. Read package.json version
$pkg = Get-Content -Raw "package.json" | ConvertFrom-Json
$currentVersion = $pkg.version

Write-Host "`nCurrent package.json version: $currentVersion" -ForegroundColor Yellow

if (-not $Version) {
    $parts = $currentVersion.Split('.')
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2] + 1
    $suggestedVersion = "$major.$minor.$patch"

    $inputVersion = Read-Host "Enter new release version [Default: $suggestedVersion]"
    if ($inputVersion) {
        $Version = $inputVersion
    } else {
        $Version = $suggestedVersion
    }
}

# Clean version format (ensure no leading 'v' in package.json, but leading 'v' on git tag)
$cleanVersion = $Version.TrimStart('v')
$tag = "v$cleanVersion"

Write-Host "`nUpdating package.json to version $cleanVersion..." -ForegroundColor Green
$pkg.version = $cleanVersion
$pkg | ConvertTo-Json -Depth 10 | Set-Content "package.json" -Encoding UTF8

Write-Host "`nStaging and committing files..." -ForegroundColor Green
git add .
git commit -m "release: $tag"

Write-Host "`nCreating Git tag $tag..." -ForegroundColor Green
# Delete local tag if already exists
git tag -d $tag 2>$null
git tag -a $tag -m "Release $tag"

Write-Host "`nPushing commit and tags to GitHub..." -ForegroundColor Green
git push origin main
git push origin $tag --force

Write-Host "`n=====================================================" -ForegroundColor Green
Write-Host "  SUCCESS! Release $tag has been triggered on GitHub! " -ForegroundColor Green
Write-Host "  GitHub Actions is now building and uploading:       " -ForegroundColor Green
Write-Host "    - LocalStream Setup $cleanVersion.exe             " -ForegroundColor White
Write-Host "    - LocalStream $cleanVersion.exe                   " -ForegroundColor White
Write-Host "    - LocalStream-Windows-Binaries.zip                " -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "View progress at: https://github.com/harshar007/localmovi/actions`n" -ForegroundColor Cyan
