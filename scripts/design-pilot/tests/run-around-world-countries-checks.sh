#!/usr/bin/env bash
# Targeted checks for the five country pages under Around the world (1440 and 390) plus the seed behaviour test.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export CHROME_PATH="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"
bash "$HERE/around-world-countries-seed.sh"
node "$HERE/around-world-countries-checks.cjs"
