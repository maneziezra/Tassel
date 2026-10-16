# Restores the CropGuard brand icon (from the v1.0 release) in place of the Expo default icons.
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$assets = Join-Path $root 'assets'
$src = 'C:\Users\Archlord\Desktop\agrinova\KSEF 2027\CropGuardApp\android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png'
$backup = Join-Path $PSScriptRoot 'expo-default-icons'
New-Item -ItemType Directory -Force $backup | Out-Null
foreach ($n in 'icon.png','android-icon-foreground.png','android-icon-background.png','android-icon-monochrome.png','splash-icon.png') {
  $p = Join-Path $assets $n
  if ((Test-Path $p) -and -not (Test-Path (Join-Path $backup $n))) { Copy-Item $p (Join-Path $backup $n) }
}
$logo = [System.Drawing.Bitmap]::FromFile($src)

function New-Canvas($size, $clear) {
  $b = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'AntiAlias'; $g.PixelOffsetMode = 'HighQuality'
  $g.Clear($clear)
  return @($b, $g)
}
function Save($b, $g, $name) { $g.Dispose(); $b.Save((Join-Path $assets $name), [System.Drawing.Imaging.ImageFormat]::Png); $b.Dispose() }

# 1. Launcher icon (legacy) and splash: the v1.0 logo as it is
$c = New-Canvas 1024 ([System.Drawing.Color]::White); $c[1].DrawImage($logo, 0, 0, 1024, 1024); Save $c[0] $c[1] 'icon.png'
$c = New-Canvas 1024 ([System.Drawing.Color]::Transparent); $c[1].DrawImage($logo, 112, 112, 800, 800); Save $c[0] $c[1] 'splash-icon.png'

# 2. Adaptive icon: logo inside the 66% safe zone on a white background
$c = New-Canvas 512 ([System.Drawing.Color]::White); Save $c[0] $c[1] 'android-icon-background.png'
$c = New-Canvas 512 ([System.Drawing.Color]::Transparent); $c[1].DrawImage($logo, 86, 86, 340, 340); $fg = $c[0]; $c[1].Dispose()
$fg.Save((Join-Path $assets 'android-icon-foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)

# 3. Monochrome (themed icons): white silhouette, alpha = how dark the logo pixel is
$mono = New-Object System.Drawing.Bitmap 512, 512, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for ($y = 0; $y -lt 512; $y++) { for ($x = 0; $x -lt 512; $x++) {
  $p = $fg.GetPixel($x, $y)
  if ($p.A -gt 0) { $lum = (0.299 * $p.R + 0.587 * $p.G + 0.114 * $p.B); $a = [int]([Math]::Max(0, [Math]::Min(255, (255 - $lum) * 1.6)) * $p.A / 255)
    if ($a -gt 20) { $mono.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($a, 255, 255, 255)) } }
} }
$mono.Save((Join-Path $assets 'android-icon-monochrome.png'), [System.Drawing.Imaging.ImageFormat]::Png); $mono.Dispose(); $fg.Dispose(); $logo.Dispose()

# Preview strip for review
$names = 'icon.png','android-icon-foreground.png','android-icon-monochrome.png','splash-icon.png'
$c = New-Canvas 384 ([System.Drawing.Color]::FromArgb(60, 60, 60)); $strip = New-Object System.Drawing.Bitmap 384, 96; $g = [System.Drawing.Graphics]::FromImage($strip); $g.Clear([System.Drawing.Color]::FromArgb(70, 90, 75))
for ($i = 0; $i -lt 4; $i++) { $im = [System.Drawing.Image]::FromFile((Join-Path $assets $names[$i])); $g.DrawImage($im, $i * 96, 0, 96, 96); $im.Dispose() }
$g.Dispose(); $strip.Save((Join-Path $PSScriptRoot 'shots\icons_new.png'), [System.Drawing.Imaging.ImageFormat]::Png); $strip.Dispose(); $c[1].Dispose(); $c[0].Dispose()
'icons written'
