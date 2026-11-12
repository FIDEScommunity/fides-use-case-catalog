#!/usr/bin/env bash
# Updates overview and article checks. One browser per
# width: the local single-process PHP server degrades when one browser walks
# every width in a row.
# The fixed test message (tests/updates-fixture.php) is put in the local feed cache first and removed afterwards.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/env.sh"
export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"
pilot_wp eval-file "$HERE/tests/updates-fixture.php" set
trap 'pilot_wp eval-file "$HERE/tests/updates-fixture.php" clear' EXIT
status=0
for w in ${WIDTHS:-1440 1100 768 390 320}; do
  echo "# width $w"
  WIDTHS="$w" node "$HERE/tests/updates-checks.cjs" || status=1
done
exit $status
