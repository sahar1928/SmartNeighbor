#!/usr/bin/env bash
set -euo pipefail

kubectl -n smartneighbor port-forward svc/smartneighbor 3000:80
