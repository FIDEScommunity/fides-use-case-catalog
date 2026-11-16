#!/usr/bin/env bash
# Seed the five-page Learn trial on a local WordPress copy.
# Refuses the design pilot, production, and staging. Dry-run unless LEARN_APPLY=1.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILOT_SCRIPTS="$(cd "$HERE/.." && pwd)"
# shellcheck disable=SC1091
source "$PILOT_SCRIPTS/env.sh"

WP_PATH="${WP_PATH:-/Users/victorvanderhulst/Local Sites/utrecht-demo/app/public}"
PILOT_REAL="$(cd "$PILOT_SITE" && pwd)"
TARGET_REAL="$(cd "$WP_PATH" && pwd)"
if [[ "$TARGET_REAL" == "$PILOT_REAL" ]]; then
  echo "Refusing: WP_PATH is the design pilot. The pilot seed is create-learn-pages.sh." >&2
  exit 1
fi

trial_wp() {
  "$PHP_BIN" -c "$PHP_INI" -d xdebug.mode=off -d memory_limit=1024M "$WP_CLI_PHAR" --path="$TARGET_REAL" "$@"
}

HOME_URL="$(trial_wp option get home)"
HOST="$(printf '%s' "$HOME_URL" | sed -E 's#^[a-z]+://([^/:]+).*#\1#' | tr '[:upper:]' '[:lower:]')"
case "$HOST" in
  fides.community|www.fides.community|staging.fides.community)
    echo "Refusing to seed host ${HOST}." >&2
    exit 1
    ;;
esac
if [[ -z "$HOST" || "$HOST" == "$HOME_URL" ]]; then
  echo "Refusing: could not read a local host from home_url (${HOME_URL})." >&2
  exit 1
fi

export PILOT_ALLOWED_HOSTS="$HOST"
export LEARN_ALLOW_NON_PILOT=1
export LEARN_BASE=learn
export LEARN_START_BASE=start
export LEARN_SERVICES_BASE=services
export LEARN_PILOT_BASE=
export LEARN_GLOSSARY_PATH="${LEARN_GLOSSARY_PATH:-/glossary/}"
export LEARN_IDS="${LEARN_IDS:-.,topics,topics/the-big-picture,topics/the-big-picture/what-is-a-digital-wallet,topics/the-big-picture/how-credentials-connect}"
export LEARN_FORCE=
export LEARN_DRY_RUN=1
if [[ "${LEARN_APPLY:-}" == "1" ]]; then
  unset LEARN_DRY_RUN
fi
export LEARN_BACKUP_DIR="${LEARN_BACKUP_DIR:-$PILOT_ROOT/pilot-backup/learn-trial-replaced}"

echo "Learn trial seed on ${HOME_URL} (${TARGET_REAL})"
echo "LEARN_IDS=${LEARN_IDS}"
echo "mode: $([[ "${LEARN_APPLY:-}" == "1" ]] && echo apply || echo dry-run)"
trial_wp eval-file "$PILOT_SCRIPTS/create-learn-pages.php"
