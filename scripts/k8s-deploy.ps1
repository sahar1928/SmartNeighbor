param(
  [string]$Image = "smartneighbor:latest",
  [switch]$BuildImage
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if ($BuildImage) {
  docker build -t $Image .
}

kubectl apply -k k8s
kubectl -n smartneighbor set image deployment/smartneighbor smartneighbor=$Image
kubectl -n smartneighbor rollout status deployment/smartneighbor

Write-Host "Run this for local access:"
Write-Host "kubectl -n smartneighbor port-forward svc/smartneighbor 3000:80"
