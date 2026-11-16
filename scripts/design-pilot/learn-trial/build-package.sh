#!/usr/bin/env bash
# Build a standalone Learn trial package from the committed trees.
# The package uses the server's wp and WP_PATH. It does not include env.sh.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILOT_SCRIPTS="$(cd "$HERE/.." && pwd)"
UC_ROOT="$(cd "$PILOT_SCRIPTS/../.." && pwd)"
TILES_ROOT="$(cd "$UC_ROOT/../fides-community-tools-tiles" && pwd)"
OUT_ROOT="${LEARN_PACKAGE_ROOT:-$(cd "$UC_ROOT/.." && pwd)/staging-package}"

dirty() {
  local repo="$1"
  shift
  git -C "$repo" status --porcelain -- "$@"
}

tiles_dirty="$(dirty "$TILES_ROOT" \
  fides-community-tools-tiles.php readme.txt assets/learn.css assets/learn.js includes/class-fides-ds-learn.php)"
content_dirty="$(dirty "$UC_ROOT" \
  scripts/design-pilot/create-learn-pages.php \
  scripts/design-pilot/staging/seed-guard.php \
  scripts/design-pilot/learn/manifest.json \
  scripts/design-pilot/learn/content \
  scripts/design-pilot/learn/README.md \
  scripts/design-pilot/learn-trial \
  scripts/design-pilot/tests/learn-behaviour.php)"
if [[ -n "$tiles_dirty$content_dirty" ]]; then
  echo "Refusing to package uncommitted Learn trial files." >&2
  printf '%s%s\n' "$tiles_dirty" "$content_dirty" >&2
  exit 1
fi

version="$(grep -m 1 -E '^ \* Version:' "$TILES_ROOT/fides-community-tools-tiles.php" | awk '{print $3}')"
if [[ "$version" != "1.13.67" ]]; then
  echo "Refusing: tiles version is $version, expected 1.13.67." >&2
  exit 1
fi

tiles_commit="$(git -C "$TILES_ROOT" rev-parse HEAD)"
content_commit="$(git -C "$UC_ROOT" rev-parse HEAD)"
stamp="$(date -u +%Y%m%d-%H%M%S)"
name="learn-trial-${stamp}-${tiles_commit:0:8}-${content_commit:0:8}"
dest="$OUT_ROOT/$name"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

mkdir -p "$stage/pkg/plugins" "$stage/pkg/mu-plugins" "$stage/pkg/seed/learn-trial" "$stage/extract"
git -C "$TILES_ROOT" archive --format=zip --prefix=fides-community-tools-tiles/ HEAD \
  -o "$stage/pkg/plugins/fides-community-tools-tiles-${version}.zip"
header="$(unzip -p "$stage/pkg/plugins/fides-community-tools-tiles-${version}.zip" \
  fides-community-tools-tiles/fides-community-tools-tiles.php | head -n 20 || true)"
case "$header" in
  *"Version: ${version}"*) ;;
  *)
    echo "Tiles zip does not contain version ${version}." >&2
    exit 1
    ;;
esac

git -C "$UC_ROOT" archive HEAD \
  scripts/design-pilot/create-learn-pages.php \
  scripts/design-pilot/staging/seed-guard.php \
  scripts/design-pilot/learn/manifest.json \
  scripts/design-pilot/learn/content \
  scripts/design-pilot/learn-trial/INSTALL.md \
  scripts/design-pilot/learn-trial/mu-plugins/fides-learn-trial.php \
  scripts/design-pilot/learn-trial/page-state.php \
  scripts/design-pilot/learn-trial/record-install.php \
  scripts/design-pilot/learn-trial/rollback-trial.php \
  scripts/design-pilot/learn-trial/rollback-trial.sh \
  scripts/design-pilot/learn-trial/routes.txt \
  scripts/design-pilot/learn-trial/seed-trial.sh \
  scripts/design-pilot/learn-trial/wp.sh \
  | tar -x -C "$stage/extract"

cp "$stage/extract/scripts/design-pilot/create-learn-pages.php" "$stage/pkg/seed/create-learn-pages.php"
mkdir -p "$stage/pkg/seed/staging"
cp "$stage/extract/scripts/design-pilot/staging/seed-guard.php" "$stage/pkg/seed/staging/seed-guard.php"
mkdir -p "$stage/pkg/seed/learn"
cp "$stage/extract/scripts/design-pilot/learn/manifest.json" "$stage/pkg/seed/learn/manifest.json"
cp -R "$stage/extract/scripts/design-pilot/learn/content" "$stage/pkg/seed/learn/content"
cp "$stage/extract/scripts/design-pilot/learn-trial/INSTALL.md" "$stage/pkg/INSTALL.md"
cp "$stage/extract/scripts/design-pilot/learn-trial/mu-plugins/fides-learn-trial.php" \
  "$stage/pkg/mu-plugins/fides-learn-trial.php"
cp "$stage/extract/scripts/design-pilot/learn-trial/"*.php "$stage/pkg/seed/learn-trial/"
cp "$stage/extract/scripts/design-pilot/learn-trial/"*.sh "$stage/pkg/seed/learn-trial/"
cp "$stage/extract/scripts/design-pilot/learn-trial/routes.txt" "$stage/pkg/seed/learn-trial/routes.txt"
cp "$stage/extract/scripts/design-pilot/learn-trial/INSTALL.md" "$stage/pkg/seed/learn-trial/INSTALL.md"
chmod +x "$stage/pkg/seed/learn-trial/"*.sh
rm -f "$stage/pkg/seed/learn-trial/build-package.sh" "$stage/pkg/seed/learn-trial/test-target.sh"

if grep -R -n -E 'Local Sites|Application Support/Local|lightning-services' "$stage/pkg" >/dev/null; then
  echo "Package still mentions the local development environment." >&2
  exit 1
fi
if [[ -f "$stage/pkg/seed/env.sh" || -f "$stage/pkg/seed/learn-trial/env.sh" ]]; then
  echo "Package must not ship env.sh." >&2
  exit 1
fi

python3 - "$stage/pkg/manifest.json" "$tiles_commit" "$content_commit" "$version" "$stamp" <<'PY'
import json, sys
dest, tiles, content, version, stamp = sys.argv[1:]
doc = {
    "name": "fides-learn-trial",
    "built_at": stamp,
    "tiles_version": version,
    "tiles_commit": tiles,
    "content_commit": content,
    "pages": 51,
    "excluded_routes": ["learn/sessions/request", "start", "start/receive", "services", "services/wallet-readiness-assessment", "services/enquiry"],
    "wordpress": "Use the server's wp on PATH, or set WP_CLI. Set WP_PATH to the directory that contains wp-config.php.",
    "staging": "https://staging.fides.community requires LEARN_TARGET=staging. Dry-run unless LEARN_APPLY=1.",
    "refuses": ["fides.community", "www.fides.community", "/design-review", "/fides-design-pilot", "LEARN_FORCE"],
    "glossary": "Leave fides-vocabulary-glossary at 1.1.15. Credential and Credential Type are missing from the bundle Learn reads.",
    "request_buttons": "Training and workshop buttons in theme chrome go to /about-fides/contact/. Services buttons stay hidden. The design shell keeps the stored request links.",
    "contact": "Theme chrome uses /about-fides/contact/ with labels such as Contact us about this workshop. No offering and no date is added. The local copy returns 404 for that path; staging uses the same path.",
    "country": "The country field is a dropdown in theme chrome and in the design shell. The Netherlands shows the existing offer. Another country shows No scheduled trainings in that country. Theme chrome sends Contact us to /about-fides/contact/. The design shell uses the stored enquiry path. Other says your country. Training partnerships stays visible. The line under the field is gone. The design shell keeps the stored intro.",
    "header": "On a transparent theme header, theme chrome reserves 100px of theme color above the Learn bar and keeps the Learn page white. Logo, menu and Sign in stay on the theme positions. Remove /var/www/html/app/mu-plugins/fides-learn-header-fix.php once this package is installed. Other pages and the design shell stay unchanged.",
    "menu": "Do not overwrite the staging menu. Learn is first, with Overview, Topics, Training & workshops and Glossary as its submenu. Organizations sits under Ecosystem Explorer, directly above Issuers.",
    "installed": False,
}
with open(dest, "w", encoding="utf-8") as handle:
    json.dump(doc, handle, indent=2)
    handle.write("\n")
PY

(
  cd "$stage/pkg"
  find . -type f ! -name SHA256SUMS | sed 's#^\./##' | sort | while IFS= read -r file; do
    shasum -a 256 "$file"
  done
) > "$stage/pkg/SHA256SUMS"

mkdir -p "$OUT_ROOT"
rm -rf "$dest"
mv "$stage/pkg" "$dest"
trap - EXIT
echo "$dest"
