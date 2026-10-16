# Drive the emulator: optional tap / swipe / text / key, wait, then print the UI (filtered).
# e.g.  act.ps1 -Tap 540,1200 -Wait 2 -Filter 'Save|Cancel'
param([string]$Tap = "", [string]$Swipe = "", [string]$Text = "", [string]$Key = "", [double]$Wait = 1.5, [string]$Filter = "", [switch]$NoDump)
$adb = "C:\Users\Archlord\AppData\Local\Android\Sdk\platform-tools\adb.exe"
if ($Tap)   { $p = $Tap.Split(','); & $adb -s emulator-5554 shell input tap $p[0] $p[1] }
if ($Swipe) { $p = $Swipe.Split(','); & $adb -s emulator-5554 shell input swipe $p[0] $p[1] $p[2] $p[3] 400 }
if ($Text)  { & $adb -s emulator-5554 shell input text ($Text -replace ' ', '%s') }
if ($Key)   { & $adb -s emulator-5554 shell input keyevent $Key }
Start-Sleep -Milliseconds ([int]($Wait * 1000))
if (-not $NoDump) { & (Join-Path $PSScriptRoot "ui.ps1") -Filter $Filter }
