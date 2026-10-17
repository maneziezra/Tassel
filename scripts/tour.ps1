# Opens CropGuard screens on the phone by deep link and screenshots each one.
#   tour.ps1 -steps "home|cropguard-ai://,scroll" "cal|cropguard-ai://calendar"
param([string[]]$steps, [int]$wait = 4)
$adb = "C:\Users\Archlord\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$s = '050162503I019840'
$dir = 'C:\Users\Archlord\Desktop\CropGuard-AI\scripts\shots'
New-Item -ItemType Directory -Force $dir | Out-Null
& $adb -s $s reverse tcp:8081 tcp:8081 | Out-Null
& $adb -s $s shell input keyevent KEYCODE_WAKEUP
function shot($n) { & $adb -s $s shell screenrecord --time-limit 1 /sdcard/r.mp4; cmd /c "`"$adb`" -s $s pull /sdcard/r.mp4 `"$dir\$n.mp4`" >nul 2>&1"; "shot $n" }
foreach ($step in $steps) {
  $parts = $step.Split('|')
  $name = $parts[0]; $act = $parts[1]
  foreach ($a in $act.Split(',')) {
    if ($a -like 'cropguard-ai://*') { & $adb -s $s shell am start -a android.intent.action.VIEW -d "'$a'" com.anonymous.CropGuardAI | Out-Null; Start-Sleep $wait }
    elseif ($a -eq 'scroll') { & $adb -s $s shell input swipe 360 1250 360 450 350; Start-Sleep 1 }
    elseif ($a -eq 'up') { & $adb -s $s shell input swipe 360 450 360 1350 250; & $adb -s $s shell input swipe 360 450 360 1350 250; Start-Sleep 1 }
    elseif ($a -eq 'back') { & $adb -s $s shell input keyevent KEYCODE_BACK; Start-Sleep 2 }
    elseif ($a -like 'tap:*') { $xy = $a.Substring(4).Split(':'); & $adb -s $s shell input tap $xy[0] $xy[1]; Start-Sleep 2 }
    elseif ($a -like 'shot:*') { shot $a.Substring(5) }
    elseif ($a -like 'text:*') {
      $want = $a.Substring(5)
      & $adb -s $s shell uiautomator dump /sdcard/ui.xml | Out-Null
      $x = (& $adb -s $s shell cat /sdcard/ui.xml) -join ''
      $m = [regex]::Matches($x, '(?:text|content-desc)="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"') | Where-Object { $_.Groups[1].Value -like "*$want*" } | Select-Object -First 1
      if ($m) { $cx = ([int]$m.Groups[2].Value + [int]$m.Groups[4].Value) / 2; $cy = ([int]$m.Groups[3].Value + [int]$m.Groups[5].Value) / 2; & $adb -s $s shell input tap $cx $cy; "tapped $want at $cx,$cy"; Start-Sleep 3 } else { "NOT FOUND: $want" }
    }
    elseif ($a -like 'sleep:*') { Start-Sleep ([int]$a.Substring(6)) }
  }
  shot $name
}
