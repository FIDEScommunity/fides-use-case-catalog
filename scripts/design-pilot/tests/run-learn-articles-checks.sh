#!/usr/bin/env bash
# Targeted check for the four Learn articles (EUDI, EBW, comparison, credential/attestation).
# Needs the pilot server running, an existing Playwright install and CHROME_PATH for a system Chrome.
# Also runs the PHP behaviour test for source URL round trips.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/../env.sh"

export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export CHROME_PATH="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"

if [ ! -d "$PLAYWRIGHT_MODULE" ]; then
  echo "Playwright not found at $PLAYWRIGHT_MODULE (set PLAYWRIGHT_MODULE)." >&2
  exit 1
fi

pilot_wp eval-file "$HERE/learn-source-url-behaviour.php"
node "$HERE/learn-articles-checks.cjs"
