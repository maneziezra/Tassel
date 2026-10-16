# End-to-end test of the AI advisor, exactly as the app calls it:
# anonymous Supabase sign-in -> advisor-chat Edge Function -> Claude.
$url = "https://dfobapaknivhgzwffmyc.supabase.co"
$key = "sb_publishable_kh0ajUYc3Ap10sFqCD7WnQ_h5GhrQlu"   # public publishable key (same as the app)

try {
  $session = Invoke-RestMethod -Method Post -Uri "$url/auth/v1/signup" `
    -Headers @{ apikey = $key } -ContentType "application/json" -Body '{}'
  "1. Anonymous sign-in: OK"
} catch {
  "1. Anonymous sign-in FAILED: $($_.ErrorDetails.Message)"; exit 1
}

$body = @{
  messages = @(@{ role = "user"; content = "My tomato leaves have dark spreading patches. How do I treat it?" })
  context  = @{ crop = "Tomato"; disease = "Late blight"; confidence = 91 }
} | ConvertTo-Json -Depth 5

try {
  $res = Invoke-RestMethod -Method Post -Uri "$url/functions/v1/advisor-chat" `
    -Headers @{ apikey = $key; Authorization = "Bearer $($session.access_token)" } `
    -ContentType "application/json" -Body $body -TimeoutSec 60
  "2. Advisor reply: OK"
  "----"
  $res.reply
} catch {
  "2. Advisor FAILED: $($_.ErrorDetails.Message)"; exit 1
}
