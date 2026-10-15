#!/usr/bin/env bash
# Serve the pilot site on $PILOT_URL. Requires Local's utrecht-demo to be running (MySQL).
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export PHP_CLI_SERVER_WORKERS="${PHP_CLI_SERVER_WORKERS:-6}"
# [::1] and 127.0.0.1 both resolve from "localhost"; browsers often pick IPv6 first.
"$PHP_BIN" -c "$PHP_INI" -d xdebug.mode=off -d display_errors=1 \
  -S "127.0.0.1:$PILOT_PORT" -t "$PILOT_SITE" "$HERE/router.php" &
IPV4_PID=$!
trap 'kill $IPV4_PID 2>/dev/null' EXIT
"$PHP_BIN" -c "$PHP_INI" -d xdebug.mode=off -d display_errors=1 \
  -S "[::1]:$PILOT_PORT" -t "$PILOT_SITE" "$HERE/router.php"
