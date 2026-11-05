#!/usr/bin/env bash
# Local rehearsal of the staging install: a second, throw-away WordPress at http://localhost:10089 that is built
# ONLY from the staging package (plugin zips, non-git zips, config mu-plugin, seed scripts), on a scratch database
# cloned from the pilot database with all pilot pages and options removed (a stand-in for "staging before the pilot").
# It never contacts staging and never touches the pilot site or its database.
#
#   rehearse-staging.sh [package dir]      default: staging-package/latest
#   KEEP=1 rehearse-staging.sh ...         leave the rehearsal site and server running afterwards
#   rehearse-staging.sh --teardown         stop the server, drop the scratch database, delete the rehearsal files
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/../env.sh"

RE_ROOT="$PILOT_ROOT/rehearsal"
RE_SITE="$RE_ROOT/wordpress"
RE_DB="${RE_DB:-fides_design_review_rehearsal}"
RE_PORT="${RE_PORT:-10089}"
RE_URL="http://localhost:$RE_PORT"
RE_PID="$RE_ROOT/server.pids"
BASE_SEG="design-review"
re_wp() { "$PHP_BIN" -c "$PHP_INI" -d xdebug.mode=off -d memory_limit=1024M "$WP_CLI_PHAR" --path="$RE_SITE" "$@"; }

stop_server() {
  if [[ -f "$RE_PID" ]]; then
    while read -r pid; do [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true; done < "$RE_PID"
    rm -f "$RE_PID"
  fi
}

if [[ "${1:-}" == "--teardown" ]]; then
  stop_server
  pilot_mysql -e "DROP DATABASE IF EXISTS \`$RE_DB\`"
  rm -rf "$RE_ROOT"
  echo "Rehearsal removed (database $RE_DB, $RE_ROOT)."
  exit 0
fi

PKG="${1:-$PILOT_ROOT/staging-package/latest}"
PKG="$(cd "$PKG" && pwd -P)"
[[ -f "$PKG/manifest.json" ]] || { echo "Not a package: $PKG" >&2; exit 1; }
(cd "$PKG" && shasum -a 256 -c SHA256SUMS --quiet) || { echo "Package checksum mismatch" >&2; exit 1; }
FAIL=0; ok() { echo "ok - $1"; }; bad() { echo "not ok - $1"; FAIL=$((FAIL+1)); }

echo "== 1. Build the rehearsal site from the package ($PKG)"
stop_server
rm -rf "$RE_ROOT"; mkdir -p "$RE_SITE"
rsync -a --exclude='wp-content' --exclude='wp-config.php' "$PILOT_SITE/" "$RE_SITE/"       # real copies: symlinked core files would resolve back to the pilot
mkdir -p "$RE_SITE/wp-content/plugins" "$RE_SITE/wp-content/themes" "$RE_SITE/wp-content/mu-plugins"
PILOT_SLUGS="fides-community-tools-tiles fides-use-case-catalog fides-organization-catalog fides-wallet-catalog fides-credential-catalog fides-vocabulary-glossary fides-template-pilot"
for item in "$PILOT_SITE/wp-content/plugins/"*; do                                          # third-party plugins: links to the existing copies (read only)
  name="$(basename "$item")"
  case " $PILOT_SLUGS " in *" $name "*) continue;; esac
  [[ -e "$item" ]] && ln -s "$(python3 -c 'import os,sys;print(os.path.realpath(sys.argv[1]))' "$item")" "$RE_SITE/wp-content/plugins/$name" 2>/dev/null || true
done
for item in "$PILOT_SITE/wp-content/themes/"*; do
  name="$(basename "$item")"; [[ "$name" == "blocksy-child" ]] && continue
  [[ -e "$item" ]] && ln -s "$(python3 -c 'import os,sys;print(os.path.realpath(sys.argv[1]))' "$item")" "$RE_SITE/wp-content/themes/$name" 2>/dev/null || true
done
for dir in uploads languages; do [[ -e "$PILOT_SITE/wp-content/$dir" ]] && ln -s "$(cd "$PILOT_SITE/wp-content/$dir" && pwd -P)" "$RE_SITE/wp-content/$dir"; done
cp "$PILOT_SITE/wp-content/index.php" "$RE_SITE/wp-content/index.php" 2>/dev/null || true
PKG_PLUGINS=0
for z in "$PKG"/plugins/*.zip "$PKG"/non-git/plugins/*.zip; do unzip -q -o "$z" -d "$RE_SITE/wp-content/plugins"; PKG_PLUGINS=$((PKG_PLUGINS+1)); done
for z in "$PKG"/non-git/themes/*.zip; do unzip -q -o "$z" -d "$RE_SITE/wp-content/themes"; done
cp "$PKG/mu-plugins/fides-design-review-config.php" "$RE_SITE/wp-content/mu-plugins/"
echo "installed $PKG_PLUGINS plugin zips, the child theme and the config mu-plugin"

echo "== 2. Scratch database and config"
pilot_mysql -e "DROP DATABASE IF EXISTS \`$RE_DB\`; CREATE DATABASE \`$RE_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
"$MYSQL_BIN_DIR/mysqldump" -uroot -proot -S "$MYSQL_SOCK" --single-transaction --no-tablespaces "$PILOT_DB" 2>/dev/null | pilot_mysql "$RE_DB"
"$PHP_BIN" -c "$PHP_INI" -d xdebug.mode=off -r '
  [$src, $dst, $db, $url] = array_slice($argv, 1);
  $c = file_get_contents($src);
  $c = preg_replace("/define\(\s*.DB_NAME.\s*,\s*.[^\x27\"]*.\s*\);/", "define( \x27DB_NAME\x27, \x27" . $db . "\x27 );", $c);
  $c = preg_replace("/define\(\s*.WP_HOME.\s*,[^;]*;/", "define( \x27WP_HOME\x27, \x27" . $url . "\x27 );", $c);
  $c = preg_replace("/define\(\s*.WP_SITEURL.\s*,[^;]*;/", "define( \x27WP_SITEURL\x27, \x27" . $url . "\x27 );", $c);
  $c = preg_replace("/define\(\s*.FIDES_DESIGN_PILOT.\s*,[^;]*;\n?/", "", $c);
  $c = preg_replace("/define\(\s*.WP_ENVIRONMENT_TYPE.\s*,[^;]*;/", "define( \x27WP_ENVIRONMENT_TYPE\x27, \x27staging\x27 );", $c);
  file_put_contents($dst, $c);
' "$PILOT_SITE/wp-config.php" "$RE_SITE/wp-config.php" "$RE_DB" "$RE_URL"
[[ "$(re_wp config get DB_NAME)" == "$RE_DB" ]] && ok "rehearsal uses database $RE_DB (not the pilot database)" || { bad "rehearsal config"; exit 1; }
[[ "$(re_wp eval 'echo ABSPATH;')" == "$RE_SITE/" ]] && ok "ABSPATH is the rehearsal copy" || { bad "ABSPATH points elsewhere"; exit 1; }
re_wp search-replace "http://localhost:10088" "$RE_URL" --all-tables --skip-columns=guid --quiet
# A staging site before the pilot: no pilot pages, no pilot options.
re_wp eval '
  $ids = get_posts(array("post_type" => "page", "post_status" => "any", "numberposts" => -1, "fields" => "ids", "meta_key" => "_fides_design_pilot"));
  foreach ($ids as $id) { wp_delete_post($id, true); }
  foreach (array("fides_use_case_featured", "fides_ds_updates", "fides_ds_editorial_links", "fides_ds_editorial_links_seed") as $o) { delete_option($o); }
  echo count($ids) . " pilot pages and the pilot options removed\n";'
re_wp plugin activate fides-community-tools-tiles fides-use-case-catalog fides-organization-catalog fides-wallet-catalog fides-credential-catalog fides-vocabulary-glossary >/dev/null 2>&1 || true
re_wp rewrite flush >/dev/null 2>&1 || true

echo "== 3. Start the rehearsal server on $RE_URL"
export PHP_CLI_SERVER_WORKERS=6
"$PHP_BIN" -c "$PHP_INI" -d xdebug.mode=off -S "127.0.0.1:$RE_PORT" -t "$RE_SITE" "$HERE/../router.php" >"$RE_ROOT/server.log" 2>&1 &
echo $! > "$RE_PID"
"$PHP_BIN" -c "$PHP_INI" -d xdebug.mode=off -S "[::1]:$RE_PORT" -t "$RE_SITE" "$HERE/../router.php" >>"$RE_ROOT/server.log" 2>&1 &
echo $! >> "$RE_PID"
[[ "${KEEP:-0}" == "1" ]] || trap 'stop_server' EXIT
for _ in $(seq 1 30); do curl -s -o /dev/null "$RE_URL/" && break; sleep 1; done
curl -s -o /dev/null -w "front page HTTP %{http_code}\n" "$RE_URL/"

RE_WP="$(printf "%q " "$PHP_BIN" -c "$PHP_INI" -d xdebug.mode=off -d memory_limit=1024M "$WP_CLI_PHAR" --path="$RE_SITE")"
SEED="env WP=$(printf %q "$RE_WP") PILOT_BACKUP_DIR=$(printf %q "$RE_ROOT/backups") bash $(printf %q "$PKG/seed/seed.sh")"
run_seed() { eval "$SEED $1"; }

echo "== 4. Preflight, dry-run, apply, repeat"
out="$(run_seed preflight 2>&1 || true)"; echo "$out" | tail -40
echo "$out" | grep -q '^SUMMARY' && ok "preflight ran" || bad "preflight ran"
run_seed dry-run 2>&1 | tail -30 > "$RE_ROOT/dry-run.txt"; grep -q 'would-created' "$RE_ROOT/dry-run.txt" && ok "dry-run lists pages it would create" || bad "dry-run lists pages"
[[ "$(re_wp eval 'echo count(get_posts(array("post_type"=>"page","post_status"=>"any","numberposts"=>-1,"meta_key"=>"_fides_pilot_seed")));')" == "0" ]] && ok "dry-run wrote nothing" || bad "dry-run wrote pages"
out="$(run_seed apply 2>&1)"; echo "$out" | grep -E "^(created|SUMMARY|skipped|error)" | head -60
echo "$out" | grep -q 'error' && bad "apply reported an error" || ok "apply finished without errors"
out2="$(run_seed apply 2>&1)"; echo "$out2" | grep '^SUMMARY'
echo "$out2" | grep -E '^SUMMARY' | grep -vq '"created"' && ok "second apply creates nothing (idempotent)" || bad "second apply created pages"

echo "== 5. Editorial changes survive a re-seed"
EDIT_ID="$(re_wp eval 'echo get_page_by_path("'$BASE_SEG'/about-fides")->ID;')"
LEARN_ID="$(re_wp eval 'echo get_page_by_path("'$BASE_SEG'/learn/topics")->ID;')"
re_wp eval "wp_update_post(array('ID' => $EDIT_ID, 'post_content' => get_post_field('post_content', $EDIT_ID) . \"\n<!-- editor change -->\"));
            wp_update_post(array('ID' => $LEARN_ID, 'post_title' => 'Topics (edited on staging)'));"
out3="$(run_seed apply 2>&1)"; echo "$out3" | grep -E 'skipped-edited'
echo "$out3" | grep -q "skipped-edited.*$BASE_SEG/about-fides" && ok "edited pilot page is skipped and reported" || bad "edited pilot page not reported"
echo "$out3" | grep -qi "skipped-edited.*topics" && ok "edited Learn page is skipped and reported" || bad "edited Learn page not reported"
[[ "$(re_wp eval "echo strpos(get_post_field('post_content', $EDIT_ID), 'editor change') !== false ? 'kept' : 'lost';")" == "kept" ]] && ok "editor change is still in the page" || bad "editor change was overwritten"
[[ "$(re_wp eval "echo get_the_title($LEARN_ID);")" == "Topics (edited on staging)" ]] && ok "edited Learn title is kept" || bad "Learn title overwritten"
re_wp eval 'update_option("fides_use_case_featured", array("primary" => "editor-choice", "fallback" => ""));' >/dev/null
run_seed apply >/dev/null 2>&1
[[ "$(re_wp eval 'echo get_option("fides_use_case_featured")["primary"];')" == "editor-choice" ]] && ok "an editor's featured use case is kept" || bad "featured option overwritten"
# A page at a pilot path without a marker is never replaced on a non-local site.
re_wp eval "wp_delete_post(get_page_by_path('$BASE_SEG/manifesto')->ID, true); wp_insert_post(array('post_type'=>'page','post_status'=>'publish','post_title'=>'Manifesto placeholder (not seeded)','post_name'=>'manifesto','post_parent'=>get_page_by_path('$BASE_SEG')->ID,'post_content'=>'placeholder'));" >/dev/null
out4="$(run_seed apply 2>&1)"; echo "$out4" | grep -E 'skipped-unmarked'
echo "$out4" | grep -q "skipped-unmarked.*$BASE_SEG/manifesto" && ok "an unmarked page at a pilot path is kept and reported" || bad "unmarked page not reported"
[[ "$(re_wp eval "echo get_page_by_path('$BASE_SEG/manifesto')->post_content;")" == "placeholder" ]] && ok "the placeholder content is untouched" || bad "unmarked page was overwritten"
re_wp eval "wp_delete_post(get_page_by_path('$BASE_SEG/manifesto')->ID, true);" >/dev/null
run_seed apply 2>&1 | grep -E "created .*manifesto" >/dev/null && ok "after removing the placeholder the page is seeded again" || bad "manifesto page not recreated"
echo "== 6. Production hosts and unlisted hosts are refused"
r="$(PILOT_ALLOWED_HOSTS=fides.community,www.fides.community re_wp eval 'add_filter("home_url", static function () { return "https://fides.community"; }); require "'$PKG'/seed/staging/seed-guard.php"; fides_pilot_seed_context(); echo "allowed";' 2>&1 || true)"
echo "$r" | grep -q "Refusing to seed the production host" && ok "fides.community is refused even when listed in PILOT_ALLOWED_HOSTS" || bad "production host not refused ($r)"
r="$(PILOT_ALLOWED_HOSTS=example.org run_seed dry-run 2>&1 || true)"
echo "$r" | grep -q "not in PILOT_ALLOWED_HOSTS" && ok "a host outside PILOT_ALLOWED_HOSTS is refused" || bad "unlisted host not refused"

echo "== 7. External actions stay off"
re_wp option update home "$RE_URL" >/dev/null; re_wp option update siteurl "$RE_URL" >/dev/null
r="$(re_wp eval 'echo is_wp_error(wp_remote_post("https://api.github.com/repos/x/y/pulls", array("body" => "{}"))) ? "blocked" : "sent";')"
[[ "$r" == "blocked" ]] && ok "write request to GitHub is blocked" || bad "GitHub write not blocked ($r)"
r="$(re_wp eval 'echo is_wp_error(wp_remote_post("https://fides.community/wp-json/x", array("body" => "{}"))) ? "blocked" : "sent";')"
[[ "$r" == "blocked" ]] && ok "write request to the production site is blocked" || bad "production write not blocked ($r)"
r="$(re_wp eval 'echo wp_mail("someone@example.org", "x", "y") ? "sent" : "not sent";')"
[[ "$r" == "not sent" ]] && ok "wp_mail sends nothing" || bad "mail was sent"

echo "== 8. Browser checks on $RE_URL/$BASE_SEG/"
export PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-/Users/victorvanderhulst/Projects/untp-demo/node_modules/playwright}"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/Library/Caches/ms-playwright}"
if PILOT_URL="$RE_URL" PILOT_BASE="$BASE_SEG" node "$PKG/checks/rehearsal-checks.cjs" 2>&1 | tee "$RE_ROOT/browser.txt" | grep -E "^not ok|rehearsal checks"; then :; fi
grep -q "all rehearsal checks passed" "$RE_ROOT/browser.txt" && ok "browser checks passed ($(grep -c '^ok' "$RE_ROOT/browser.txt") checks)" || bad "browser checks failed"

echo
echo "# rehearsal fail $FAIL"
exit $((FAIL>0 ? 1 : 0))
