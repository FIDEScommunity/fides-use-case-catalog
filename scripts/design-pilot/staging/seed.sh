#!/usr/bin/env bash
# Seed the design pilot pages on a target site (staging) with WP-CLI.
#
#   WP="wp --path=/path/to/wordpress" seed.sh preflight   read-only checks
#   WP="wp --path=/path/to/wordpress" seed.sh dry-run     preflight + what the seed would do
#   WP="wp --path=/path/to/wordpress" seed.sh apply       preflight + seed (stops on a FAIL)
#
# Pages an editor changed after an earlier seed are skipped and reported, never overwritten.
# Replace them deliberately with PILOT_FORCE="design-review/overview" (pages) and
# LEARN_FORCE="topics" (Learn pages); the old state is written to PILOT_BACKUP_DIR first.
#
# Layouts (PILOT_LAYOUT):
#   standalone (default)  its own WordPress site whose home_url() already ends in /design-review. The pilot pages sit at
#                         the root of that site: /design-review/overview/ is the page "overview". Also seeds the form pages
#                         and the glossary page, and makes the pilot homepage the front page while none is set.
#   subpath               a pilot below another site's root (/<PILOT_BASE>/overview/), the earlier staging layout.
#
# Environment (all optional):
#   WP                    WP-CLI command, default "wp"
#   PILOT_LAYOUT          standalone (default) or subpath
#   PILOT_HOME_PATH       standalone: path home_url() must have, default /design-review
#   PILOT_BASE            subpath only: route base, default design-review
#   PILOT_ALLOWED_HOSTS   default localhost,127.0.0.1,staging.fides.community (production hosts are always refused)
#   PILOT_BACKUP_DIR      default ./seed-backups/<timestamp>
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# In the package seed.sh sits next to create-pages.php; in the repo it sits one level below.
SEED="$HERE"; [[ -f "$SEED/create-pages.php" ]] || SEED="$HERE/.."
MODE="${1:-}"
[[ "$MODE" =~ ^(preflight|dry-run|apply)$ ]] || { sed -n 2,20p "${BASH_SOURCE[0]}" >&2; exit 2; }

WP="${WP:-wp}"
PILOT_LAYOUT="${PILOT_LAYOUT:-standalone}"
case "$PILOT_LAYOUT" in
  standalone)
    export PILOT_STANDALONE=1 PILOT_BASE="" PILOT_HOME_PATH="${PILOT_HOME_PATH:-/design-review}"
    export LEARN_BASE="${LEARN_BASE:-learn}" LEARN_START_BASE="${LEARN_START_BASE:-start}" LEARN_SERVICES_BASE="${LEARN_SERVICES_BASE:-services}" LEARN_PILOT_BASE="" ;;
  subpath)
    unset PILOT_STANDALONE
    export PILOT_BASE="${PILOT_BASE:-design-review}"
    export LEARN_BASE="${LEARN_BASE:-$PILOT_BASE/learn}"
    export LEARN_START_BASE="${LEARN_START_BASE:-$PILOT_BASE/start}"
    export LEARN_SERVICES_BASE="${LEARN_SERVICES_BASE:-$PILOT_BASE/services}"
    export LEARN_PILOT_BASE="${LEARN_PILOT_BASE:-$PILOT_BASE}" ;;
  *) echo "PILOT_LAYOUT must be standalone or subpath" >&2; exit 2 ;;
esac
export PILOT_BACKUP_DIR="${PILOT_BACKUP_DIR:-$PWD/seed-backups/$(date +%Y%m%d-%H%M%S)}"
export LEARN_BACKUP_DIR="${LEARN_BACKUP_DIR:-$PILOT_BACKUP_DIR}"
export PILOT_PACKAGE_MANIFEST="${PILOT_PACKAGE_MANIFEST:-$SEED/../manifest.json}"

# create-learn-pages.php reads ./learn next to itself.
# WP is a command string and may contain quoted paths with spaces.
run() { eval "$WP eval-file \"\$1\""; }

echo "== preflight (layout $PILOT_LAYOUT, pilot pages at ${PILOT_HOME_PATH:-/$PILOT_BASE}/)"
run "$SEED/staging/preflight.php"
[[ "$MODE" == "preflight" ]] && exit 0

if [[ "$MODE" == "dry-run" ]]; then export PILOT_DRY_RUN=1 LEARN_DRY_RUN=1; fi

echo; echo "== pages"
run "$SEED/create-pages.php"

echo; echo "== Learn pages"
if [[ "$PILOT_LAYOUT" == "subpath" && "$MODE" == "dry-run" ]] && [[ "$(eval "$WP eval \"echo get_page_by_path('$PILOT_BASE') ? 1 : 0;\"")" != "1" ]]; then
  echo "dry-run: /$PILOT_BASE/ does not exist yet, so the Learn pages cannot be previewed (apply creates the parent first)."
else
  run "$SEED/create-learn-pages.php"
fi

echo; echo "Done ($MODE). Next: flush rewrite rules once if /wp-sitemap.xml or the pages 404 ($WP rewrite flush)."
