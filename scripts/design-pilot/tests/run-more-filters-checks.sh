#!/usr/bin/env bash
# Shared More filters pattern on every pilot overview (Paper 20.45).
# Needs the pilot server running and an existing Playwright install; override
# PLAYWRIGHT_MODULE when it lives elsewhere.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILOT_ROOT="$(cd "$HERE/../../../.." && pwd)"

export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export SCREENS_DIR="${SCREENS_DIR:-$PILOT_ROOT/screens/more-filters}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"

if [ ! -d "$PLAYWRIGHT_MODULE" ]; then
  echo "Playwright not found at $PLAYWRIGHT_MODULE (set PLAYWRIGHT_MODULE)." >&2
  exit 1
fi

node "$HERE/more-filters-checks.cjs"
