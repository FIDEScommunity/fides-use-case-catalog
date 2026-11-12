#!/usr/bin/env bash
# Seed behaviour for the Ecosystem roles overview: the real manifest entry and content file
# are seeded into ONE throwaway tree (/fides-design-pilot/learn-ecosystem-roles-tmp/), never into the
# real Learn pages. Proves the seed is idempotent, skips an edited copy (also in dry-run), reports
# an unmarked page, never forces, and that the real manifest/content contain the expected links.
# Run: bash tests/ecosystem-roles-seed.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$HERE/env.sh"
WORK="$HERE/tests/output/ecosystem-roles-seed"
rm -rf "$WORK"; mkdir -p "$WORK/content"
fail=0
expect() { if [[ "$2" == "$1" ]]; then echo "ok   $3: $2"; else echo "FAIL $3: expected $1, got $2"; fail=1; fi; }
yes_() { if [[ "$1" == "1" ]]; then echo "ok   $2"; else echo "FAIL $2"; fail=1; fi; }

# 1. Static: the real manifest entry and the links to and from the overview.
python3 - "$HERE" "$WORK" <<'PY'
import json, sys, re, pathlib
here, work = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
m = json.loads((here / "learn/manifest.json").read_text())
pages = [p for p in m["pages"] if p.get("path") == "topics/ecosystem-roles"]
assert len(pages) == 1, "exactly one manifest entry for topics/ecosystem-roles"
e = pages[0]
assert e["kind"] == "section" and e["content"] == "ecosystem-roles.html", "section kind and content file"
assert (here / "learn/content" / e["content"]).is_file(), "content file exists"
assert len([p for p in m["pages"] if p["content"] == e["content"]]) == 1, "content file used once"
files = sorted((here / "learn/content").glob("*.html"))
assert len(files) == len({p["content"] for p in m["pages"]}), "every content file is in the manifest and the reverse"
# Throwaway manifest: the real entry, seeded at the root of a temporary tree.
t = dict(e); t["path"] = ""
(work / "manifest.json").write_text(json.dumps({"version": 1, "note": "throwaway", "pages": [t]}))
(work / "content" / e["content"]).write_text((here / "learn/content" / e["content"]).read_text())
topics = (here / "learn/content/topics.html").read_text()
assert '<a href="{{learn}}/topics/ecosystem-roles/">Ecosystem roles</a>' in topics, "Topics row links to the overview"
for name in ["how-credentials-connect", "trust-and-interoperability", "what-is-a-digital-wallet", "issuing-credentials-for-wallets", "accepting-information-from-a-wallet"]:
    assert "{{learn}}/topics/ecosystem-roles/" in (here / "learn/content" / f"{name}.html").read_text(), f"{name} links back"
body = (here / "learn/content/ecosystem-roles.html").read_text()
assert not re.search(r"localhost|127\.0\.0\.1|issuer-catalog|relying-party-websites", body), "no local host and no unavailable destination"
print("ok   static manifest/content checks (" + str(len(m["pages"])) + " manifest pages, " + str(len(files)) + " content files)")
PY

export LEARN_SEED_DIR="$WORK" LEARN_BASE="fides-design-pilot/learn-ecosystem-roles-tmp" LEARN_BACKUP_DIR="$WORK/backup"
seed() { pilot_wp eval-file "$HERE/create-learn-pages.php" 2>&1 | grep -E '^(created|updated|unchanged|skipped|would|forced|error)' | awk '{print $1}'; }
expect created   "$(seed)" "first seed creates the page"
expect unchanged "$(seed)" "second seed changes nothing (idempotent)"
ID=$(pilot_wp post list --post_type=page --name=learn-ecosystem-roles-tmp --field=ID)
expect section   "$(pilot_wp post meta get "$ID" _fides_learn_kind)" "page kind"
yes_ "$(pilot_wp post get "$ID" --field=post_content | grep -q '{{' && echo 0 || echo 1)" "no unreplaced {{token}} in the stored content"

# An editor changes the body: the seed leaves it alone, also in dry-run, and does not force.
pilot_wp post update "$ID" --post_content="$(pilot_wp post get "$ID" --field=post_content)<!-- editor note -->" >/dev/null
expect skipped-edited "$(seed)" "editor changed the body"
expect skipped-edited "$(LEARN_DRY_RUN=1 seed)" "same, dry-run"
yes_ "$(pilot_wp post get "$ID" --field=post_content | grep -q 'editor note' && echo 1 || echo 0)" "edited body survived the re-seed"

# An editor changes the title and a Learn field.
pilot_wp post update "$ID" --post_title="Ecosystem roles (edited)" >/dev/null
expect skipped-edited "$(seed)" "editor changed the title"
yes_ "$([[ "$(pilot_wp post get "$ID" --field=post_title)" == "Ecosystem roles (edited)" ]] && echo 1 || echo 0)" "edited title survived the re-seed"

# An unmarked page at the route is never touched.
pilot_wp post meta delete "$ID" _fides_learn_seed >/dev/null
expect skipped-unmarked "$(seed)" "page without seed marker"
yes_ "$(pilot_wp post get "$ID" --field=post_content | grep -q 'editor note' && echo 1 || echo 0)" "unmarked page content untouched"

pilot_wp post delete "$ID" --force >/dev/null
echo "cleanup: throwaway page $ID deleted"
# The real overview is unaffected.
yes_ "$([[ "$(pilot_wp post list --post_type=page --name=ecosystem-roles --post_status=publish --field=ID | wc -l | tr -d ' ')" == "1" ]] && echo 1 || echo 0)" "the real Ecosystem roles page still exists once"
[[ $fail -eq 0 ]] && echo "RESULT pass" || { echo "RESULT fail"; exit 1; }
