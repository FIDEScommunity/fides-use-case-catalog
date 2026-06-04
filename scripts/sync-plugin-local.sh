#!/usr/bin/env bash
# Sync the use-case catalog WordPress plugin to Local (utrecht-demo).
# Override with USE_CASE_PLUGIN_SRC / USE_CASE_PLUGIN_DEST when needed.
set -euo pipefail

SRC="${USE_CASE_PLUGIN_SRC:-/Users/victorvanderhulst/Projects/use-case-catalog/wordpress-plugin/fides-use-case-catalog/}"
DEST="${USE_CASE_PLUGIN_DEST:-/Users/victorvanderhulst/Local Sites/utrecht-demo/app/public/wp-content/plugins/fides-use-case-catalog/}"

echo "Syncing plugin:"
echo "  from: $SRC"
echo "  to:   $DEST"

rsync -av --delete "$SRC" "$DEST"

echo "Done."
