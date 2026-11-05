#!/usr/bin/env bash
# Manifesto page at 1440, 1024, 768, 390 and 320 px; writes screenshots.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"
node "$HERE/manifesto-checks.cjs"
