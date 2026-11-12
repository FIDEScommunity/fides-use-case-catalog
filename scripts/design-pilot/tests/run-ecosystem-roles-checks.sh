#!/usr/bin/env bash
# Targeted checks for the Ecosystem roles overview and its five articles (1440 and 390) plus the seed behaviour tests.
# Needs the pilot server running, a Playwright install and CHROME_PATH for a system Chrome.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export CHROME_PATH="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"

bash "$HERE/ecosystem-roles-seed.sh"
bash "$HERE/ecosystem-roles-articles-seed.sh"
node "$HERE/ecosystem-roles-checks.cjs"
node "$HERE/ecosystem-roles-articles-checks.cjs"
