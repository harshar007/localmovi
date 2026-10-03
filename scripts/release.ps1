# Automated Tag & Release Script
param(
    [string]$Version = ""
)

$ErrorActionPreference = "Continue"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "        LocalStream Automated GitHub Release         " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# 1. Read package.json version
$pkg = Get-Content -Raw "package.json" | ConvertFrom-Json
$currentVersion = $pkg.version

Write-Host "`nCurrent package.json version: $currentVersion" -ForegroundColor Yellow

if (-not $Version) {
    $parts = $currentVersion.Split('.')
    if ($parts.Length -ge 3) {
        $major = [int]$parts[0]
        $minor = [int]$parts[1]
        $patch = [int]$parts[2] + 1
        $suggestedVersion = "$major.$minor.$patch"
    } else {
        $suggestedVersion = "1.0.1"
    }

    $inputVersion = Read-Host "Enter new release version [Default: $suggestedVersion]"
    if ($inputVersion) {
        $Version = $inputVersion
    } else {
        $Version = $suggestedVersion
    }
}

# Clean version format (ensure standard semver like 1.0.1)
$cleanVersion = $Version.TrimStart('v').Trim()
if ($cleanVersion -notmatch '\.') {
    $cleanVersion = "$cleanVersion.0.0"
} elseif ($cleanVersion.Split('.').Length -eq 2) {
    $cleanVersion = "$cleanVersion.0"
}
$tag = "v$cleanVersion"

Write-Host "`nUpdating package.json to version $cleanVersion..." -ForegroundColor Green
$pkg.version = $cleanVersion
$pkg | ConvertTo-Json -Depth 10 | Set-Content "package.json" -Encoding UTF8

Write-Host "`nStaging and committing files..." -ForegroundColor Green
git add .
$status = git status --porcelain
if ($status) {
    git commit -m "release: $tag"
}

Write-Host "`nCreating Git tag $tag..." -ForegroundColor Green
$existingTags = git tag -l $tag
if ($existingTags) {
    git tag -d $tag | Out-Null
}
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
