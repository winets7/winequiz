# HTTP check for vintaste.ru and NextAuth endpoints (no credentials).
$ErrorActionPreference = "Continue"
$urls = @(
    "https://vintaste.ru/",
    "https://vintaste.ru/login",
    "https://vintaste.ru/api/auth/providers",
    "https://vintaste.ru/api/auth/session"
)

foreach ($u in $urls) {
    try {
        $r = Invoke-WebRequest -Uri $u -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 25
        Write-Host ("OK {0} {1} bytes={2}" -f $r.StatusCode, $u, $r.RawContentLength)
    }
    catch {
        Write-Host ("FAIL {0}" -f $u)
        Write-Host $_.Exception.Message
    }
}

Write-Host ""
Write-Host "--- /api/auth/session Set-Cookie ---"
try {
    $s = Invoke-WebRequest -Uri "https://vintaste.ru/api/auth/session" -UseBasicParsing -TimeoutSec 25
    $ck = $s.Headers["Set-Cookie"]
    if ($ck) { Write-Host $ck } else { Write-Host "(none for empty session)" }
    $len = [Math]::Min(200, $s.Content.Length)
    Write-Host ("Body: " + $s.Content.Substring(0, $len))
}
catch {
    Write-Host $_.Exception.Message
}
