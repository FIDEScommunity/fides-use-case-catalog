#!/usr/bin/env bash
# Seed only the routes named in routes-update.txt.
# Dry-run unless LEARN_APPLY=1. LEARN_FORCE is refused. Production is refused
# by seed-trial.sh when this directory is a content-update package.
# Install commands and expected outcomes live in the package UPDATING.md.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -n "${LEARN_FORCE:-}" ]]; then
  echo "Refusing: LEARN_FORCE is set. Edited pages are skipped, never replaced." >&2
  exit 1
fi
if [[ ! -f "$HERE/routes-update.txt" ]]; then
  echo "Refusing: routes-update.txt is missing." >&2
  exit 1
fi
MANIFEST="$HERE/../learn/manifest.json"
if [[ ! -f "$MANIFEST" ]]; then
  echo "Refusing: $MANIFEST is missing." >&2
  exit 1
fi
ids="$(python3 "$HERE/validate-routes-update.py" "$HERE/routes-update.txt" "$MANIFEST")"
if [[ -n "${LEARN_IDS:-}" && "$LEARN_IDS" != "$ids" ]]; then
  echo "Refusing: LEARN_IDS is not the route list in routes-update.txt." >&2
  exit 1
fi
export LEARN_IDS="$ids"
unset LEARN_FORCE
exec bash "$HERE/seed-trial.sh"
