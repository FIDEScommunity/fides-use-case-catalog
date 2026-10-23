#!/usr/bin/env bash
# Read-only checks of the real fides.community destinations behind credential catalog links.
# Needs network access, the pilot server and an existing Playwright install. Not part of the
# offline suites: run it on purpose, never from a page view.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILOT_ROOT="$(cd "$HERE/../../../.." && pwd)"

export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export SCREENS_DIR="${SCREENS_DIR:-$PILOT_ROOT/screens/credentials/public-links}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"
mkdir -p "$SCREENS_DIR"

if [ ! -d "$PLAYWRIGHT_MODULE" ]; then
  echo "Playwright not found at $PLAYWRIGHT_MODULE (set PLAYWRIGHT_MODULE)." >&2
  exit 1
fi

# shellcheck source=/dev/null
source "$HERE/../env.sh"
PUBLIC_LINKS="$(pilot_wp eval-file "$HERE/public-link-urls.php")"
export PUBLIC_LINKS

node "$HERE/public-link-checks.cjs"
