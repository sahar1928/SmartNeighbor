param(
  [switch]$Build,
  [switch]$Detached
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (!(Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example"
}

$args = @("--env-file", ".env", "up")
if ($Build) { $args += "--build" }
if ($Detached) { $args += "-d" }

docker compose @args
