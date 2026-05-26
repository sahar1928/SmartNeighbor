#!/usr/bin/env bash
set -euo pipefail

IMAGE="smartneighbor:latest"
BUILD_IMAGE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image|-i)
      IMAGE="$2"
      shift 2
      ;;
    --build-image|-b)
      BUILD_IMAGE=true
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "$BUILD_IMAGE" == true ]]; then
  docker build -t "$IMAGE" .
fi

kubectl apply -k k8s
kubectl -n smartneighbor set image deployment/smartneighbor smartneighbor="$IMAGE"
kubectl -n smartneighbor rollout status deployment/smartneighbor

echo "Run this for local access:"
echo "kubectl -n smartneighbor port-forward svc/smartneighbor 3000:80"
