#!/usr/bin/env bash
# Seed behaviour for the five country pages under Around the world (India, Canada, United States, Honduras, Ethiopia):
# the real manifest entries and content files are seeded into a throwaway tree (/fides-design-pilot/learn-countries-tmp/),
# never into the real Learn pages. Proves the seed creates the overview plus five pages, is idempotent, skips an edited copy
# (also in dry-run) and an unmarked page, and never forces. Static checks cover unique paths, source format, Learn more (2-4 links),
# no unavailable destinations and the overview rows.
# Run: bash tests/around-world-countries-seed.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$HERE/env.sh"
WORK="$HERE/tests/output/around-world-countries-seed"
rm -rf "$WORK"; mkdir -p "$WORK"
fail=0
expect() { if [[ "$2" == "$1" ]]; then echo "ok   $3: $2"; else echo "FAIL $3: expected $1, got $2"; fail=1; fi; }
yes_() { if [[ "$1" == "1" ]]; then echo "ok   $2"; else echo "FAIL $2"; fail=1; fi; }

python3 - "$HERE" "$WORK" <<'PY'
import json, sys, re, pathlib
here, work = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
m = json.loads((here / "learn/manifest.json").read_text())
keyed = [(p.get("tree", "learn"), p["path"]) for p in m["pages"]]
assert [k for k in set(keyed) if keyed.count(k) > 1 and k[1] != ""] == [], "paths are unique per tree"
HUB = "topics/around-the-world"
SLUGS = ["india", "canada", "united-states", "honduras", "ethiopia"]
hub = [p for p in m["pages"] if p["path"] == HUB][0]
overview = (here / "learn/content" / hub["content"]).read_text()
entries = []
for s in SLUGS:
    es = [p for p in m["pages"] if p["path"] == f"{HUB}/{s}"]
    assert len(es) == 1, f"exactly one manifest entry for {s}"
    e = es[0]
    assert e["kind"] == "article" and e["eyebrow"] == "Country · Around the world", f"{s}: kind and eyebrow"
    assert e["content"] == f"{s}.html" and (here / "learn/content" / e["content"]).is_file() and e["excerpt"].strip(), f"{s}: content and excerpt"
    lines = e.get("sources", "").splitlines()
    assert 2 <= len(lines) <= 4, f"{s}: two to four sources"
    for line in lines:
        assert re.match(r"^[^|]+ · [^|]+, consulted 13 November 2026 \| https://\S+$", line.strip()), f"{s}: source line format: {line}"
    urls = [l.split("|")[-1].strip() for l in lines]
    assert len(urls) == len(set(urls)), f"{s}: no duplicate source URLs"
    body = (here / "learn/content" / e["content"]).read_text()
    assert not re.search(r"localhost|127\.0\.0\.1|issuer-catalog|relying-party-websites|interop-profiles|interop-matrix", body), f"{s}: no unavailable destination"
    assert "Content last checked: 13 November 2026" in body and "Responsible source" in body, f"{s}: check date and responsible source"
    assert "Design preview" not in body and "Coming soon" not in body, f"{s}: no placeholder"
    assert not re.search(r"<p>(A|An|The)\s*<", body) and not re.search(r"<li>(A|An|The)\s*<", body), f"{s}: no lone article opener"
    ln = re.search(r"Learn more.*?<!-- /wp:list -->", body, re.S)
    assert ln and 2 <= ln.group(0).count("<li>") <= 4, f"{s}: Learn more has 2-4 links"
    assert f'<a href="{{{{learn}}}}/{HUB}/{s}/">' in overview, f"overview links to {s}"
    entries.append((s, e))
used = [p["content"] for p in m["pages"]]
assert len(used) == len(set(used)) and {f.name for f in (here / "learn/content").glob("*.html")} == set(used), "content files match the manifest"
d = work / "tree"; (d / "content").mkdir(parents=True)
h = dict(hub); h["path"] = ""
pages = [h]; (d / "content" / h["content"]).write_text(overview)
for s, e in entries:
    c = dict(e); c["path"] = s; pages.append(c)
    (d / "content" / e["content"]).write_text((here / "learn/content" / e["content"]).read_text())
(d / "manifest.json").write_text(json.dumps({"version": 1, "note": "throwaway", "pages": pages}))
print(f"ok   static manifest/content checks ({len(m['pages'])} manifest pages)")
PY

seed_all() { pilot_wp eval-file "$HERE/create-learn-pages.php" 2>&1 | grep -E '^(created|updated|unchanged|skipped|would|forced|error)' | awk '{print $1}' | sort | uniq -c | awk '{printf "%s%s=%s", s, $2, $1; s=" "}'; }

tmp=learn-countries-tmp
export LEARN_SEED_DIR="$WORK/tree" LEARN_BASE="fides-design-pilot/$tmp" LEARN_BACKUP_DIR="$WORK/backup"
expect "created=6" "$(seed_all)" "first seed creates the overview and five pages"
expect "unchanged=6" "$(seed_all)" "second seed changes nothing (idempotent)"
PARENT=$(pilot_wp post list --post_type=page --name="$tmp" --field=ID)
ID=$(pilot_wp post list --post_type=page --post_parent="$PARENT" --name=ethiopia --field=ID)
[[ -n "$ID" ]] || { echo "FAIL throwaway page not found"; exit 1; }
expect article "$(pilot_wp post meta get "$ID" _fides_learn_kind)" "article kind"
yes_ "$(pilot_wp post get "$ID" --field=post_content | grep -q '{{' && echo 0 || echo 1)" "no unreplaced {{token}} in the stored content"
yes_ "$(pilot_wp post meta get "$ID" _fides_learn_sources | grep -q ' · ' && echo 1 || echo 0)" "sources are stored"
pilot_wp post update "$ID" --post_content="$(pilot_wp post get "$ID" --field=post_content)<!-- editor note -->" >/dev/null
expect "skipped-edited=1 unchanged=5" "$(seed_all)" "edited page is skipped, the others stay unchanged"
expect "skipped-edited=1 unchanged=5" "$(LEARN_DRY_RUN=1 seed_all)" "same, dry-run"
yes_ "$(pilot_wp post get "$ID" --field=post_content | grep -q 'editor note' && echo 1 || echo 0)" "edited body survived the re-seed"
pilot_wp post meta delete "$ID" _fides_learn_seed >/dev/null
expect "skipped-unmarked=1 unchanged=5" "$(seed_all)" "page without seed marker is skipped"
for c in $(pilot_wp post list --post_type=page --post_parent="$PARENT" --field=ID); do pilot_wp post delete "$c" --force >/dev/null; done
pilot_wp post delete "$PARENT" --force >/dev/null
echo "cleanup: throwaway tree $tmp deleted"
yes_ "$([[ "$(pilot_wp post list --post_type=page --post_status=publish --name=india --field=ID | wc -l | tr -d ' ')" -le 1 ]] && echo 1 || echo 0)" "no stray copy of a real page was created"
[[ $fail -eq 0 ]] && echo "RESULT pass" || { echo "RESULT fail"; exit 1; }
