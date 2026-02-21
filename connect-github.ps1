# Connect to https://github.com/winets7/winequiz without overwriting history.
# Run from project folder in PowerShell: .\connect-github.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "1/7 git init..." -ForegroundColor Cyan
git init

Write-Host "2/7 Adding remote origin..." -ForegroundColor Cyan
git remote add origin https://github.com/winets7/winequiz.git

Write-Host "3/7 Fetching from GitHub..." -ForegroundColor Cyan
git fetch origin

Write-Host "4/7 Adding files and commit..." -ForegroundColor Cyan
git add -A
git commit -m "Local changes (encoding fix, etc.)" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  No changes to commit or already committed - continuing." -ForegroundColor Yellow
}

Write-Host "5/7 Branch main..." -ForegroundColor Cyan
git branch -M main

Write-Host "6/7 Pulling history from GitHub (no overwrite)..." -ForegroundColor Cyan
git pull origin main --allow-unrelated-histories --no-edit
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Merge conflicts. Resolve manually, then: git add -A; git commit; git push -u origin main" -ForegroundColor Yellow
    exit 1
}

Write-Host "7/7 Pushing to GitHub..." -ForegroundColor Cyan
git push -u origin main

Write-Host ""
Write-Host "Done. Project connected to winets7/winequiz." -ForegroundColor Green
