# Creates private GitHub repos for the app and the proxy and pushes main.
# Run after: gh auth login
$gh = "C:\Program Files\GitHub CLI\gh.exe"
& $gh auth status; if ($LASTEXITCODE -ne 0) { Write-Host "Sign in first: gh auth login"; exit 1 }
foreach ($p in @(
  @{ dir = "C:\Users\Archlord\Desktop\CropGuard-AI";   name = "cropguard-ai" },
  @{ dir = "C:\Users\Archlord\Desktop\cropguard-proxy"; name = "cropguard-proxy" })) {
  Set-Location $p.dir
  if (git remote 2>$null | Select-String origin) { git push -u origin main }
  else { & $gh repo create $p.name --private --source . --remote origin --push }
}
& $gh repo list --limit 5
