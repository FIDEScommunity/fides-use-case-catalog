#!/usr/bin/env bash
# Density measurements and screenshots; argument is a label (e.g. before, after).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILOT_ROOT="$(cd "$HERE/../../../.." && pwd)"
LABEL="${1:-current}"

export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export SCREENS_DIR="${SCREENS_DIR:-$PILOT_ROOT/screens/density-$LABEL}"
export PILOT_URL="${PILOT_URL:-http://localhost:10088}"

node "$HERE/measure-density.cjs"
