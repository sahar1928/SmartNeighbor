#!/usr/bin/env bash
set -euo pipefail

VOLUMES=false

for arg in "$@"; do
  case "$arg" in
    --volumes|-v) VOLUMES=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "$VOLUMES" == true ]]; then
  docker compose down --volumes
else
  docker compose down
fi
