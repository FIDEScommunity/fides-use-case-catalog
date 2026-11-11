#!/usr/bin/env bash
# Route check for Learn Training & workshops and the enquiry preview (desktop, tablet, mobile).
# Needs the pilot server running and an existing Playwright install; override
# PLAYWRIGHT_MODULE when it lives elsewhere.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILOT_ROOT="$(cd "$HERE/../../../.." && pwd)"

export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export SCREENS_DIR="${SCREENS_DIR:-$PILOT_ROOT/screens/learn}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"

if [ ! -d "$PLAYWRIGHT_MODULE" ]; then
  echo "Playwright not found at $PLAYWRIGHT_MODULE (set PLAYWRIGHT_MODULE)." >&2
  exit 1
fi

# Default: the pilot standard (WPForms route ON). LEGACY=1 checks the fallback form: the routing option is set to 0 for the run and removed again.
if [ "${LEGACY:-0}" = "1" ]; then
  source "$HERE/../env.sh"
  trap 'pilot_wp option delete fides_ds_request_form_route >/dev/null 2>&1 || true' EXIT
  pilot_wp option update fides_ds_request_form_route 0 >/dev/null
  ROUTE=legacy node "$HERE/sessions-checks.cjs"
else
  ROUTE=wpforms node "$HERE/sessions-checks.cjs"
fi
