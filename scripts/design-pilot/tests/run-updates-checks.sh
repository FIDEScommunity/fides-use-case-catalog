#!/usr/bin/env bash
# Updates overview and article checks. One browser per
# width: the local single-process PHP server degrades when one browser walks
# every width in a row.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"
status=0
for w in ${WIDTHS:-1440 1100 768 390 320}; do
  echo "# width $w"
  WIDTHS="$w" node "$HERE/updates-checks.cjs" || status=1
done
exit $status
