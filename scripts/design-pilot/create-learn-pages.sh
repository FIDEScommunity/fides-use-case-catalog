#!/usr/bin/env bash
# Seed (or re-seed) the FIDES Learn pilot pages from learn/manifest.json.
# Pilot database only. See learn/README.md for the overwrite rules.
#
#   create-learn-pages.sh                       seed; edited and unmarked pages are skipped and reported
#   LEARN_DRY_RUN=1 create-learn-pages.sh       report only
#   LEARN_FORCE="topics,topics/for-businesses" create-learn-pages.sh   replace those pages explicitly
#   LEARN_BASE=fides-design-pilot/learn         route base (adjustable for another environment)
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$(pilot_wp config get DB_NAME)" != "$PILOT_DB" ]]; then
  echo "Refusing: $PILOT_SITE does not use database $PILOT_DB." >&2
  exit 1
fi
export LEARN_BACKUP_DIR="${LEARN_BACKUP_DIR:-$PILOT_ROOT/pilot-backup/learn-replaced}"
pilot_wp eval-file "$HERE/create-learn-pages.php"
