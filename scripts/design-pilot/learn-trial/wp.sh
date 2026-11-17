# Shared WP-CLI runner for the Learn trial.
# A server uses its own `wp` and WP_PATH. Nothing here points at a local checkout.
# shellcheck shell=bash

learn_trial_require_wp_path() {
  if [[ -z "${WP_PATH:-}" ]]; then
    echo "Set WP_PATH to the WordPress directory that contains wp-config.php, or to the core directory when wp-config.php is in the parent directory." >&2
    exit 1
  fi
  if [[ ! -d "$WP_PATH" ]]; then
    echo "WP_PATH is not a directory: $WP_PATH" >&2
    exit 1
  fi
  WP_PATH="$(cd "$WP_PATH" && pwd)"
  if [[ -f "$WP_PATH/wp-config.php" ]]; then
    return 0
  fi
  # FIDES production: core in public_html/wp, wp-config.php one directory higher.
  if [[ -f "$WP_PATH/wp-load.php" && -f "$WP_PATH/../wp-config.php" ]]; then
    return 0
  fi
  echo "WP_PATH has no wp-config.php, and the parent directory has none next to this core: $WP_PATH" >&2
  exit 1
}

# Optional: a design-pilot checkout may source env.sh when this runner has no wp.
# The staging package does not include env.sh, so that branch never runs there.
learn_trial_maybe_local_env() {
  local scripts_dir="$1"
  if [[ -n "${WP_CLI:-}${WP_PHP:-}" ]]; then
    return 0
  fi
  if command -v wp >/dev/null 2>&1; then
    return 0
  fi
  if [[ -f "$scripts_dir/env.sh" ]]; then
    # shellcheck disable=SC1091
    source "$scripts_dir/env.sh"
  fi
}

learn_trial_wp() {
  if [[ -n "${LEARN_WP_URL:-}" ]]; then
    set -- --url="${LEARN_WP_URL}" "$@"
  fi
  if [[ -n "${WP_PHP:-}" && -n "${WP_CLI:-}" ]]; then
    if [[ -n "${WP_PHP_INI:-}" ]]; then
      "$WP_PHP" -c "$WP_PHP_INI" -d xdebug.mode=off -d memory_limit=1024M "$WP_CLI" --path="$WP_PATH" "$@"
    else
      "$WP_PHP" "$WP_CLI" --path="$WP_PATH" "$@"
    fi
    return
  fi
  if [[ -n "${PHP_BIN:-}" && -n "${WP_CLI_PHAR:-}" ]]; then
    "$PHP_BIN" -c "${PHP_INI:-}" -d xdebug.mode=off -d memory_limit=1024M "$WP_CLI_PHAR" --path="$WP_PATH" "$@"
    return
  fi
  if [[ -n "${WP_CLI:-}" ]]; then
    "$WP_CLI" --path="$WP_PATH" "$@"
    return
  fi
  if command -v wp >/dev/null 2>&1; then
    wp --path="$WP_PATH" "$@"
    return
  fi
  echo "No WP-CLI. On the server put wp on PATH, or set WP_CLI. A phar also needs WP_PHP." >&2
  exit 1
}

# After the host is known to be production and LEARN_TARGET=production.
# Pins WP-CLI to https://fides.community/ and refuses any other site.
learn_trial_use_production_site() {
  export LEARN_WP_URL="https://fides.community/"
  local identity
  identity="$(learn_trial_wp eval 'echo (is_multisite() ? "ms" : "single") . "|" . get_current_blog_id() . "|" . (is_main_site() ? "main" : "other") . "|" . untrailingslashit(home_url());')"
  identity="$(printf '%s' "$identity" | tr -d '[:space:]')"
  case "$identity" in
    ms\|1\|main\|https://fides.community|ms\|1\|main\|https://www.fides.community)
      return 0
      ;;
  esac
  echo "Refusing: production Learn install only runs on the main site https://fides.community/ (got ${identity:-empty})." >&2
  exit 1
}

learn_trial_report_dir() {
  local here="$1"
  if [[ -n "${LEARN_REPORT_DIR:-}" ]]; then
    printf '%s\n' "$LEARN_REPORT_DIR"
  elif [[ -n "${PILOT_ROOT:-}" ]]; then
    printf '%s\n' "$PILOT_ROOT/pilot-backup/learn-trial-reports"
  else
    printf '%s\n' "$here/reports"
  fi
}
