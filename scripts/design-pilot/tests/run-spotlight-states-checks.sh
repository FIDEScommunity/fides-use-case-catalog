#!/usr/bin/env bash
# Spotlight link states (default, hover, focus) at desktop and mobile; writes screenshots.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"
node "$HERE/spotlight-states.cjs"
