#!/usr/bin/env bash
# Restore the two Learn files and the pre-apply page snapshot.
# Page writes wait for LEARN_RESTORE=1. A page edited after the apply is skipped.
# The new route is unpublished, not any other page. Does not set LEARN_FORCE.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/wp.sh"
learn_trial_maybe_local_env "$(cd "$HERE/.." && pwd)"
learn_trial_require_wp_path
if [[ -z "${BACKUP_DIR:-}" || ! -f "$BACKUP_DIR/pages.json" || ! -f "$BACKUP_DIR/after-apply.json" ]]; then
  echo "Refusing: BACKUP_DIR must contain pages.json and after-apply.json." >&2
  exit 1
fi
if [[ ! -f "$BACKUP_DIR/tiles/assets/learn.js" || ! -f "$BACKUP_DIR/tiles/includes/class-fides-ds-learn.php" ]]; then
  echo "Refusing: BACKUP_DIR is missing the two Learn files." >&2
  exit 1
fi

plugin=""
if [[ -f "$BACKUP_DIR/plugin-dir.txt" ]]; then
  plugin="$(cat "$BACKUP_DIR/plugin-dir.txt")"
fi
if [[ -z "$plugin" || ! -d "$plugin" ]]; then
  echo "Refusing: plugin directory recorded in the backup is not a directory." >&2
  exit 1
fi

host=""
if [[ -n "${WP_PHP:-}" && -n "${WP_CLI:-}" ]]; then
  host="$("$WP_PHP" ${WP_PHP_INI:+-c "$WP_PHP_INI"} -d xdebug.mode=off "$WP_CLI" --path="$WP_PATH" option get home)"
elif command -v wp >/dev/null 2>&1; then
  host="$(wp --path="$WP_PATH" option get home)"
fi
case "$host" in
  *://fides.community|*://www.fides.community|*://fides.community/*|*://www.fides.community/*)
    echo "Refusing: home is ${host}. This package does not install on production." >&2
    exit 1
    ;;
esac

if [[ "${LEARN_RESTORE:-}" == "1" ]]; then
  cp -p "$BACKUP_DIR/tiles/assets/learn.js" "$plugin/assets/learn.js"
  cp -p "$BACKUP_DIR/tiles/includes/class-fides-ds-learn.php" "$plugin/includes/class-fides-ds-learn.php"
  echo "restored the two Learn files into $plugin"
else
  echo "dry-run: would restore the two Learn files into $plugin"
fi

export LEARN_BACKUP_FILE="$BACKUP_DIR/pages.json"
export LEARN_AFTER_FILE="$BACKUP_DIR/after-apply.json"
export LEARN_NEW_ROUTE="${LEARN_NEW_ROUTE:-topics/for-businesses/requesting-data-from-an-eudi-wallet}"
learn_trial_wp eval-file "$HERE/restore-pages.php"
