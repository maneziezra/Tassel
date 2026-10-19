# Builds a standalone release APK (arm64) and copies it to the Desktop.
# Retries once if a download fails (flaky network).
$root = 'C:\Users\Archlord\Desktop\CropGuard-AI'
$log = "$root\scripts\build.log"
Set-Location "$root\android"
"START $(Get-Date)" | Out-File $log
for ($try = 1; $try -le 2; $try++) {
  .\gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon *>> $log
  if ($LASTEXITCODE -eq 0) { break }
  "RETRY $try failed with $LASTEXITCODE" | Out-File -Append $log
}
$apk = "$root\android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apk) {
  Copy-Item $apk 'C:\Users\Archlord\Desktop\CropGuard-AI-v2.3.1.apk' -Force
  "DONE copied to Desktop $(Get-Date)" | Out-File -Append $log
} else {
  "FAILED $(Get-Date)" | Out-File -Append $log
}
