#!/usr/bin/env bash
# Replace the two Learn files only after the hash preflight and a backup.
# Does not seed pages. Does not set LEARN_FORCE.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG="${LEARN_PACKAGE_ROOT:-$(cd "$HERE/../.." && pwd)}"
if [[ -z "${BACKUP_DIR:-}" || ! -f "$BACKUP_DIR/tiles/assets/learn.js" || ! -f "$BACKUP_DIR/tiles/includes/class-fides-ds-learn.php" ]]; then
  echo "Refusing: BACKUP_DIR must already contain the two backed-up Learn files." >&2
  exit 1
fi
export LEARN_PACKAGE_ROOT="$PKG"
bash "$HERE/preflight-installed-files.sh"

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
cp -p "$PKG/tiles-delta/assets/learn.js" "$plugin/assets/learn.js"
cp -p "$PKG/tiles-delta/includes/class-fides-ds-learn.php" "$plugin/includes/class-fides-ds-learn.php"
echo "copied learn.js and class-fides-ds-learn.php into $plugin"
echo "previous files remain in $BACKUP_DIR/tiles"
