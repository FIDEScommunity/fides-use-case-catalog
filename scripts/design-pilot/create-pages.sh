#!/usr/bin/env bash
# Create (or refresh) the design pilot test pages in the pilot database only.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$(pilot_wp config get DB_NAME)" != "$PILOT_DB" ]]; then
  echo "Refusing: $PILOT_SITE does not use database $PILOT_DB." >&2
  exit 1
fi
pilot_wp eval-file "$HERE/create-pages.php"
