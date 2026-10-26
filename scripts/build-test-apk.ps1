# Builds a standalone test release APK (arm64) and copies it safely
# away from the original Tassel-v2.6.0.apk to preserve the baseline build.
$root = 'C:\Users\Archlord\Desktop\CropGuard-AI'
$workDir = 'C:\Users\Archlord\Desktop\Antigravity work'
$log = "$root\scripts\build.log"

if (-not (Test-Path $workDir)) {
  New-Item -ItemType Directory -Path $workDir -Force | Out-Null
}

Set-Location "$root\android"
"START TEST BUILD $(Get-Date)" | Out-File $log
for ($try = 1; $try -le 2; $try++) {
  .\gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon *>> $log
  if ($LASTEXITCODE -eq 0) { break }
  "RETRY $try failed with $LASTEXITCODE" | Out-File -Append $log
}

$apk = "$root\android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apk) {
  $ver = (Get-Content "$root\app.json" -Raw | ConvertFrom-Json).expo.version
  $destDesktop = "C:\Users\Archlord\Desktop\Tassel-v$ver-test.apk"
  $destWork = "$workDir\Tassel-v$ver-test.apk"
  
  Copy-Item $apk $destDesktop -Force
  Copy-Item $apk $destWork -Force
  "DONE copied to $destDesktop and $destWork $(Get-Date)" | Out-File -Append $log
  Write-Host "Build complete: $destDesktop and $destWork"
} else {
  "FAILED $(Get-Date)" | Out-File -Append $log
  Write-Error "Build failed. Check $log for details."
}
