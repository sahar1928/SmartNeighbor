param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl
)

$base = $BaseUrl.TrimEnd("/")

Write-Host "Checking $base/api/health"
Invoke-RestMethod "$base/api/health" | ConvertTo-Json

Write-Host "Checking $base/api/ready"
Invoke-RestMethod "$base/api/ready" | ConvertTo-Json

Write-Host "Checking resident magic link API"
Invoke-RestMethod "$base/api/me?token=demo-danny-4b" | Select-Object resident,balance | ConvertTo-Json -Depth 4
