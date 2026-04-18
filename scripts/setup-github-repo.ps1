#Requires -Version 5.1
# Create the GitHub repo, add origin, and push main — or connect to an existing empty repo.
#
# Usage:
#   gh auth login
#   .\scripts\setup-github-repo.ps1                    # default repo: d-xyzsite
#   .\scripts\setup-github-repo.ps1 my-other-name
#   .\scripts\setup-github-repo.ps1 -Connect             # you already created d-xyzsite on GitHub
#   .\scripts\setup-github-repo.ps1 -Connect my-other-name

param(
  [Parameter(Position = 0)]
  [string] $RepoName = "d-xyzsite",
  [switch] $Connect
)

$ErrorActionPreference = "Stop"

$gh = Join-Path ${env:ProgramFiles} "GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) {
  Write-Error "GitHub CLI not found. Install: winget install GitHub.cli"
}

$repoRoot = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $repoRoot ".git"))) {
  Write-Error "No .git found at $repoRoot"
}

Set-Location $repoRoot
Write-Host "Repository root: $repoRoot" -ForegroundColor Gray

& $gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nSign in to GitHub (browser will open).`n" -ForegroundColor Yellow
  & $gh auth login -h github.com -p https -w
}

$login = (& $gh api user -q .login).Trim()
$originUrl = "https://github.com/$login/$RepoName.git"

$existing = git remote get-url origin 2>$null
if ($existing) {
  Write-Host "Remote 'origin' already set: $existing" -ForegroundColor Cyan
  Write-Host "Pushing main..."
  git push -u origin main
  Write-Host "`nNext: repo → Settings → Pages → Source: GitHub Actions" -ForegroundColor Green
  exit 0
}

if ($Connect) {
  Write-Host "`nConnecting to existing repo: $originUrl" -ForegroundColor Cyan
  git remote add origin $originUrl
  git branch -M main 2>$null
  git push -u origin main
  Write-Host "`nDone. Enable Pages: Settings → Pages → GitHub Actions" -ForegroundColor Green
  Write-Host "Site: https://$login.github.io/$RepoName/`n" -ForegroundColor White
  exit 0
}

Write-Host "`nCreating public repo '$RepoName' and pushing main..." -ForegroundColor Cyan
& $gh repo create $RepoName --public --source=. --remote=origin --push

Write-Host "`nDone." -ForegroundColor Green
Write-Host "1) https://github.com/$login/$RepoName" -ForegroundColor White
Write-Host "2) Settings → Pages → Build: GitHub Actions" -ForegroundColor White
Write-Host "3) Wait for 'Deploy GitHub Pages'.`n" -ForegroundColor White
Write-Host "Preview: https://$login.github.io/$RepoName/`n" -ForegroundColor Gray
