#!/usr/bin/env bash
set -euo pipefail

BUILD=false
DETACHED=false

for arg in "$@"; do
  case "$arg" in
    --build|-b) BUILD=true ;;
    --detached|-d) DETACHED=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

args=(--env-file .env up)
if [[ "$BUILD" == true ]]; then args+=(--build); fi
if [[ "$DETACHED" == true ]]; then args+=(-d); fi

docker compose "${args[@]}"
