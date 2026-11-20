#!/usr/bin/env bash
# Seed the Learn theme trial: every Learn overview and article, plus Training & workshops.
# The preview enquiry page (sessions/request) is not seeded. Start and Services are not seeded.
# Refuses the design pilot. Staging runs only with LEARN_TARGET=staging.
# Production runs only with LEARN_TARGET=production. Dry-run unless LEARN_APPLY=1.
# LEARN_FORCE is refused. A production dry-run does not install.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILOT_SCRIPTS="$(cd "$HERE/.." && pwd)"
# shellcheck disable=SC1091
source "$HERE/wp.sh"
learn_trial_maybe_local_env "$PILOT_SCRIPTS"
learn_trial_require_wp_path
TARGET_REAL="$WP_PATH"
if [[ -n "${PILOT_SITE:-}" ]]; then
  PILOT_REAL="$(cd "$PILOT_SITE" && pwd)"
  if [[ "$TARGET_REAL" == "$PILOT_REAL" ]]; then
    echo "Refusing: WP_PATH is the design pilot. The pilot seed is create-learn-pages.sh." >&2
    exit 1
  fi
fi
if [[ -n "${LEARN_FORCE:-}" ]]; then
  echo "Refusing: LEARN_FORCE is set. Edited pages are skipped, never replaced." >&2
  exit 1
fi
if [[ -f "$HERE/content-update" ]]; then
  export LEARN_CONTENT_UPDATE=1
fi
unset LEARN_WP_URL || true

python3 - "$HERE/routes.txt" "$PILOT_SCRIPTS/learn/manifest.json" <<'PY'
import json, sys
routes = []
for line in open(sys.argv[1], encoding="utf-8"):
    item = line.split("#", 1)[0].strip()
    if item:
        routes.append("" if item == "." else item)
manifest = json.load(open(sys.argv[2], encoding="utf-8"))
learn = []
for page in manifest["pages"]:
    if page.get("tree", "learn") != "learn":
        continue
    if page["path"] == "sessions/request":
        continue
    learn.append(page["path"])
    title = (page.get("seo_title") or "").strip()
    description = (page.get("seo_description") or "").strip()
    if not title.endswith(" | FIDES Community") or not description:
        sys.stderr.write("Refusing: " + page["path"] + " has no SEO title or description.\n")
        sys.exit(1)
    if "Join an open training in Utrecht" in description or "staging.fides.community" in description or "staging.fides.community" in title:
        sys.stderr.write("Refusing: " + page["path"] + " has a staging address or the old training description.\n")
        sys.exit(1)
if routes != learn:
    sys.stderr.write("Refusing: routes.txt does not match the Learn manifest minus sessions/request.\n")
    sys.exit(1)
if "sessions/request" in routes:
    sys.stderr.write("Refusing: the preview enquiry page is in routes.txt.\n")
    sys.exit(1)
PY

trial_wp() {
  learn_trial_wp "$@"
}

HOME_URL="$(trial_wp option get home)"
HOST="$(printf '%s' "$HOME_URL" | sed -E 's#^[a-z]+://([^/:]+).*#\1#' | tr '[:upper:]' '[:lower:]')"
HOME_PATH="$(printf '%s' "$HOME_URL" | sed -E 's#^[a-z]+://[^/]+##' | tr '[:upper:]' '[:lower:]')"
HOME_PATH="${HOME_PATH%/}"
case "$HOME_PATH" in
  /design-review|/design-review/*|/fides-design-pilot|/fides-design-pilot/*)
    echo "Refusing: ${HOME_URL} is a design-pilot site. This package is for the existing site, not design-review." >&2
    exit 1
    ;;
esac
case "$HOST" in
  fides.community|www.fides.community)
    if [[ "${LEARN_TARGET:-}" != "production" ]]; then
      echo "Refusing to seed production host ${HOST}. Set LEARN_TARGET=production for an explicit production dry-run. LEARN_APPLY=1 is a separate install step. LEARN_TARGET=staging does not apply here." >&2
      exit 1
    fi
    learn_trial_use_production_site
    ;;
  staging.fides.community)
    if [[ "${LEARN_TARGET:-}" != "staging" ]]; then
      echo "Refusing ${HOST}. Set LEARN_TARGET=staging to seed that host. This script does not install by itself." >&2
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
if [[ -z "$HOST" || "$HOST" == "$HOME_URL" ]]; then
  echo "Refusing: could not read a host from home_url (${HOME_URL})." >&2
  exit 1
fi
pilot_flag="$(trial_wp eval 'echo defined("FIDES_DESIGN_PILOT") && FIDES_DESIGN_PILOT ? "yes" : "no";' | tr -d '[:space:]')"
if [[ "$pilot_flag" == "yes" ]]; then
  echo "Refusing: ${HOME_URL} is the design pilot (FIDES_DESIGN_PILOT)." >&2
  exit 1
fi

# A content-update package seeds only routes-update.txt. A direct run with any other
# selection, including the full routes.txt list, stops before it writes.
if [[ -f "$HERE/content-update" ]]; then
  if [[ "$HOST" == "fides.community" || "$HOST" == "www.fides.community" || "${LEARN_TARGET:-}" == "production" ]]; then
    echo "Refusing: this content update does not install on production." >&2
    exit 1
  fi
  if [[ ! -f "$HERE/routes-update.txt" ]]; then
    echo "Refusing: routes-update.txt is missing." >&2
    exit 1
  fi
  package_ids="$(python3 "$HERE/validate-routes-update.py" "$HERE/routes-update.txt" "$PILOT_SCRIPTS/learn/manifest.json")"
  if [[ -z "${LEARN_IDS:-}" || "$LEARN_IDS" != "$package_ids" ]]; then
    echo "Refusing: LEARN_IDS is not the route list in routes-update.txt. Run seed-routes-update.sh." >&2
    exit 1
  fi
fi

if [[ -z "${LEARN_IDS+x}" ]]; then
  LEARN_IDS="$(python3 - "$HERE/routes.txt" <<'PY'
import sys
ids = []
for line in open(sys.argv[1], encoding="utf-8"):
    item = line.split("#", 1)[0].strip()
    if item:
        ids.append(item)
print(",".join(ids))
PY
)"
fi
export LEARN_IDS
export PILOT_ALLOWED_HOSTS="$HOST"
export LEARN_ALLOW_NON_PILOT=1
export LEARN_TRIAL_BOUNDED=1
export LEARN_BASE=learn
export LEARN_START_BASE=start
export LEARN_SERVICES_BASE=services
export LEARN_PILOT_BASE=
if [[ -z "${LEARN_GLOSSARY_PATH:-}" ]]; then
  case "$HOST" in
    utrecht-demo.local) LEARN_GLOSSARY_PATH=/glossary/ ;;
    *) LEARN_GLOSSARY_PATH=/community-tools/glossary/ ;;
  esac
fi
export LEARN_GLOSSARY_PATH
export LEARN_SEO=1
export LEARN_FORCE=
export LEARN_DRY_RUN=1
if [[ "${LEARN_APPLY:-}" == "1" ]]; then
  unset LEARN_DRY_RUN
fi
if [[ -n "${PILOT_ROOT:-}" ]]; then
  export LEARN_BACKUP_DIR="${LEARN_BACKUP_DIR:-$PILOT_ROOT/pilot-backup/learn-trial-replaced}"
else
  export LEARN_BACKUP_DIR="${LEARN_BACKUP_DIR:-$HERE/reports/replaced}"
fi
REPORT_DIR="$(learn_trial_report_dir "$HERE")"
mkdir -p "$REPORT_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
MODE="$([[ "${LEARN_APPLY:-}" == "1" ]] && echo apply || echo dry-run)"
REPORT="$REPORT_DIR/${MODE}-${STAMP}.txt"
if [[ "$MODE" == "apply" ]]; then
  # Stamped only on pages this run creates. A later update does not receive it.
  export LEARN_TRIAL_INSTALL="$STAMP"
fi

echo "Learn trial seed on ${HOME_URL} (${TARGET_REAL})"
echo "mode: ${MODE}"
echo "routes: $(printf '%s' "$LEARN_IDS" | awk -F, '{print NF}') (sessions/request excluded)"
# Read-only. A missing renderer or form coupling stops the seed. Nothing is installed.
if ! LEARN_CHECK_REQUIREMENTS=1 trial_wp eval-file "$HERE/check-requirements.php"; then
  echo "Refusing: this site is missing a Learn function this update needs. No plugin is installed." >&2
  exit 1
fi
trial_wp eval-file "$PILOT_SCRIPTS/create-learn-pages.php" | tee "$REPORT"

python3 - "$REPORT" "$REPORT_DIR/created-routes.txt" "$MODE" <<'PY'
import sys
from urllib.parse import urlparse
report, dest, mode = sys.argv[1:]
created = []
for line in open(report, encoding="utf-8"):
    if not line.strip() or line.startswith("SUMMARY") or line.startswith("GLOSSARY-MISSING"):
        continue
    if line.split()[0] != "created":
        continue
    url = ""
    for token in line.split():
        if token.startswith("http://") or token.startswith("https://"):
            url = token
            break
    if not url:
        sys.stderr.write("created line has no permalink: " + line)
        sys.exit(1)
    created.append(urlparse(url).path.strip("/"))
if mode != "apply":
    sys.exit(0)
prior = []
try:
    prior = [line.strip() for line in open(dest, encoding="utf-8") if line.strip() and not line.startswith("#")]
except FileNotFoundError:
    pass
merged = prior[:]
for route in created:
    if route not in merged:
        merged.append(route)
with open(dest, "w", encoding="utf-8") as handle:
    handle.write("# Route list only. Rollback uses the install ledger (id, route, marker, hash), not this file.\n")
    for route in merged:
        handle.write(route + "\n")
print(f"created-routes: {len(created)} new, {len(merged)} recorded in {dest}")
PY

if [[ "$MODE" == "apply" ]] && grep -q '^created' "$REPORT"; then
  export LEARN_REPORT="$REPORT"
  export LEARN_LEDGER_DIR="$REPORT_DIR/installs"
  trial_wp eval-file "$HERE/record-install.php"
fi
