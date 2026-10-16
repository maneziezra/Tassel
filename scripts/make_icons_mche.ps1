# Mche app icons: the seedling mark (green leaf = the crop, maize leaf = the answer) drawn from the brand SVG.
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$assets = Join-Path $root 'assets'
$chai = [System.Drawing.Color]::FromArgb(255, 0x13, 0x7A, 0x5A)
$maize = [System.Drawing.Color]::FromArgb(255, 0xF2, 0xB6, 0x30)
$white = [System.Drawing.Color]::White

function New-Canvas($size, $clear) {
  $b = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.SmoothingMode = 'AntiAlias'; $g.PixelOffsetMode = 'HighQuality'; $g.CompositingQuality = 'HighQuality'
  $g.Clear($clear)
  return @($b, $g)
}

# Draws the 64-unit mark scaled into a box of side $box with top-left ($ox,$oy)
function Draw-Mark($g, $ox, $oy, $box, $plant, $answer) {
  $k = $box / 64.0
  function P($x, $y) { New-Object System.Drawing.PointF ([float]($ox + $x * $k)), ([float]($oy + $y * $k)) }
  $pen = New-Object System.Drawing.Pen $plant, ([float](4 * $k))
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
  $g.DrawBezier($pen, (P 10 52), (P 24.67 46), (P 39.33 46), (P 54 52))
  $g.DrawLine($pen, (P 32 50), (P 32 28))
  $left = New-Object System.Drawing.Drawing2D.GraphicsPath
  $left.AddBezier((P 32 36), (P 21 36), (P 13 29), (P 12 18))
  $left.AddBezier((P 12 18), (P 23 17), (P 31 24), (P 32 36))
  $left.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush $plant), $left)
  $right = New-Object System.Drawing.Drawing2D.GraphicsPath
  $right.AddBezier((P 32 31), (P 33 18), (P 41 10), (P 53 10))
  $right.AddBezier((P 53 10), (P 53 23), (P 45 31), (P 32 31))
  $right.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush $answer), $right)
}
function Save($c, $name) { $c[1].Dispose(); $c[0].Save((Join-Path $assets $name), [System.Drawing.Imaging.ImageFormat]::Png); $c[0].Dispose() }

# 1. Legacy launcher icon: white mark on a Chai rounded square
$c = New-Canvas 1024 ([System.Drawing.Color]::Transparent)
$rr = New-Object System.Drawing.Drawing2D.GraphicsPath; $r = 224
$rr.AddArc(0, 0, $r, $r, 180, 90); $rr.AddArc(1024 - $r, 0, $r, $r, 270, 90); $rr.AddArc(1024 - $r, 1024 - $r, $r, $r, 0, 90); $rr.AddArc(0, 1024 - $r, $r, $r, 90, 90); $rr.CloseFigure()
$c[1].FillPath((New-Object System.Drawing.SolidBrush $chai), $rr)
Draw-Mark $c[1] 152 140 720 $white $maize
Save $c 'icon.png'

# 2. Adaptive icon: Chai background, mark inside the 66% safe zone
$c = New-Canvas 512 $chai; Save $c 'android-icon-background.png'
$c = New-Canvas 512 ([System.Drawing.Color]::Transparent); Draw-Mark $c[1] 96 90 320 $white $maize; Save $c 'android-icon-foreground.png'
$c = New-Canvas 512 ([System.Drawing.Color]::Transparent); Draw-Mark $c[1] 96 90 320 $white $white; Save $c 'android-icon-monochrome.png'

# 3. Splash: the mark in brand colours
$c = New-Canvas 1024 ([System.Drawing.Color]::Transparent); Draw-Mark $c[1] 212 200 600 $chai $maize; Save $c 'splash-icon.png'

# Preview strip
$names = 'icon.png', 'android-icon-foreground.png', 'android-icon-monochrome.png', 'splash-icon.png'
$strip = New-Object System.Drawing.Bitmap 384, 96; $g = [System.Drawing.Graphics]::FromImage($strip); $g.Clear([System.Drawing.Color]::FromArgb(0x5E, 0x6E, 0x68))
for ($i = 0; $i -lt 4; $i++) { $im = [System.Drawing.Image]::FromFile((Join-Path $assets $names[$i])); $g.DrawImage($im, $i * 96, 0, 96, 96); $im.Dispose() }
$g.Dispose(); $strip.Save((Join-Path $PSScriptRoot 'shots\icons_mche.png'), [System.Drawing.Imaging.ImageFormat]::Png); $strip.Dispose()
'mche icons written'
