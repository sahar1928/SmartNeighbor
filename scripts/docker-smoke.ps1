$ErrorActionPreference = "Stop"

$health = Invoke-RestMethod "http://127.0.0.1:3000/api/health"
$ready = Invoke-RestMethod "http://127.0.0.1:3000/api/ready"

Write-Host "Health:"
$health | Format-List

Write-Host "Readiness:"
$ready | Format-List

Write-Host "Dashboard: http://127.0.0.1:3000"
Write-Host "Adminer:   http://127.0.0.1:8080"
