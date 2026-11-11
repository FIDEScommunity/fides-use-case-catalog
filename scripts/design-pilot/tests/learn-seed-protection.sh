#!/usr/bin/env bash
# Targeted check: the Learn seed leaves an edited page alone (also in dry-run) and never
# forces it. Uses one throwaway page at /fides-design-pilot/learn-seed-protection-tmp/,
# never the real articles, and deletes it at the end.
# Run: bash tests/learn-seed-protection.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$HERE/env.sh"
WORK="$HERE/tests/output/seed-protection"
rm -rf "$WORK"; mkdir -p "$WORK/content"
printf '<!-- wp:paragraph -->\n<p>Seeded text.</p>\n<!-- /wp:paragraph -->\n' > "$WORK/content/tmp.html"
cat > "$WORK/manifest.json" <<'JSON'
{"version":1,"note":"throwaway","pages":[{"path":"","title":"Seed protection test","kind":"article","excerpt":"Temporary.","content":"tmp.html","menu_order":0}]}
JSON
export LEARN_SEED_DIR="$WORK" LEARN_BASE="fides-design-pilot/learn-seed-protection-tmp" LEARN_BACKUP_DIR="$WORK/backup"
seed() { pilot_wp eval-file "$HERE/create-learn-pages.php" 2>&1 | grep -E '^(created|updated|unchanged|skipped|would|forced|error)' | awk '{print $1}'; }
fail=0
expect() { if [[ "$2" == "$1" ]]; then echo "ok   $3: $2"; else echo "FAIL $3: expected $1, got $2"; fail=1; fi; }

expect created   "$(seed)" "first seed"
expect unchanged "$(seed)" "second seed, nothing changed"
ID=$(pilot_wp post list --post_type=page --name=learn-seed-protection-tmp --field=ID)
# Unedited page, changed seed content => updated.
printf '<!-- wp:paragraph -->\n<p>Seeded text, revised in the repo.</p>\n<!-- /wp:paragraph -->\n' > "$WORK/content/tmp.html"
expect updated   "$(seed)" "repo content changed, page untouched by an editor"
# Editor changes the content => edited.
pilot_wp post update "$ID" --post_content='<p>Edited by an editor.</p>' >/dev/null
expect skipped-edited "$(seed)" "editor changed post_content"
expect skipped-edited "$(LEARN_DRY_RUN=1 seed)" "same, dry-run"
pilot_wp post get "$ID" --field=post_content | grep -q "Edited by an editor" && echo "ok   edited content still in the database" || { echo "FAIL edited content lost"; fail=1; }
# A different kind of edit: an editorial field.
pilot_wp post update "$ID" --post_content="$(cat "$WORK/content/tmp.html")" >/dev/null
pilot_wp post meta update "$ID" _fides_learn_sources 'Example | https://example.org/' >/dev/null
expect skipped-edited "$(seed)" "editor changed a Learn field (Sources)"
pilot_wp post delete "$ID" --force >/dev/null
echo "cleanup: throwaway page $ID deleted"
[[ $fail -eq 0 ]] && echo "RESULT pass" || { echo "RESULT fail"; exit 1; }
