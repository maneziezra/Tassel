# End-to-end test of the AI photo check, exactly as the app calls it:
# anonymous Supabase sign-in -> photo-check Edge Function -> Claude vision.
param([string]$Photo = "$PSScriptRoot\samples\Tomato___Late_blight__1.jpg", [string]$Crop = "", [string]$Lang = "en")
$url = "https://dfobapaknivhgzwffmyc.supabase.co"
$key = "sb_publishable_kh0ajUYc3Ap10sFqCD7WnQ_h5GhrQlu"   # public publishable key (same as the app)

$session = Invoke-RestMethod -Method Post -Uri "$url/auth/v1/signup" -Headers @{ apikey = $key } -ContentType "application/json" -Body '{}'
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($Photo))
$body = @{ image = $b64; crop = $Crop; lang = $Lang } | ConvertTo-Json -Depth 4 -Compress
$sw = [Diagnostics.Stopwatch]::StartNew()
try {
  $res = Invoke-RestMethod -Method Post -Uri "$url/functions/v1/photo-check" `
    -Headers @{ apikey = $key; Authorization = "Bearer $($session.access_token)" } `
    -ContentType "application/json" -Body $body -TimeoutSec 90
  "OK in $([math]::Round($sw.Elapsed.TotalSeconds,1)) s  ($((Get-Item $Photo).Name), $([math]::Round($b64.Length/1KB)) KB base64)"
  $res.result | ConvertTo-Json -Depth 4
} catch {
  "FAILED after $([math]::Round($sw.Elapsed.TotalSeconds,1)) s: $($_.ErrorDetails.Message)"
}
