param(
  [switch]$Volumes
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if ($Volumes) {
  docker compose down --volumes
} else {
  docker compose down
}
