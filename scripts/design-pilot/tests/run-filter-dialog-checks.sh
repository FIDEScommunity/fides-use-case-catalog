#!/usr/bin/env bash
# Filters dialog across resizes, focus after closing, pill targets and wheel chaining on every pilot overview.
# Needs the pilot server running and an existing Playwright install; override
# PLAYWRIGHT_MODULE when it lives elsewhere.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILOT_ROOT="$(cd "$HERE/../../../.." && pwd)"

export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export SCREENS_DIR="${SCREENS_DIR:-$PILOT_ROOT/screens/filter-dialog}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"

if [ ! -d "$PLAYWRIGHT_MODULE" ]; then
  echo "Playwright not found at $PLAYWRIGHT_MODULE (set PLAYWRIGHT_MODULE)." >&2
  exit 1
fi

node "$HERE/filter-dialog-checks.cjs"
