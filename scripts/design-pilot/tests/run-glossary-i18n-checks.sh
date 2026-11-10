#!/usr/bin/env bash
# Dutch (TranslatePress) check for the glossary interface strings.
# Registers the strings by visiting /nl/glossary/, stores a temporary nl_NL test translation in the local pilot
# database, runs the browser checks and always restores the previous translations (also on failure).
# Needs the pilot server and WP-CLI (env.sh) plus an existing Playwright install.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/.."
# shellcheck disable=SC1091
source ./env.sh

export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"

if [ ! -d "$PLAYWRIGHT_MODULE" ]; then
  echo "Playwright not found at $PLAYWRIGHT_MODULE (set PLAYWRIGHT_MODULE)." >&2
  exit 1
fi

restore() { pilot_wp eval-file "$HERE/glossary-i18n-data.php" restore; }
trap restore EXIT

curl -s -o /dev/null "$PILOT_URL/nl/glossary/"   # TranslatePress registers the strings of the page
pilot_wp eval-file "$HERE/glossary-i18n-data.php" apply
node "$HERE/glossary-i18n-checks.cjs"
