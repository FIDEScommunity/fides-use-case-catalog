#!/usr/bin/env bash
# Back up the two installed Learn files and the pages in routes-update.txt
# before any copy or seed. Creates a new directory and prints its path.
# Does not modify the plugin or the pages. Does not set LEARN_FORCE.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG="${LEARN_PACKAGE_ROOT:-$(cd "$HERE/../.." && pwd)}"
# shellcheck disable=SC1091
source "$HERE/wp.sh"
learn_trial_maybe_local_env "$(cd "$HERE/.." && pwd)"
learn_trial_require_wp_path

export LEARN_PACKAGE_ROOT="$PKG"
bash "$HERE/preflight-installed-files.sh"

stamp="$(date -u +%Y%m%d-%H%M%S)"
parent="$(cd "$PKG/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$parent/learn-routes-backup-$stamp}"
if [[ -e "$BACKUP_DIR" ]]; then
  echo "Refusing: backup directory already exists: $BACKUP_DIR" >&2
  exit 1
fi
mkdir -p "$BACKUP_DIR/tiles/assets" "$BACKUP_DIR/tiles/includes"

plugin=""
if [[ -n "${TILES_PLUGIN_DIR:-}" ]]; then
  plugin="$TILES_PLUGIN_DIR"
else
  for candidate in \
    "$WP_PATH/wp-content/plugins/fides-community-tools-tiles" \
    "$WP_PATH/../app/plugins/fides-community-tools-tiles" \
    "$WP_PATH/app/plugins/fides-community-tools-tiles"
  do
    if [[ -f "$candidate/assets/learn.js" && -f "$candidate/includes/class-fides-ds-learn.php" ]]; then
      plugin="$(cd "$candidate" && pwd)"
      break
    fi
  done
fi
if [[ -z "$plugin" ]]; then
  echo "Refusing: Tiles plugin directory was not found." >&2
  exit 1
fi
cp -p "$plugin/assets/learn.js" "$BACKUP_DIR/tiles/assets/learn.js"
cp -p "$plugin/includes/class-fides-ds-learn.php" "$BACKUP_DIR/tiles/includes/class-fides-ds-learn.php"
printf '%s\n' "$plugin" > "$BACKUP_DIR/plugin-dir.txt"

export LEARN_ROUTES_FILE="$HERE/routes-update.txt"
export LEARN_BACKUP_FILE="$BACKUP_DIR/pages.json"
learn_trial_wp eval-file "$HERE/backup-pages.php"
printf '%s\n' "$BACKUP_DIR"
echo "backup directory: $BACKUP_DIR"
