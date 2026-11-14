#!/usr/bin/env bash
# Seed (or re-seed) the editorial pages behind Explore by theme / sector from explore/choices.json.
# Pilot database only. Edited and unmarked pages are skipped and reported; there is no force option.
#
#   create-explore-pages.sh                    seed
#   EXPLORE_DRY_RUN=1 create-explore-pages.sh  report only
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$(pilot_wp config get DB_NAME)" != "$PILOT_DB" ]]; then
  echo "Refusing: $PILOT_SITE does not use database $PILOT_DB." >&2
  exit 1
fi
pilot_wp eval-file "$HERE/create-explore-pages.php"
