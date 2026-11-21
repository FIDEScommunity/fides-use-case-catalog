#!/usr/bin/env bash
# Confirm the two Learn files already on the server match the hashes recorded
# for this package, then confirm the files this package would install.
# Reads only. Does not copy, seed, or set LEARN_FORCE.
# The version string in the plugin header is not consulted.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG="${LEARN_PACKAGE_ROOT:-$(cd "$HERE/../.." && pwd)}"
INSTALLED_LIST="$PKG/installed-hashes.txt"
PACKAGE_LIST="$PKG/package-file-hashes.txt"

if [[ -z "${WP_PATH:-}" && -z "${TILES_PLUGIN_DIR:-}" ]]; then
  echo "Refusing: set WP_PATH, or TILES_PLUGIN_DIR when the plugin directory is not under that tree." >&2
  exit 1
fi

if [[ ! -f "$INSTALLED_LIST" || ! -f "$PACKAGE_LIST" ]]; then
  echo "Refusing: $INSTALLED_LIST and $PACKAGE_LIST must both exist. Alignment is by those hashes, not by the plugin version." >&2
  exit 1
fi

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

locate_plugin() {
  if [[ -n "${TILES_PLUGIN_DIR:-}" ]]; then
    printf '%s\n' "$TILES_PLUGIN_DIR"
    return 0
  fi
  local candidate found=()
  for candidate in \
    "$WP_PATH/wp-content/plugins/fides-community-tools-tiles" \
    "$WP_PATH/../app/plugins/fides-community-tools-tiles" \
    "$WP_PATH/app/plugins/fides-community-tools-tiles"
  do
    if [[ -f "$candidate/assets/learn.js" && -f "$candidate/includes/class-fides-ds-learn.php" ]]; then
      found+=("$(cd "$candidate" && pwd)")
    fi
  done
  if [[ "${#found[@]}" -ne 1 ]]; then
    echo "Refusing: expected one Tiles plugin directory with both Learn files, found ${#found[@]}." >&2
    printf '  %s\n' "${found[@]:-}" >&2
    exit 1
  fi
  printf '%s\n' "${found[0]}"
}

if [[ -n "${WP_PATH:-}" ]] && [[ -z "${TILES_PLUGIN_DIR:-}" ]]; then
  if [[ -n "${WP_PHP:-}" && -n "${WP_CLI:-}" ]]; then
    home="$("$WP_PHP" ${WP_PHP_INI:+-c "$WP_PHP_INI"} -d xdebug.mode=off "$WP_CLI" --path="$WP_PATH" option get home 2>/dev/null || true)"
  elif command -v wp >/dev/null 2>&1; then
    home="$(wp --path="$WP_PATH" option get home 2>/dev/null || true)"
  else
    home=""
  fi
  host="$(printf '%s' "$home" | sed -E 's#^[a-z]+://([^/:]+).*#\1#' | tr '[:upper:]' '[:lower:]')"
  case "$host" in
    fides.community|www.fides.community)
      echo "Refusing: home is ${home}. This package does not install on production." >&2
      exit 1
      ;;
  esac
fi

PLUGIN="$(locate_plugin)"
fail=0
while read -r rel expected; do
  [[ -z "${rel:-}" || "$rel" == \#* ]] && continue
  path="$PLUGIN/$rel"
  if [[ ! -f "$path" ]]; then
    echo "Refusing: installed file missing: $path" >&2
    fail=1
    continue
  fi
  actual="$(sha256_file "$path")"
  if [[ "$actual" != "$expected" ]]; then
    echo "Refusing: installed $rel is $actual, expected $expected" >&2
    fail=1
    continue
  fi
  echo "installed $rel $actual ok"
done < "$INSTALLED_LIST"

while read -r rel expected; do
  [[ -z "${rel:-}" || "$rel" == \#* ]] && continue
  path="$PKG/$rel"
  if [[ ! -f "$path" ]]; then
    echo "Refusing: package file missing: $path" >&2
    fail=1
    continue
  fi
  actual="$(sha256_file "$path")"
  if [[ "$actual" != "$expected" ]]; then
    echo "Refusing: package $rel is $actual, expected $expected" >&2
    fail=1
    continue
  fi
  echo "package $rel $actual ok"
done < "$PACKAGE_LIST"

js="$PKG/tiles-delta/assets/learn.js"
php="$PKG/tiles-delta/includes/class-fides-ds-learn.php"
for needle in "Show answer" "Hide answer" "aria-label" "initRequest" "data-fides-learn-request"; do
  if ! grep -q -F "$needle" "$js"; then
    echo "Refusing: packaged learn.js is missing $needle" >&2
    fail=1
  fi
done
for needle in "Show answer" "Hide answer" "Fides_DS_Request_Form" "training_date" "data-fides-learn-request" "practice_answer_strings"; do
  if ! grep -q -F "$needle" "$php"; then
    echo "Refusing: packaged class-fides-ds-learn.php is missing $needle" >&2
    fail=1
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo "preflight failed" >&2
  exit 1
fi
echo "behaviours Show answer, Hide answer, aria-label, training-form coupling ok"
echo "preflight passed"
