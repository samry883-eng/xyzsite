#Requires -Version 5.1
# Create the GitHub repo, add origin, and push main (one-time).
# Usage:
#   1) gh auth login          # if not logged in (browser)
#   .\scripts\setup-github-repo.ps1
#   .\scripts\setup-github-repo.ps1 your-repo-name

$ErrorActionPreference = "Stop"

$gh = Join-Path ${env:ProgramFiles} "GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) {
  Write-Error "GitHub CLI not found. Install: winget install GitHub.cli"
}

# This file lives in .../AI SITE/scripts/
$repoRoot = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $repoRoot ".git"))) {
  Write-Error "No .git found at $repoRoot"
}

Set-Location $repoRoot
Write-Host "Repository root: $repoRoot" -ForegroundColor Gray

& $gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nYou need to sign in to GitHub (a browser window will open).`n" -ForegroundColor Yellow
  & $gh auth login -h github.com -p https -w
}

$repoName = if ($args[0]) { $args[0] } else { "ai-site" }

$existing = git remote get-url origin 2>$null
if ($existing) {
  Write-Host "Remote 'origin' already set: $existing" -ForegroundColor Cyan
  Write-Host "Pushing main..."
  git push -u origin main
  Write-Host "`nNext: GitHub repo → Settings → Pages → Source: GitHub Actions" -ForegroundColor Green
  exit 0
}

Write-Host "`nCreating public repo '$repoName' and pushing main..." -ForegroundColor Cyan
& $gh repo create $repoName --public --source=. --remote=origin --push

Write-Host "`nDone." -ForegroundColor Green
Write-Host "1) Open: https://github.com/$( & $gh api user -q .login )/$repoName" -ForegroundColor White
Write-Host "2) Settings → Pages → Build: GitHub Actions (not Branch)" -ForegroundColor White
Write-Host "3) Wait for the 'Deploy GitHub Pages' workflow to finish.`n" -ForegroundColor White
