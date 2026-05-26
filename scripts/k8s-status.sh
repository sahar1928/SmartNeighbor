#!/usr/bin/env bash
set -euo pipefail

kubectl -n smartneighbor get all
kubectl -n smartneighbor get ingress
kubectl -n smartneighbor get pvc
