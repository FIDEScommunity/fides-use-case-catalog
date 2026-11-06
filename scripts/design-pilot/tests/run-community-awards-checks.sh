#!/usr/bin/env bash
# FIDES Community Awards page at 1440, 1024, 768, 390 and 320 px.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"
node "$HERE/community-awards-checks.cjs"
