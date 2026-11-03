#!/usr/bin/env bash
# Remove the local design pilot site: stop the server, drop the pilot database,
# delete the copied WordPress files. utrecht-demo and the worktrees are untouched.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env.sh"

if [[ "$PILOT_DB" == "$SOURCE_DB" ]]; then
  echo "Refusing to drop the utrecht-demo database." >&2
  exit 1
fi

# Destructive: require a verified snapshot first (backup-pilot.sh + restore-check.sh).
SNAPSHOT="${PILOT_SNAPSHOT:-}"
if [[ -z "$SNAPSHOT" || ! -f "$SNAPSHOT/RESTORE_CHECK_OK" ]]; then
  echo "Refusing: set PILOT_SNAPSHOT to a snapshot directory that passed restore-check.sh" >&2
  echo "(see pilot-backup/snapshots/ and README: backup, restore check, rebuild)." >&2
  exit 1
fi

pkill -f -- "-S 127.0.0.1:$PILOT_PORT" 2>/dev/null || true
pkill -f -- "-S \[::1\]:$PILOT_PORT" 2>/dev/null || true
pilot_mysql -e "DROP DATABASE IF EXISTS \`$PILOT_DB\`"
if [[ -d "$PILOT_SITE" && "$PILOT_SITE" == "$PILOT_ROOT/wordpress" ]]; then
  rm -rf "$PILOT_SITE"
fi
echo "Pilot site removed."
