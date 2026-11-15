#!/usr/bin/env bash
# Issuer and relying party pilot checks (overview, record, limited record, filters, relations, back route,
# deeplinks, add route) at 1440 and 390 px in EN and NL.
# Needs the pilot server running and an existing Playwright install; override PLAYWRIGHT_MODULE and
# CHROME_PATH when they live elsewhere. KINDS=issuers or KINDS=relying-parties limits the run.
# CHECKS=main runs only the overview/record checks, CHECKS=env only the environment and dynamic Dutch checks (default: both).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export CHROME_PATH="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"

if [ ! -d "$PLAYWRIGHT_MODULE" ]; then
  echo "Playwright not found at $PLAYWRIGHT_MODULE (set PLAYWRIGHT_MODULE)." >&2
  exit 1
fi

CHECKS="${CHECKS:-all}"
if [ "$CHECKS" = "main" ] || [ "$CHECKS" = "all" ]; then
  node "$HERE/issuer-rp-checks.cjs"
fi
if [ "$CHECKS" = "env" ] || [ "$CHECKS" = "all" ]; then
  node "$HERE/issuer-rp-env-nl-checks.cjs"
fi
