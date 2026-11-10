#!/usr/bin/env bash
# Prove that create-learn-pages.sh never overwrites editorial changes:
# edited pages and unmarked pages are skipped and reported, a dry run writes
# nothing, and only an explicit LEARN_FORCE replaces a page (after saving it).
# Leaves the pilot as it found it (all Learn pages back at their seeded state).
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/../env.sh"
SEED="$HERE/../create-learn-pages.sh"
FAIL=0
ok()  { echo "ok - $1"; }
bad() { echo "not ok - $1"; FAIL=$((FAIL+1)); }
expect() { if [[ "$2" == *"$3"* ]]; then ok "$1"; else bad "$1 (wanted '$3')"; echo "$2" | sed 's/^/    /'; fi; }
refute() { if [[ "$2" == *"$3"* ]]; then bad "$1 (found '$3')"; else ok "$1"; fi; }
page_id() { pilot_wp eval "\$p = get_page_by_path('$1', OBJECT, 'page'); echo \$p ? \$p->ID : '';"; }
export LEARN_BACKUP_DIR="${LEARN_BACKUP_DIR:-$(mktemp -d)/learn-replaced}"

BASE=fides-design-pilot/learn
ID_BIG="$(page_id $BASE/topics/the-big-picture)"
ID_TOPICS="$(page_id $BASE/topics)"
ID_ART="$(page_id $BASE/topics/the-big-picture/how-credentials-connect)"
[[ -n "$ID_BIG" && -n "$ID_TOPICS" && -n "$ID_ART" ]] || { echo "Seed the pilot first (create-learn-pages.sh)."; exit 1; }

out="$("$SEED" 2>&1)"; expect "baseline: every page unchanged" "$out" '"unchanged":18'

# Editor changes: body text, a title and a Learn field.
pilot_wp post update "$ID_BIG" --post_content="$(pilot_wp post get "$ID_BIG" --field=post_content)<!-- editor note -->" >/dev/null
pilot_wp post update "$ID_TOPICS" --post_title="Topics (edited)" >/dev/null
pilot_wp post meta update "$ID_ART" _fides_learn_eyebrow "Edited label" >/dev/null

out="$(LEARN_DRY_RUN=1 "$SEED" 2>&1)"
expect "dry run reports edited pages" "$out" "skipped-edited"
[[ "$(pilot_wp post get "$ID_TOPICS" --field=post_title)" == "Topics (edited)" ]] && ok "dry run wrote nothing" || bad "dry run wrote nothing"

out="$("$SEED" 2>&1)"
expect "edited body is skipped and reported" "$out" "page $ID_BIG changed since seed: content"
expect "edited title is skipped and reported" "$out" "page $ID_TOPICS changed since seed: title"
expect "edited Learn field is skipped and reported" "$out" "meta:eyebrow"
[[ "$(pilot_wp post get "$ID_BIG" --field=post_content)" == *"editor note"* ]] && ok "edited body survived the re-seed" || bad "edited body survived the re-seed"
[[ "$(pilot_wp post get "$ID_TOPICS" --field=post_title)" == "Topics (edited)" ]] && ok "edited title survived the re-seed" || bad "edited title survived the re-seed"
[[ "$(pilot_wp post meta get "$ID_ART" _fides_learn_eyebrow)" == "Edited label" ]] && ok "edited Learn field survived the re-seed" || bad "edited Learn field survived the re-seed"

# Unmarked page at the route of a second tree: never touched.
TEST_BASE=fides-design-pilot/learn-seedtest
UNMARKED="$(pilot_wp post create --post_type=page --post_status=publish --post_title="Hand made" --post_name=learn-seedtest --post_parent="$(page_id fides-design-pilot)" --post_content="hand written" --porcelain)"
out="$(LEARN_BASE=$TEST_BASE "$SEED" 2>&1)"
expect "unmarked page is skipped and reported" "$out" "skipped-unmarked"
[[ "$(pilot_wp post get "$UNMARKED" --field=post_content)" == "hand written" ]] && ok "unmarked page content untouched" || bad "unmarked page content untouched"
[[ -z "$(pilot_wp post meta get "$UNMARKED" _fides_learn_seed 2>/dev/null)" ]] && ok "unmarked page got no seed marker" || bad "unmarked page got no seed marker"

# Explicit forced replacement, one page: previous state saved first.
out="$(LEARN_FORCE=topics/the-big-picture "$SEED" 2>&1)"
expect "forced replacement of the chosen page" "$out" "forced"
expect "other edited pages stay skipped" "$out" "page $ID_TOPICS changed since seed"
saved="$(grep -l "editor note" "$LEARN_BACKUP_DIR"/*.json 2>/dev/null | head -1)"
[[ -n "$saved" ]] && ok "previous state saved before replacing" || bad "previous state saved before replacing"
refute "forced page is back at the seeded content" "$(pilot_wp post get "$ID_BIG" --field=post_content)" "editor note"

# Editorial links option: an editor change is skipped and reported; only an explicit force restores it.
pilot_wp option patch update fides_ds_editorial_links entries "wallet-overview:organizational" title "Edited by an editor" >/dev/null 2>&1 \
  || pilot_wp eval "\$o = get_option('fides_ds_editorial_links'); \$o['entries']['wallet-overview:organizational']['title'] = 'Edited by an editor'; update_option('fides_ds_editorial_links', \$o);" >/dev/null
out="$("$SEED" 2>&1)"
expect "edited editorial links are skipped and reported" "$out" "skipped-edited"
[[ "$(pilot_wp eval "\$o = get_option('fides_ds_editorial_links'); echo \$o['entries']['wallet-overview:organizational']['title'];")" == "Edited by an editor" ]] && ok "edited editorial link survived the re-seed" || bad "edited editorial link survived the re-seed"
out="$(LEARN_FORCE=editorial-links "$SEED" 2>&1)"
expect "editorial links replaced only on an explicit force" "$out" "forced"
[[ "$(pilot_wp eval "\$o = get_option('fides_ds_editorial_links'); echo \$o['entries']['wallet-overview:organizational']['title'];")" == "New to business wallets?" ]] && ok "editorial links back at the seeded state" || bad "editorial links back at the seeded state"
ls "$LEARN_BACKUP_DIR"/*editorial-links.json >/dev/null 2>&1 && ok "editorial links saved before the force" || bad "editorial links saved before the force"

# Cleanup: restore the remaining edited pages explicitly, remove the test tree.
LEARN_FORCE="topics,topics/the-big-picture/how-credentials-connect" "$SEED" >/dev/null 2>&1
pilot_wp eval "foreach (get_posts(array('post_type'=>'page','post_status'=>'any','numberposts'=>-1,'meta_key'=>'_fides_learn_seed')) as \$p) { if (strpos((string) get_post_meta(\$p->ID, '_fides_learn_seed', true), '$TEST_BASE') === 0) wp_delete_post(\$p->ID, true); } wp_delete_post($UNMARKED, true);" >/dev/null
out="$("$SEED" 2>&1)"; expect "pilot restored: every page unchanged" "$out" '"unchanged":18'
[[ "$(pilot_wp eval "echo count(get_posts(array('post_type'=>'page','post_status'=>'any','numberposts'=>-1,'meta_key'=>'_fides_learn_seed')));")" == "17" ]] && ok "test tree removed (seventeen seeded pages remain)" || bad "test tree removed"

echo "# fail $FAIL"
exit $((FAIL>0 ? 1 : 0))
