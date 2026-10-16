# Take an emulator screenshot as a small JPEG so it is quick to view: scripts\shots\<name>.jpg
param([string]$Name = "screen", [int]$Width = 300)
$adb = "C:\Users\Archlord\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$dir = Join-Path $PSScriptRoot "shots"
New-Item -ItemType Directory -Force $dir | Out-Null
& $adb -s emulator-5554 shell screencap -p /sdcard/cg_shot.png | Out-Null
& $adb -s emulator-5554 pull /sdcard/cg_shot.png "$dir\$Name-full.png" | Out-Null
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("$dir\$Name-full.png")
$h = [int]($img.Height * $Width / $img.Width)
$bmp = New-Object System.Drawing.Bitmap $Width, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $Width, $h)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 50L
$bmp.Save("$dir\$Name.jpg", $codec, $ep)
$g.Dispose(); $bmp.Dispose(); $img.Dispose()
Remove-Item "$dir\$Name-full.png"
"$dir\$Name.jpg  $((Get-Item "$dir\$Name.jpg").Length) bytes (x$([math]::Round(1080 / $Width, 2)) to device px)"
