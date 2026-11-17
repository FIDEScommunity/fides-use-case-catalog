#!/usr/bin/env bash
# Roll back the Learn install named by LEARN_LEDGER.
# Dry-run unless LEARN_ROLLBACK=1. Deletes only rows whose id, route, seed
# marker, install marker and content hash still match. Existing and edited
# pages are reported and left in place.
# Refuses the design pilot. Staging needs LEARN_TARGET=staging.
# Production needs LEARN_TARGET=production. Dry-run unless LEARN_ROLLBACK=1.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILOT_SCRIPTS="$(cd "$HERE/.." && pwd)"
# shellcheck disable=SC1091
source "$HERE/wp.sh"
learn_trial_maybe_local_env "$PILOT_SCRIPTS"
learn_trial_require_wp_path
LEDGER="${LEARN_LEDGER:-}"
if [[ -z "$LEDGER" || ! -f "$LEDGER" ]]; then
  echo "Set LEARN_LEDGER to the install ledger (host, install id, and one row per created page)." >&2
  exit 1
fi
TARGET_REAL="$WP_PATH"
if [[ -n "${PILOT_SITE:-}" ]]; then
  PILOT_REAL="$(cd "$PILOT_SITE" && pwd)"
  if [[ "$TARGET_REAL" == "$PILOT_REAL" ]]; then
    echo "Refusing: WP_PATH is the design pilot." >&2
    exit 1
  fi
fi

trial_wp() {
  learn_trial_wp "$@"
}

HOME_URL="$(trial_wp option get home)"
HOST="$(printf '%s' "$HOME_URL" | sed -E 's#^[a-z]+://([^/:]+).*#\1#' | tr '[:upper:]' '[:lower:]')"
HOME_PATH="$(printf '%s' "$HOME_URL" | sed -E 's#^[a-z]+://[^/]+##' | tr '[:upper:]' '[:lower:]')"
HOME_PATH="${HOME_PATH%/}"
case "$HOME_PATH" in
  /design-review|/design-review/*|/fides-design-pilot|/fides-design-pilot/*)
    echo "Refusing: ${HOME_URL} is a design-pilot site." >&2
    exit 1
    ;;
esac
case "$HOST" in
  fides.community|www.fides.community)
    if [[ "${LEARN_TARGET:-}" != "production" ]]; then
      echo "Refusing to roll back production host ${HOST}. Set LEARN_TARGET=production. LEARN_ROLLBACK=1 is a separate step. LEARN_TARGET=staging does not apply here." >&2
      exit 1
    fi
    ;;
  staging.fides.community)
    if [[ "${LEARN_TARGET:-}" != "staging" ]]; then
      echo "Refusing ${HOST}. Set LEARN_TARGET=staging. This script does not roll back by itself." >&2
      exit 1
    fi
    ;;
  *)
    if [[ "${LEARN_TARGET:-}" == "staging" || "${LEARN_TARGET:-}" == "production" ]]; then
      echo "Refusing: LEARN_TARGET=${LEARN_TARGET} but home_url is ${HOME_URL}." >&2
      exit 1
    fi
    ;;
esac
export LEARN_TARGET="${LEARN_TARGET:-}"

pilot_flag="$(trial_wp eval 'echo defined("FIDES_DESIGN_PILOT") && FIDES_DESIGN_PILOT ? "yes" : "no";' | tr -d '[:space:]')"
if [[ "$pilot_flag" == "yes" ]]; then
  echo "Refusing: ${HOME_URL} is the design pilot (FIDES_DESIGN_PILOT)." >&2
  exit 1
fi

export LEARN_LEDGER="$LEDGER"
echo "Learn trial rollback on ${HOME_URL}"
echo "ledger: ${LEDGER}"
echo "mode: $([[ "${LEARN_ROLLBACK:-}" == "1" ]] && echo rollback || echo dry-run)"
trial_wp eval-file "$HERE/rollback-trial.php"
