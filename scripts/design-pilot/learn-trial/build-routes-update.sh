#!/usr/bin/env bash
# Build a Learn content update from recorded commits.
# LEARN_CONTENT_COMMIT  content commit (HTML, manifest, translations, media)
# LEARN_SEED_COMMIT     commit that contains this seeder and the route check
# LEARN_TILES_COMMIT    commit for class-fides-ds-learn.php and assets/learn.js
# LEARN_ROUTES_FILE     one route per line; becomes routes-update.txt
# LEARN_TILES_ROOT      Tiles git checkout. Defaults to the design-pilot checkout.
# The package is written under staging-package and is not installed.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PILOT_SCRIPTS="$(cd "$HERE/.." && pwd)"
UC_ROOT="$(cd "$PILOT_SCRIPTS/../.." && pwd)"
TILES_ROOT="${LEARN_TILES_ROOT:-$(cd "$UC_ROOT/../fides-community-tools-tiles" && pwd)}"
OUT_ROOT="${LEARN_PACKAGE_ROOT:-$(cd "$UC_ROOT/.." && pwd)/staging-package}"
CONTENT_COMMIT="${LEARN_CONTENT_COMMIT:?Set LEARN_CONTENT_COMMIT}"
SEED_COMMIT="${LEARN_SEED_COMMIT:?Set LEARN_SEED_COMMIT}"
TILES_COMMIT="${LEARN_TILES_COMMIT:?Set LEARN_TILES_COMMIT}"
ROUTES_FILE="${LEARN_ROUTES_FILE:?Set LEARN_ROUTES_FILE}"

git -C "$UC_ROOT" cat-file -e "${CONTENT_COMMIT}^{commit}"
git -C "$UC_ROOT" cat-file -e "${SEED_COMMIT}^{commit}"
git -C "$TILES_ROOT" cat-file -e "${TILES_COMMIT}^{commit}"
if [[ ! -f "$ROUTES_FILE" ]]; then
  echo "Refusing: route list $ROUTES_FILE is missing." >&2
  exit 1
fi

stamp="$(date -u +%Y%m%d-%H%M%S)"
# LEARN_PACKAGE_LABEL=-concept only when the installed file hashes were not read.
# A source comparison of page bodies is recorded in COMPARE.txt; it does not add the suffix.
name="learn-routes-${stamp}${LEARN_PACKAGE_LABEL:-}"
dest="$OUT_ROOT/$name"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
mkdir -p "$stage/pkg/seed/learn-trial" "$stage/pkg/seed/staging" "$stage/pkg/seed/learn/content" \
  "$stage/pkg/seed/learn/media" "$stage/pkg/tiles-delta/assets" "$stage/pkg/tiles-delta/includes" \
  "$stage/extract"

git -C "$UC_ROOT" archive "$CONTENT_COMMIT" \
  scripts/design-pilot/learn/manifest.json \
  scripts/design-pilot/learn/content \
  scripts/design-pilot/learn/media \
  scripts/design-pilot/learn/nl-translations.json \
  scripts/design-pilot/learn/nl-translations-transfer.php \
  | tar -x -C "$stage/extract"
git -C "$UC_ROOT" archive "$SEED_COMMIT" \
  scripts/design-pilot/create-learn-pages.php \
  scripts/design-pilot/staging/seed-guard.php \
  scripts/design-pilot/learn-trial/media.php \
  scripts/design-pilot/learn-trial/check-requirements.php \
  scripts/design-pilot/learn-trial/seed-trial.sh \
  scripts/design-pilot/learn-trial/seed-routes-update.sh \
  scripts/design-pilot/learn-trial/validate-routes-update.py \
  scripts/design-pilot/learn-trial/wp.sh \
  scripts/design-pilot/learn-trial/routes.txt \
  scripts/design-pilot/learn-trial/page-state.php \
  scripts/design-pilot/learn-trial/record-install.php \
  scripts/design-pilot/learn-trial/check-seo.py \
  scripts/design-pilot/learn-trial/glossary-pin.json \
  scripts/design-pilot/learn-trial/seo-control.md \
  scripts/design-pilot/learn-trial/preflight-installed-files.sh \
  scripts/design-pilot/learn-trial/backup-before-apply.sh \
  scripts/design-pilot/learn-trial/backup-pages.php \
  scripts/design-pilot/learn-trial/apply-tiles-files.sh \
  scripts/design-pilot/learn-trial/restore-backup.sh \
  scripts/design-pilot/learn-trial/restore-pages.php \
  scripts/design-pilot/learn-trial/record-after-apply.php \
  | tar -x -C "$stage/extract"
mkdir -p "$stage/extract-tiles"
git -C "$TILES_ROOT" archive "$TILES_COMMIT" assets/learn.js includes/class-fides-ds-learn.php | tar -x -C "$stage/extract-tiles"

cp "$stage/extract/scripts/design-pilot/learn/manifest.json" "$stage/pkg/seed/learn/manifest.json"
rm -rf "$stage/pkg/seed/learn/content"
cp -R "$stage/extract/scripts/design-pilot/learn/content" "$stage/pkg/seed/learn/content"
find "$stage/extract/scripts/design-pilot/learn/media" -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.webp' \) -exec cp {} "$stage/pkg/seed/learn/media/" \;
python3 - "$stage/pkg/seed/learn/content" "$stage/pkg/seed/learn/media" "$ROUTES_FILE" "$stage/pkg/seed/learn/manifest.json" <<'PY'
import json, re, sys
from pathlib import Path
content, media, routes_file, manifest_file = map(Path, sys.argv[1:])
manifest = json.loads(manifest_file.read_text())
by_path = {page["path"]: page["content"] for page in manifest["pages"]}
needed = set()
for line in routes_file.read_text().splitlines():
    route = line.split("#", 1)[0].strip()
    if not route:
        continue
    html = content / by_path[route]
    needed.update(re.findall(r"\{\{media\}\}/([^\"'\s]+)", html.read_text()))
for image in media.iterdir():
    if image.is_file() and image.name not in needed:
        image.unlink()
missing = needed - {image.name for image in media.iterdir() if image.is_file()}
if missing:
    sys.stderr.write("Refusing: missing media " + ", ".join(sorted(missing)) + "\n")
    sys.exit(1)
PY
cp "$stage/extract/scripts/design-pilot/learn/nl-translations.json" "$stage/pkg/seed/learn/nl-translations.json"
cp "$stage/extract/scripts/design-pilot/learn/nl-translations-transfer.php" "$stage/pkg/seed/learn/nl-translations-transfer.php"
cp "$stage/extract/scripts/design-pilot/create-learn-pages.php" "$stage/pkg/seed/create-learn-pages.php"
cp "$stage/extract/scripts/design-pilot/staging/seed-guard.php" "$stage/pkg/seed/staging/seed-guard.php"
cp "$stage/extract/scripts/design-pilot/learn-trial/media.php" \
  "$stage/extract/scripts/design-pilot/learn-trial/check-requirements.php" \
  "$stage/extract/scripts/design-pilot/learn-trial/seed-trial.sh" \
  "$stage/extract/scripts/design-pilot/learn-trial/seed-routes-update.sh" \
  "$stage/extract/scripts/design-pilot/learn-trial/validate-routes-update.py" \
  "$stage/extract/scripts/design-pilot/learn-trial/wp.sh" \
  "$stage/extract/scripts/design-pilot/learn-trial/routes.txt" \
  "$stage/extract/scripts/design-pilot/learn-trial/page-state.php" \
  "$stage/extract/scripts/design-pilot/learn-trial/record-install.php" \
  "$stage/extract/scripts/design-pilot/learn-trial/check-seo.py" \
  "$stage/extract/scripts/design-pilot/learn-trial/glossary-pin.json" \
  "$stage/extract/scripts/design-pilot/learn-trial/seo-control.md" \
  "$stage/extract/scripts/design-pilot/learn-trial/preflight-installed-files.sh" \
  "$stage/extract/scripts/design-pilot/learn-trial/backup-before-apply.sh" \
  "$stage/extract/scripts/design-pilot/learn-trial/backup-pages.php" \
  "$stage/extract/scripts/design-pilot/learn-trial/apply-tiles-files.sh" \
  "$stage/extract/scripts/design-pilot/learn-trial/restore-backup.sh" \
  "$stage/extract/scripts/design-pilot/learn-trial/restore-pages.php" \
  "$stage/extract/scripts/design-pilot/learn-trial/record-after-apply.php" \
  "$stage/pkg/seed/learn-trial/"
cp "$ROUTES_FILE" "$stage/pkg/seed/learn-trial/routes-update.txt"
: > "$stage/pkg/seed/learn-trial/content-update"
chmod +x "$stage/pkg/seed/learn-trial/seed-trial.sh" \
  "$stage/pkg/seed/learn-trial/seed-routes-update.sh" \
  "$stage/pkg/seed/learn-trial/validate-routes-update.py" \
  "$stage/pkg/seed/learn-trial/check-seo.py" \
  "$stage/pkg/seed/learn-trial/preflight-installed-files.sh" \
  "$stage/pkg/seed/learn-trial/backup-before-apply.sh" \
  "$stage/pkg/seed/learn-trial/apply-tiles-files.sh" \
  "$stage/pkg/seed/learn-trial/restore-backup.sh"
cp "$stage/extract-tiles/assets/learn.js" "$stage/pkg/tiles-delta/assets/learn.js"
cp "$stage/extract-tiles/includes/class-fides-ds-learn.php" "$stage/pkg/tiles-delta/includes/class-fides-ds-learn.php"
{
  shasum -a 256 "$stage/pkg/tiles-delta/assets/learn.js" | awk '{print "tiles-delta/assets/learn.js " $1}'
  shasum -a 256 "$stage/pkg/tiles-delta/includes/class-fides-ds-learn.php" | awk '{print "tiles-delta/includes/class-fides-ds-learn.php " $1}'
} > "$stage/pkg/package-file-hashes.txt"

python3 "$stage/pkg/seed/learn-trial/validate-routes-update.py" \
  "$stage/pkg/seed/learn-trial/routes-update.txt" \
  "$stage/pkg/seed/learn/manifest.json" >/dev/null
python3 "$stage/pkg/seed/learn-trial/check-seo.py" "$stage/pkg/seed/learn/manifest.json"

if grep -R -n -E '^[^#*/]*LEARN_FORCE=[^[:space:]"'\'']' "$stage/pkg" >/dev/null; then
  echo "Refusing: the package sets LEARN_FORCE." >&2
  exit 1
fi
if grep -R -n -E 'Local Sites|Application Support/Local|lightning-services' "$stage/pkg" >/dev/null; then
  echo "Refusing: the package mentions the local development environment." >&2
  exit 1
fi
if grep -R -n 'utrecht-demo.local' "$stage/pkg/seed/learn/content" >/dev/null; then
  echo "Refusing: Learn content contains a local address." >&2
  exit 1
fi

content_full="$(git -C "$UC_ROOT" rev-parse "$CONTENT_COMMIT")"
seed_full="$(git -C "$UC_ROOT" rev-parse "$SEED_COMMIT")"
tiles_full="$(git -C "$TILES_ROOT" rev-parse "$TILES_COMMIT")"
cp "$stage/pkg/seed/learn-trial/routes-update.txt" "$stage/pkg/ROUTES.txt"
printf '%s\n' "$dest" > "$stage/pkg/.package-path"
# The path file is not part of the checksummed delivery; remove it before sums.
rm "$stage/pkg/.package-path"

mkdir -p "$OUT_ROOT"
rm -rf "$dest"
mv "$stage/pkg" "$dest"
trap - EXIT
printf '%s\n' "$content_full" > "$dest/CONTENT_COMMIT"
printf '%s\n' "$seed_full" > "$dest/SEED_COMMIT"
printf '%s\n' "$tiles_full" > "$dest/TILES_COMMIT"
echo "$dest"
