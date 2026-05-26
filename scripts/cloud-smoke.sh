#!/usr/bin/env sh
set -eu

if [ "${1:-}" = "" ]; then
  echo "Usage: ./scripts/cloud-smoke.sh https://your-domain"
  exit 1
fi

BASE_URL="${1%/}"

echo "Checking $BASE_URL/api/health"
curl -fsS "$BASE_URL/api/health"
echo

echo "Checking $BASE_URL/api/ready"
curl -fsS "$BASE_URL/api/ready"
echo

echo "Checking resident magic link API"
curl -fsS "$BASE_URL/api/me?token=demo-danny-4b"
echo
