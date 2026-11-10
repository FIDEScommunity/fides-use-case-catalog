#!/usr/bin/env bash
# WPForms request form prototype: server checks, then browser checks with the routing switch off and on.
# Pilot database only. Mail never leaves the machine: the pilot guard blocks wp_mail, and the test-only capture
# (tests/wpforms-request-capture.php, loaded through a temporary mu-plugin loader that is removed on exit)
# writes messages to tests/output/wpforms-mail.jsonl.
#
# Needs the pilot server running and an existing Playwright install; override PLAYWRIGHT_MODULE and CHROME_PATH when needed.
# The routing option and the throttle counters are put back at the end. The existing enquiry check can be
# included with WITH_EXISTING=1 (services and sessions checks, which cover the old request pages).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILOT_ROOT="$(cd "$HERE/../../../.." && pwd)"
source "$HERE/../env.sh"

export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"
export SCREENS_DIR="${SCREENS_DIR:-$PILOT_ROOT/screens/learn}"

if [ ! -d "$PLAYWRIGHT_MODULE" ]; then
  echo "Playwright not found at $PLAYWRIGHT_MODULE (set PLAYWRIGHT_MODULE)." >&2
  exit 1
fi
if [[ "$(pilot_wp config get DB_NAME)" != "$PILOT_DB" ]]; then
  echo "Refusing: $PILOT_SITE does not use database $PILOT_DB." >&2
  exit 1
fi

mkdir -p "$HERE/output"
LOADER="$PILOT_SITE/wp-content/mu-plugins/zz-fides-request-capture.php"
cleanup() {
  rm -f "$LOADER"
  pilot_wp option delete fides_ds_request_form_route >/dev/null 2>&1 || true
  pilot_wp eval 'global $wpdb; $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE \"\\_transient\\_fides\\_req\\_%\" OR option_name LIKE \"\\_transient\\_timeout\\_fides\\_req\\_%\"");' >/dev/null 2>&1 || true
}
trap cleanup EXIT
printf '<?php require %s;\n' "'$HERE/wpforms-request-capture.php'" > "$LOADER"
: > "$HERE/output/wpforms-mail.jsonl"
echo capture > "$HERE/output/wpforms-mail-mode"
cleanup_counters() { pilot_wp eval 'global $wpdb; $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE \"\\_transient\\_fides\\_req\\_%\" OR option_name LIKE \"\\_transient\\_timeout\\_fides\\_req\\_%\"");' >/dev/null; }
cleanup_counters

status=0
echo "== Server checks"
pilot_wp eval-file "$HERE/wpforms-request-behaviour.php" || status=1

echo "== Dutch strings (TranslatePress rows exist after a first visit under /nl/)"
curl -s -o /dev/null "$PILOT_URL/nl/fides-design-pilot/learn/sessions/request-wpforms/"
pilot_wp eval-file "$HERE/../learn/nl-translations.php" apply | head -3

echo "== Browser checks, routing switch OFF (default)"
pilot_wp option delete fides_ds_request_form_route >/dev/null 2>&1 || true
PHASE=off node "$HERE/wpforms-request-checks.cjs" || status=1

echo "== Browser checks, routing switch ON"
pilot_wp option update fides_ds_request_form_route 1 >/dev/null
PHASE=on node "$HERE/wpforms-request-checks.cjs" || status=1
pilot_wp option delete fides_ds_request_form_route >/dev/null

echo "== Stored data after the checks"
pilot_wp eval-file "$HERE/wpforms-request-behaviour.php" stored-data || status=1

if [ "${WITH_EXISTING:-0}" = "1" ]; then
  echo "== Existing enquiry flow (services and sessions checks)"
  node "$HERE/services-checks.cjs" || status=1
  node "$HERE/sessions-checks.cjs" || status=1
fi
exit "$status"
