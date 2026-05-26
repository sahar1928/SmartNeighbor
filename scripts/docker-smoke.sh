#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Health:"
curl -fsS http://127.0.0.1:3000/api/health
echo
echo

echo "Readiness:"
curl -fsS http://127.0.0.1:3000/api/ready
echo
echo

echo "Compose services:"
docker compose ps
echo

echo "Dashboard: http://127.0.0.1:3000"
echo "Adminer:   http://127.0.0.1:8080"
