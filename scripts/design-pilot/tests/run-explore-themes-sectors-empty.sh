#!/usr/bin/env bash
# Explore themes/sectors checks including the empty-data state (EN and NL, 1440 and 390).
# Installs the test fixture as a temporary mu-plugin of the local pilot (?fides_explore_fixture=empty empties the use case data
# on localhost only), runs the browser checks and removes the fixture again, also when the checks fail.
# Usage: CHROME_PATH=... PLAYWRIGHT_MODULE=... tests/run-explore-themes-sectors-empty.sh   (env: ONLY_REPAIR=1 for the repair checks only)
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../env.sh
. "$HERE/../env.sh"
TARGET="$PILOT_SITE/wp-content/mu-plugins/explore-empty-dataset-mu.php"
cp "$HERE/fixtures/explore-empty-dataset-mu.php" "$TARGET"
trap 'rm -f "$TARGET"' EXIT
EMPTY_FIXTURE=1 node "$HERE/explore-themes-sectors-checks.cjs"
