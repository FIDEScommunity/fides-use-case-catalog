#!/usr/bin/env bash
# Awards images on the standalone rehearsal (http://localhost:10089/design-review, seeded with bundled images):
# PHP behaviour (attachments, files, no foreign image src, outgoing guard unchanged) + browser check at 1440 and 390 px (EN and NL).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/../env.sh"
RE_SITE="$PILOT_ROOT/rehearsal/docroot/design-review"
"$PHP_BIN" -c "$PHP_INI" -d xdebug.mode=off -d memory_limit=1024M "$WP_CLI_PHAR" --path="$RE_SITE" eval-file "$HERE/awards-images-behaviour.php"
export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export CHROME_PATH="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
export SITE_URL="${SITE_URL:-http://localhost:10089/design-review}"
node "$HERE/awards-images-checks.cjs"
