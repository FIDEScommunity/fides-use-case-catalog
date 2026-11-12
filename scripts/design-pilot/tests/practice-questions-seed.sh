#!/usr/bin/env bash
# Seed behaviour for Learn > Topics > For businesses practice questions: the real manifest entries and content files (overview plus three
# articles) are seeded into ONE throwaway tree (/fides-design-pilot/learn-practice-questions-tmp/), never into the real Learn pages.
# Proves the seed creates the four pages, stores the series, is idempotent, skips an edited copy (also in dry-run) and an
# unmarked page, and never forces. Static checks cover the manifest entries, sources, back links and content files.
# Run: bash tests/practice-questions-seed.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$HERE/env.sh"
WORK="$HERE/tests/output/practice-questions-seed"
rm -rf "$WORK"; mkdir -p "$WORK/content"
fail=0
expect() { if [[ "$2" == "$1" ]]; then echo "ok   $3: $2"; else echo "FAIL $3: expected $1, got $2"; fail=1; fi; }
yes_() { if [[ "$1" == "1" ]]; then echo "ok   $2"; else echo "FAIL $2"; fail=1; fi; }

python3 - "$HERE" "$WORK" <<'PY'
import json, sys, re, pathlib
here, work = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
m = json.loads((here / "learn/manifest.json").read_text())
paths = [p["path"] for p in m["pages"]]
assert all("path" in p for p in m["pages"]), "every manifest page has its own path"
assert [k for k in set(paths) if paths.count(k) > 1 and k != ""] == [], "only empty paths may repeat"
slugs = ["how-can-an-organisation-prepare-a-wallet-use-case", "what-should-a-service-check-when-receiving-a-credential", "how-can-someone-act-for-an-organisation"]
hub = [p for p in m["pages"] if p["path"] == "topics/for-businesses"]
assert len(hub) == 1 and hub[0]["kind"] == "section" and hub[0]["content"] == "for-businesses.html", "overview entry"
hub = hub[0]
entries = []
for s in slugs:
    es = [p for p in m["pages"] if p["path"] == f"topics/for-businesses/{s}"]
    assert len(es) == 1, f"exactly one manifest entry for {s}"
    e = es[0]
    assert e["kind"] == "article" and e["eyebrow"] == "Explainer · For businesses", f"{s}: kind and eyebrow"
    assert not e.get("series"), f"{s}: no series"
    assert e["content"] == f"{s}.html" and (here / "learn/content" / e["content"]).is_file(), f"{s}: content file"
    assert e["excerpt"].strip(), f"{s}: excerpt"
    lines = e.get("sources", "").splitlines()
    assert lines, f"{s}: sources present"
    for line in lines:
        assert re.match(r"^[^|]+ \| https://\S+$", line.strip()), f"{s}: source line format: {line}"
    urls = [l.split("|")[-1].strip() for l in lines]
    assert len(urls) == len(set(urls)), f"{s}: no duplicate source URLs"
    body = (here / "learn/content" / e["content"]).read_text()
    assert not re.search(r"localhost|127\.0\.0\.1|issuer-catalog|relying-party-websites|interop-profiles|interop-matrix", body), f"{s}: no local host/unavailable destination"
    assert "Content last checked: 12 November 2026" in body, f"{s}: last checked date"
    assert body.count('<h2 class="wp-block-heading">Continue learning</h2>') == 1, f"{s}: Continue learning once"
    entries.append((s, e))
ov = (here / "learn/content" / hub["content"]).read_text()
for s in slugs: assert f'<a href="{{{{learn}}}}/topics/for-businesses/{s}/">' in ov, f"overview links to {s}"
assert "Company identity and representation" not in ov, "overview has no unlinked representation placeholder left"
for f, target in [("business-wallets-where-to-start.html", "how-can-someone-act-for-an-organisation"), ("accepting-information-from-a-wallet.html", "what-should-a-service-check-when-receiving-a-credential"), ("issuing-credentials-for-wallets.html", "how-can-an-organisation-prepare-a-wallet-use-case")]:
    assert (here / "learn/content" / f).read_text().count(f"{{{{learn}}}}/topics/for-businesses/{target}/") == 1, f"exactly one back link in {f}"
used = [p["content"] for p in m["pages"]]
files = sorted((here / "learn/content").glob("*.html"))
assert len(used) == len(set(used)), "content files used once"
assert {f.name for f in files} == set(used), "every content file is in the manifest and the reverse"
# Throwaway tree: the real For businesses overview at the root of a temporary tree and the three real articles below it.
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

export LEARN_SEED_DIR="$WORK" LEARN_BASE="fides-design-pilot/learn-practice-questions-tmp" LEARN_BACKUP_DIR="$WORK/backup"
seed_all() { pilot_wp eval-file "$HERE/create-learn-pages.php" 2>&1 | grep -E '^(created|updated|unchanged|skipped|would|forced|error)' | awk '{print $1}' | sort | uniq -c | awk '{printf "%s%s=%s", s, $2, $1; s=" "}'; }
expect "created=4" "$(seed_all)" "first seed creates the overview and the three articles"
expect "unchanged=4" "$(seed_all)" "second seed changes nothing (idempotent)"
PARENT=$(pilot_wp post list --post_type=page --name=learn-practice-questions-tmp --field=ID)
expect section "$(pilot_wp post meta get "$PARENT" _fides_learn_kind)" "overview kind"
ID=$(pilot_wp post list --post_type=page --post_parent="$PARENT" --name=how-can-someone-act-for-an-organisation --field=ID)
[[ -n "$ID" ]] || { echo "FAIL throwaway article not found"; exit 1; }
expect article "$(pilot_wp post meta get "$ID" _fides_learn_kind)" "article kind"
expect "" "$(pilot_wp post meta get "$ID" _fides_learn_series 2>/dev/null || true)" "no series is stored (the articles are not part of a series)"
yes_ "$(pilot_wp post get "$ID" --field=post_content | grep -q '{{' && echo 0 || echo 1)" "no unreplaced {{token}} in the stored content"
yes_ "$(pilot_wp post get "$ID" --field=post_excerpt | grep -q '^A person may need to act for an organisation' && echo 1 || echo 0)" "excerpt is the editorial lead"
yes_ "$(pilot_wp post meta get "$ID" _fides_learn_sources | grep -q 'Directive (EU) 2025/25' && echo 1 || echo 0)" "sources are stored"

# An editor changes the body of one article: it is skipped (also in dry-run), the others stay unchanged, nothing is forced.
pilot_wp post update "$ID" --post_content="$(pilot_wp post get "$ID" --field=post_content)<!-- editor note -->" >/dev/null
expect "skipped-edited=1 unchanged=3" "$(seed_all)" "editor changed one article: it is skipped, the others stay unchanged"
expect "skipped-edited=1 unchanged=3" "$(LEARN_DRY_RUN=1 seed_all)" "same, dry-run"
yes_ "$(pilot_wp post get "$ID" --field=post_content | grep -q 'editor note' && echo 1 || echo 0)" "edited body survived the re-seed"

# An editor changes the overview title: also skipped.
pilot_wp post update "$PARENT" --post_title="For businesses (edited)" >/dev/null
expect "skipped-edited=2 unchanged=2" "$(seed_all)" "editor changed the overview title as well"
yes_ "$([[ "$(pilot_wp post get "$PARENT" --field=post_title)" == "For businesses (edited)" ]] && echo 1 || echo 0)" "edited title survived the re-seed"

# An unmarked page is never touched.
pilot_wp post meta delete "$ID" _fides_learn_seed >/dev/null
expect "skipped-edited=1 skipped-unmarked=1 unchanged=2" "$(seed_all)" "article without seed marker"

for c in $(pilot_wp post list --post_type=page --post_parent="$PARENT" --field=ID); do pilot_wp post delete "$c" --force >/dev/null; done
pilot_wp post delete "$PARENT" --force >/dev/null
echo "cleanup: throwaway tree deleted"
yes_ "$([[ "$(pilot_wp post list --post_type=page --post_status=publish --name=how-can-an-organisation-prepare-a-wallet-use-case --field=ID | wc -l | tr -d ' ')" -le 1 ]] && echo 1 || echo 0)" "no stray copy of a real practice-question article was created"
[[ $fail -eq 0 ]] && echo "RESULT pass" || { echo "RESULT fail"; exit 1; }
