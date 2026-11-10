#!/usr/bin/env bash
# Seed (or update) the WPForms request form prototype and its request page. Pilot database only.
#   seed-request-form.sh                       create or update; a form edited in the builder is skipped and reported
#   REQUEST_FORM_DRY_RUN=1 seed-request-form.sh   report only
#   REQUEST_FORM_FORCE=1 seed-request-form.sh     replace a form that was edited in the builder
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$(pilot_wp config get DB_NAME)" != "$PILOT_DB" ]]; then
  echo "Refusing: $PILOT_SITE does not use database $PILOT_DB." >&2
  exit 1
fi
pilot_wp eval-file "$HERE/seed-request-form.php"
