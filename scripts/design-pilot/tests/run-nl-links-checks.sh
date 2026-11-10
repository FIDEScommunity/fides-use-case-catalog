#!/usr/bin/env bash
# Doubled-path checks for the Dutch navigation (see nl-links-behaviour.php and nl-links-checks.cjs).
#   Standalone rehearsal (default): needs the rehearsal on http://localhost:10089/design-review (staging/rehearse-staging.sh KEEP=1,
#   built with WITH_THIRD_PARTY=1 so TranslatePress is present); runs the PHP behaviour test in that site and the GET check.
#   LAYOUT=pilot: the GET check against the local pilot site (http://localhost:10088, pages below /fides-design-pilot/).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/../env.sh"
LAYOUT="${LAYOUT:-standalone}"
if [[ "$LAYOUT" == "pilot" ]]; then
  export LAYOUT SITE_URL="${SITE_URL:-http://localhost:10088}"
  node "$HERE/nl-links-checks.cjs"
else
  RE_SITE="$PILOT_ROOT/rehearsal/docroot/design-review"
  "$PHP_BIN" -c "$PHP_INI" -d xdebug.mode=off -d memory_limit=1024M "$WP_CLI_PHAR" --path="$RE_SITE" eval-file "$HERE/nl-links-behaviour.php"
  export LAYOUT SITE_URL="${SITE_URL:-http://localhost:10089/design-review}" RESOLVE_IP="${RESOLVE_IP:-127.0.0.1}"
  node "$HERE/nl-links-checks.cjs"
fi
