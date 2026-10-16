# Dump the emulator's on-screen UI as text: each visible element's text / description and tap centre.
param([string]$Filter = "")
$adb = "C:\Users\Archlord\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb -s emulator-5554 shell rm -f /sdcard/ui.xml | Out-Null
$out = & $adb -s emulator-5554 shell uiautomator dump /sdcard/ui.xml 2>&1
$xmlText = & $adb -s emulator-5554 shell cat /sdcard/ui.xml 2>$null
if (-not $xmlText -or "$xmlText" -match 'No such file') { "UI dump failed: $out"; exit 1 }
[xml]$xml = ($xmlText -join "")
$xml.SelectNodes("//node") | ForEach-Object {
  $t = $_.text; $d = $_.'content-desc'
  if (($t -or $d) -and ($Filter -eq "" -or "$t $d" -match $Filter)) {
    if ($_.bounds -match '\[(\d+),(\d+)\]\[(\d+),(\d+)\]') {
      $cx = [int](([int]$matches[1] + [int]$matches[3]) / 2); $cy = [int](([int]$matches[2] + [int]$matches[4]) / 2)
      $label = "$t | $d".Trim(' |')
      "{0,-60} @ {1},{2}" -f ($label.Substring(0, [Math]::Min(60, $label.Length))), $cx, $cy
    }
  }
}
