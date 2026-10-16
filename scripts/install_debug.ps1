# Install the debug APK on the emulator, push sample leaf photos, start Metro and launch the app.
$adb = "C:\Users\Archlord\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$root = Split-Path $PSScriptRoot -Parent
$apk = Join-Path $root "android\app\build\outputs\apk\debug\app-debug.apk"

& $adb -s emulator-5554 install -r $apk
Get-ChildItem (Join-Path $PSScriptRoot "samples") -Filter *.jpg | ForEach-Object {
  & $adb -s emulator-5554 push $_.FullName "/sdcard/Pictures/$($_.Name)" | Out-Null
  & $adb -s emulator-5554 shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file:///sdcard/Pictures/$($_.Name)" | Out-Null
}
"samples pushed"

# Free port 8081 (old Metro), then start Metro in the background
Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$root`" && npx expo start --dev-client --port 8081 --clear > scripts\metro_v2.log 2>&1" -WindowStyle Hidden
"metro starting"
& $adb -s emulator-5554 reverse tcp:8081 tcp:8081
& $adb -s emulator-5554 shell input keyevent KEYCODE_WAKEUP
