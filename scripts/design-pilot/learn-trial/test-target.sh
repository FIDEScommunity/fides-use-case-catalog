#!/usr/bin/env bash
# Target guard and dry-run for a built Learn trial package.
# The stub cases never open a real site. The dry-run uses WP_PATH of the
# local production copy and does not set LEARN_APPLY.
set -euo pipefail
PKG="${1:?package directory}"
PKG="$(cd "$PKG" && pwd)"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fail=0

note() { printf '  %s\n' "$1"; }
bad() { printf 'FAIL %s\n' "$1" >&2; fail=1; }
ok() { printf 'PASS %s\n' "$1"; }

if ! (cd "$PKG" && shasum -a 256 -c SHA256SUMS >/dev/null); then
  bad "checksums"
else
  ok "checksums"
fi

if grep -R -n -E 'Local Sites|Application Support/Local|lightning-services' "$PKG" >/dev/null; then
  bad "package mentions the local development environment"
else
  ok "no local development paths"
fi
if [[ -e "$PKG/seed/env.sh" || -e "$PKG/seed/learn-trial/env.sh" ]]; then
  bad "env.sh shipped"
else
  ok "no env.sh"
fi
python3 - "$PKG/manifest.json" <<'PY'
import json, sys
doc = json.load(open(sys.argv[1], encoding="utf-8"))
assert doc["tiles_version"] == "1.13.68"
assert "1.12.2" in doc["glossary"] and "Credential Type" in doc["glossary"]
assert "355524646ac41171a31c9759c0f2702e1027c88f8e65ac4dc526d7b9238d18a6" in doc["glossary"]
assert "LEARN_TARGET=production" in doc["production"]
assert "Contact us about this workshop" in doc["contact"]
assert "/about-fides/contact/" in doc["contact"]
assert "your country" in doc["country"]
assert "fides-learn-header-fix.php" in doc["header"]
assert "Overview" in doc["menu"] and "Issuers" in doc["menu"]
assert "hidden" in doc["request_buttons"]
assert doc["installed"] is False
assert "public_html/wp" in doc["wordpress"]
assert "main site" in doc["production"]
assert "production without LEARN_TARGET=production" in doc["refuses"]
assert any("not the main site" in item for item in doc["refuses"])
assert "LEARN_FORCE" in doc["refuses"]
PY
ok "manifest names the glossary source and the production gate"
python3 "$PKG/seed/learn-trial/check-seo.py" "$PKG/seed/learn/manifest.json"
ok "52 Learn pages have unique SEO titles and descriptions"

if ! grep -q 'fides-learn-header-fix.php' "$PKG/INSTALL.md"; then
  bad "install instructions omit the temporary header rule"
else
  ok "install instructions remove the temporary header rule"
fi

stub="$(mktemp -d)"
site="$(mktemp -d)"
echo '<?php // target-guard fixture' > "$site/wp-config.php"
cat > "$stub/wp" <<'EOF'
#!/bin/sh
while [ $# -gt 0 ]; do
  case "$1" in
    --path|--url) shift 2 ;;
    --path=*|--url=*) shift ;;
    *) break ;;
  esac
done
printf '%s\n' "$*" >> "$WP_STUB_LOG"
if [ "$1" = "option" ]; then
  printf '%s\n' "$STUB_HOME"
  exit 0
fi
if [ "$1" = "eval" ]; then
  case "$2" in
    *FIDES_DESIGN_PILOT*) printf '%s\n' "${STUB_PILOT:-no}" ;;
    *is_main_site*)
      home=$(printf '%s' "$STUB_HOME" | sed 's#/*$##')
      if [ "${STUB_BLOG:-1}" = "1" ]; then
        printf 'ms|1|main|%s\n' "$home"
      else
        printf 'ms|%s|other|%s\n' "$STUB_BLOG" "$home"
      fi
      ;;
    *) printf '%s\n' "${STUB_PILOT:-no}" ;;
  esac
  exit 0
fi
if [ "$1" = "eval-file" ]; then
  echo REACHED_EVAL >> "$WP_STUB_LOG"
  echo "SUMMARY {\"stub\":1}"
  exit 0
fi
echo "unexpected: $*" >&2
exit 97
EOF
chmod +x "$stub/wp"

run_seed() {
  local home="$1"
  local target="${2:-}"
  local pilot="${3:-no}"
  local log out err
  log="$(mktemp)"
  out="$(mktemp)"
  err="$(mktemp)"
  set +e
  STUB_HOME="$home" STUB_PILOT="$pilot" WP_STUB_LOG="$log" \
    WP_PATH="$site" WP_CLI="$stub/wp" WP_PHP= WP_PHP_INI= \
    LEARN_TARGET="$target" \
    LEARN_REPORT_DIR="$(mktemp -d)" \
    bash "$PKG/seed/learn-trial/seed-trial.sh" >"$out" 2>"$err"
  local code=$?
  set -e
  RUN_CODE="$code"
  RUN_ERR="$(cat "$err")"
  RUN_OUT="$(cat "$out")"
  if grep -q REACHED_EVAL "$log"; then RUN_EVAL=1; else RUN_EVAL=0; fi
}

expect_refuse() {
  local label="$1"
  if [[ "$RUN_CODE" -eq 0 || "$RUN_EVAL" -eq 1 ]]; then
    bad "$label (exit $RUN_CODE eval $RUN_EVAL)"
    note "$RUN_ERR"
  elif ! printf '%s' "$RUN_ERR" | grep -q 'Refusing'; then
    bad "$label did not say Refusing"
    note "$RUN_ERR"
  else
    ok "$label"
  fi
}

run_seed "https://fides.community"
expect_refuse "production host refused without LEARN_TARGET=production"
run_seed "https://www.fides.community" staging
expect_refuse "www production refused even with LEARN_TARGET=staging"
run_seed "https://utrecht-demo.local" production
expect_refuse "production target refused on the local host"
run_seed "https://staging.fides.community"
expect_refuse "staging refused without LEARN_TARGET=staging"
run_seed "https://staging.fides.community/design-review/" staging
expect_refuse "design-review path refused"
run_seed "https://staging.fides.community/fides-design-pilot/" staging
expect_refuse "design-pilot path refused"
run_seed "http://localhost:10088" "" yes
expect_refuse "design pilot constant refused"

run_seed "https://staging.fides.community" staging
if [[ "$RUN_CODE" -eq 0 && "$RUN_EVAL" -eq 1 ]] && printf '%s' "$RUN_OUT" | grep -q 'mode: dry-run'; then
  ok "staging dry-run passes the host gate and does not apply"
else
  bad "staging gate (exit $RUN_CODE eval $RUN_EVAL)"
  note "$RUN_ERR"
  note "$RUN_OUT"
fi

run_seed "https://fides.community" production
if [[ "$RUN_CODE" -eq 0 && "$RUN_EVAL" -eq 1 ]] && printf '%s' "$RUN_OUT" | grep -q 'mode: dry-run'; then
  ok "production dry-run passes the host gate and does not apply"
else
  bad "production gate (exit $RUN_CODE eval $RUN_EVAL)"
  note "$RUN_ERR"
  note "$RUN_OUT"
fi

STUB_BLOG=2 run_seed "https://fides.community" production
unset STUB_BLOG
expect_refuse "production refuses a site that is not the main site"

force_err="$(mktemp)"
set +e
WP_PATH="$site" WP_CLI="$stub/wp" WP_PHP= WP_PHP_INI= \
  LEARN_TARGET=production LEARN_FORCE=topics \
  LEARN_REPORT_DIR="$(mktemp -d)" \
  bash "$PKG/seed/learn-trial/seed-trial.sh" >"$(mktemp)" 2>"$force_err"
force_code=$?
set -e
RUN_CODE="$force_code"
RUN_EVAL=0
RUN_ERR="$(cat "$force_err")"
expect_refuse "LEARN_FORCE is refused before a production seed"

run_seed "https://www.fides.community" production
if [[ "$RUN_CODE" -eq 0 && "$RUN_EVAL" -eq 1 ]] && printf '%s' "$RUN_OUT" | grep -q 'mode: dry-run'; then
  ok "www production dry-run passes the host gate and does not apply"
else
  bad "www production gate (exit $RUN_CODE eval $RUN_EVAL)"
  note "$RUN_ERR"
  note "$RUN_OUT"
fi

ledger="$(mktemp)"
printf 'host\texample\ninstall\ttest\n' > "$ledger"
run_rollback() {
  local home="$1"
  local target="${2:-}"
  local log err
  log="$(mktemp)"
  err="$(mktemp)"
  set +e
  STUB_HOME="$home" WP_STUB_LOG="$log" \
    WP_PATH="$site" WP_CLI="$stub/wp" WP_PHP= WP_PHP_INI= \
    LEARN_TARGET="$target" \
    LEARN_LEDGER="$ledger" \
    bash "$PKG/seed/learn-trial/rollback-trial.sh" >"$(mktemp)" 2>"$err"
  RUN_CODE=$?
  set -e
  RUN_ERR="$(cat "$err")"
  if grep -q REACHED_EVAL "$log"; then RUN_EVAL=1; else RUN_EVAL=0; fi
}
run_rollback "https://fides.community" staging
expect_refuse "rollback refuses production when the target is staging"
run_rollback "https://www.fides.community"
expect_refuse "rollback refuses www without LEARN_TARGET=production"
run_rollback "https://fides.community" production
if [[ "$RUN_CODE" -eq 0 && "$RUN_EVAL" -eq 1 ]]; then
  ok "production rollback dry-run passes the host gate"
else
  bad "production rollback gate (exit $RUN_CODE eval $RUN_EVAL)"
  note "$RUN_ERR"
fi
run_rollback "https://staging.fides.community"
expect_refuse "rollback refuses staging without LEARN_TARGET"

# Real dry-run against the local production copy. The helper below only
# locates WP-CLI on this machine. The package script does not source it.
# shellcheck disable=SC1091
source "$HERE/../env.sh"
export WP_PHP="$PHP_BIN" WP_PHP_INI="$PHP_INI" WP_CLI="$WP_CLI_PHAR"
export WP_PATH="$SOURCE_SITE"
unset LEARN_APPLY LEARN_FORCE LEARN_TARGET LEARN_TRIAL_INSTALL || true
export LEARN_REPORT_DIR="$(mktemp -d)"
real_out="$(mktemp)"
real_err="$(mktemp)"
set +e
bash "$PKG/seed/learn-trial/seed-trial.sh" >"$real_out" 2>"$real_err"
real_code=$?
set -e
if [[ "$real_code" -ne 0 ]]; then
  bad "local copy dry-run exited $real_code"
  note "$(cat "$real_err")"
elif grep -E '^(created|would-created|skipped-edited|skipped-unmarked) ' "$real_out" >/dev/null; then
  bad "local copy dry-run would write or skip pages"
  note "$(grep -E '^(created|would-created|skipped-|SUMMARY|GLOSSARY)' "$real_out")"
elif ! grep -q '^SUMMARY ' "$real_out"; then
  bad "local copy dry-run has no summary"
else
  ok "local copy dry-run: $(grep '^SUMMARY ' "$real_out")"
  if grep -q 'GLOSSARY-MISSING' "$real_out"; then
    note "$(grep '^GLOSSARY-MISSING' "$real_out")"
  fi
fi

pilot_err="$(mktemp)"
set +e
WP_PATH="$PILOT_SITE" bash "$PKG/seed/learn-trial/seed-trial.sh" >"$(mktemp)" 2>"$pilot_err"
pilot_code=$?
set -e
if [[ "$pilot_code" -eq 0 ]] || ! grep -q 'Refusing' "$pilot_err"; then
  bad "design pilot was not refused"
  note "$(cat "$pilot_err")"
else
  ok "design pilot path refused"
fi

path_root="$(mktemp -d)"
mkdir -p "$path_root/wp"
echo '<?php' > "$path_root/wp-config.php"
echo '<?php' > "$path_root/wp/wp-load.php"
if WP_PATH="$path_root/wp" bash -c "source '$PKG/seed/learn-trial/wp.sh'; learn_trial_require_wp_path"; then
  ok "core directory with parent wp-config.php is accepted"
else
  bad "parent wp-config layout refused"
fi
classic="$(mktemp -d)"
echo '<?php' > "$classic/wp-config.php"
if WP_PATH="$classic" bash -c "source '$PKG/seed/learn-trial/wp.sh'; learn_trial_require_wp_path"; then
  ok "wp-config.php inside WP_PATH is still accepted"
else
  bad "classic WP_PATH refused"
fi
empty="$(mktemp -d)"
if WP_PATH="$empty" bash -c "source '$PKG/seed/learn-trial/wp.sh'; learn_trial_require_wp_path"; then
  bad "empty WP_PATH was accepted"
else
  ok "WP_PATH without wp-config.php or parent config is refused"
fi
rm -rf "$stub" "$site" "$path_root" "$classic" "$empty"
if [[ "$fail" -ne 0 ]]; then
  exit 1
fi
echo "target checks passed"
