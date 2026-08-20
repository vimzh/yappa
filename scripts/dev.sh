#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

bun run db:migrate
bun run --filter '@yappa/*' dev
