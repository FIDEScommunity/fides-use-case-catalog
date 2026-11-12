#!/usr/bin/env bash
# Seed behaviour for Learn > Topics > For governments: the real manifest entries and content files (overview plus four
# articles) are seeded into ONE throwaway tree (/fides-design-pilot/learn-for-governments-tmp/), never into the real
# Learn pages. Proves the seed creates the five pages, stores the series, is idempotent, skips an edited copy (also in
# dry-run) and an unmarked page, and never forces. Static checks cover the manifest entries, sources and content files.
# Run: bash tests/for-governments-seed.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$HERE/env.sh"
WORK="$HERE/tests/output/for-governments-seed"
rm -rf "$WORK"; mkdir -p "$WORK/content"
fail=0
expect() { if [[ "$2" == "$1" ]]; then echo "ok   $3: $2"; else echo "FAIL $3: expected $1, got $2"; fail=1; fi; }
yes_() { if [[ "$1" == "1" ]]; then echo "ok   $2"; else echo "FAIL $2"; fail=1; fi; }

python3 - "$HERE" "$WORK" <<'PY'
import json, sys, re, pathlib
here, work = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
m = json.loads((here / "learn/manifest.json").read_text())
slugs = ["digital-wallets-and-public-services", "issuing-public-information-to-wallets", "accepting-information-from-wallets-in-public-services", "the-eudi-wallet-and-national-implementation"]
hub = [p for p in m["pages"] if p["path"] == "topics/for-governments"]
assert len(hub) == 1, "exactly one manifest entry for topics/for-governments"
hub = hub[0]
assert hub["kind"] == "section" and hub["content"] == "for-governments.html" and hub["title"] == "For governments", "overview: section kind, title and content file"
assert (here / "learn/content" / hub["content"]).is_file() and hub["excerpt"].strip(), "overview: content file and excerpt"
entries = []
for i, s in enumerate(slugs):
    es = [p for p in m["pages"] if p["path"] == f"topics/for-governments/{s}"]
    assert len(es) == 1, f"exactly one manifest entry for {s}"
    e = es[0]
    assert e["kind"] == "article" and e["eyebrow"] == "Explainer · For governments", f"{s}: kind and eyebrow"
    assert e["menu_order"] == i, f"{s}: menu_order {i} (series order)"
    assert e.get("series") == "for-governments", f"{s}: series slug"
    assert e["content"] == f"{s}.html" and (here / "learn/content" / e["content"]).is_file(), f"{s}: content file"
    assert e["excerpt"].strip(), f"{s}: excerpt"
    lines = e.get("sources", "").splitlines()
    assert lines, f"{s}: sources present"
    for line in lines:
        assert re.match(r"^[^|]+ · [^|]+ \| https://\S+$", line.strip()) or re.match(r"^Regulation \(EU\) [^|]+ \| https://\S+$", line.strip()), f"{s}: source line format: {line}"
    assert any("version 0.9.5 (September 2026)" in l and "consulted 12 November 2026" in l and "ictu.github.io/GBO-GO" in l for l in lines), f"{s}: GBO global design source names version, month and consulted date"
    body = (here / "learn/content" / e["content"]).read_text()
    assert not re.search(r"localhost|127\.0\.0\.1|issuer-catalog|relying-party-websites|interop-profiles|interop-matrix", body), f"{s}: no local host/unavailable destination"
    assert "version 0.9.5 (September 2026), a draft design submitted for adoption" in body, f"{s}: draft status wording"
    assert "Content last checked: 12 November 2026" in body, f"{s}: last checked date"
    assert "{{learn}}/topics/for-governments/" in body, f"{s}: links to a sibling or the overview"
    entries.append((s, e))
ov = (here / "learn/content" / hub["content"]).read_text()
for s in slugs: assert f'<a href="{{{{learn}}}}/topics/for-governments/{s}/">' in ov, f"overview links to {s}"
assert "version 0.9.5 (September 2026), a draft design submitted for adoption" in ov, "overview: draft status wording"
assert "Design preview" not in ov and "not available yet" not in ov, "overview has no preview or placeholder text"
topics = (here / "learn/content/topics.html").read_text()
assert '<a href="{{learn}}/topics/for-governments/">For governments</a>' in topics, "Topics row links to the overview"
assert '<strong class="fides-learn-rows__title">For governments</strong>' not in topics, "Topics has no unlinked For governments row left"
# Every content file is in the manifest and each is used once; the count is derived from the manifest.
used = [p["content"] for p in m["pages"]]
files = sorted((here / "learn/content").glob("*.html"))
assert len(used) == len(set(used)), "content files used once"
assert {f.name for f in files} == set(used), "every content file is in the manifest and the reverse"
# Throwaway tree: the real overview at the root of a temporary tree and the four real articles below it.
t = dict(hub); t["path"] = ""
pages = [t]
(work / "content" / hub["content"]).write_text(ov)
for s, e in entries:
    c = dict(e); c["path"] = s
    pages.append(c)
    (work / "content" / e["content"]).write_text((here / "learn/content" / e["content"]).read_text())
(work / "manifest.json").write_text(json.dumps({"version": 1, "note": "throwaway", "pages": pages}))
print(f"ok   static manifest/content checks ({len(m['pages'])} manifest pages, {len(files)} content files)")
PY

export LEARN_SEED_DIR="$WORK" LEARN_BASE="fides-design-pilot/learn-for-governments-tmp" LEARN_BACKUP_DIR="$WORK/backup"
seed_all() { pilot_wp eval-file "$HERE/create-learn-pages.php" 2>&1 | grep -E '^(created|updated|unchanged|skipped|would|forced|error)' | awk '{print $1}' | sort | uniq -c | awk '{printf "%s%s=%s", s, $2, $1; s=" "}'; }
expect "created=5" "$(seed_all)" "first seed creates the overview and the four articles"
expect "unchanged=5" "$(seed_all)" "second seed changes nothing (idempotent)"
PARENT=$(pilot_wp post list --post_type=page --name=learn-for-governments-tmp --field=ID)
expect section "$(pilot_wp post meta get "$PARENT" _fides_learn_kind)" "overview kind"
ID=$(pilot_wp post list --post_type=page --post_parent="$PARENT" --name=issuing-public-information-to-wallets --field=ID)
[[ -n "$ID" ]] || { echo "FAIL throwaway article not found"; exit 1; }
expect article "$(pilot_wp post meta get "$ID" _fides_learn_kind)" "article kind"
expect "for-governments" "$(pilot_wp post meta get "$ID" _fides_learn_series)" "series slug is stored"
yes_ "$(pilot_wp post get "$ID" --field=post_content | grep -q '{{' && echo 0 || echo 1)" "no unreplaced {{token}} in the stored content"
yes_ "$(pilot_wp post get "$ID" --field=post_excerpt | grep -q '^Which public information could people hold in a wallet?' && echo 1 || echo 0)" "excerpt is the editorial lead"
yes_ "$(pilot_wp post meta get "$ID" _fides_learn_sources | grep -q 'version 0.9.5 (September 2026), consulted 12 November 2026' && echo 1 || echo 0)" "sources keep the consulted version and date"

# An editor changes the body of one article: it is skipped (also in dry-run), the others stay unchanged, nothing is forced.
pilot_wp post update "$ID" --post_content="$(pilot_wp post get "$ID" --field=post_content)<!-- editor note -->" >/dev/null
expect "skipped-edited=1 unchanged=4" "$(seed_all)" "editor changed one article: it is skipped, the others stay unchanged"
expect "skipped-edited=1 unchanged=4" "$(LEARN_DRY_RUN=1 seed_all)" "same, dry-run"
yes_ "$(pilot_wp post get "$ID" --field=post_content | grep -q 'editor note' && echo 1 || echo 0)" "edited body survived the re-seed"

# An editor changes the overview title: also skipped.
pilot_wp post update "$PARENT" --post_title="For governments (edited)" >/dev/null
expect "skipped-edited=2 unchanged=3" "$(seed_all)" "editor changed the overview title as well"
yes_ "$([[ "$(pilot_wp post get "$PARENT" --field=post_title)" == "For governments (edited)" ]] && echo 1 || echo 0)" "edited title survived the re-seed"

# An unmarked page is never touched.
pilot_wp post meta delete "$ID" _fides_learn_seed >/dev/null
expect "skipped-edited=1 skipped-unmarked=1 unchanged=3" "$(seed_all)" "article without seed marker"

for c in $(pilot_wp post list --post_type=page --post_parent="$PARENT" --field=ID); do pilot_wp post delete "$c" --force >/dev/null; done
pilot_wp post delete "$PARENT" --force >/dev/null
echo "cleanup: throwaway tree deleted"
yes_ "$([[ "$(pilot_wp post list --post_type=page --post_status=publish --name=digital-wallets-and-public-services --field=ID | wc -l | tr -d ' ')" -le 1 ]] && echo 1 || echo 0)" "no stray copy of a real For governments article was created"
[[ $fail -eq 0 ]] && echo "RESULT pass" || { echo "RESULT fail"; exit 1; }
