#!/usr/bin/env bash
# Seed behaviour for Learn > Topics > Technology and Around the world: the real manifest entries and content files
# (each overview plus its three articles) are seeded into TWO throwaway trees (/fides-design-pilot/learn-tech-tmp/ and
# /fides-design-pilot/learn-world-tmp/), never into the real Learn pages. Proves the seed creates the four pages of each
# tree, stores the series where there is one, is idempotent, skips an edited copy (also in dry-run) and an unmarked page,
# and never forces. Static checks cover the manifest entries (own unique path per page), sources, back links, Topics rows
# and content files.
# Run: bash tests/technology-around-world-seed.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$HERE/env.sh"
WORK="$HERE/tests/output/technology-around-world-seed"
rm -rf "$WORK"; mkdir -p "$WORK"
fail=0
expect() { if [[ "$2" == "$1" ]]; then echo "ok   $3: $2"; else echo "FAIL $3: expected $1, got $2"; fail=1; fi; }
yes_() { if [[ "$1" == "1" ]]; then echo "ok   $2"; else echo "FAIL $2"; fail=1; fi; }

python3 - "$HERE" "$WORK" <<'PY'
import json, sys, re, pathlib
here, work = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
m = json.loads((here / "learn/manifest.json").read_text())
paths = [p["path"] for p in m["pages"]]
assert all("path" in p for p in m["pages"]), "every manifest page has its own path"
keyed = [(p.get("tree", "learn"), p["path"]) for p in m["pages"]]
assert [k for k in set(keyed) if keyed.count(k) > 1 and k[1] != ""] == [], "paths are unique per tree (only empty root paths may repeat)"
TREES = {
    "tech": dict(hub="topics/technology", title="Technology", content="technology.html", order=5, eyebrow="Explainer · Technology", series="technology",
                 slugs=["how-do-wallets-and-services-exchange-information", "credential-formats-and-interoperability", "trust-frameworks-and-registries"]),
    "world": dict(hub="topics/around-the-world", title="Around the world", content="around-the-world.html", order=6, headline="Digital trust around the world", series=None,
                  slugs=["the-netherlands", "germany", "un-transparency-protocol"]),
}
EYEBROWS = {"the-netherlands": "Country · Around the world", "germany": "Country · Around the world", "un-transparency-protocol": "Initiative · Around the world"}
for key, t in TREES.items():
    hub = [p for p in m["pages"] if p["path"] == t["hub"]]
    assert len(hub) == 1, f"exactly one manifest entry for {t['hub']}"
    hub = hub[0]
    assert hub["kind"] == "section" and hub["content"] == t["content"] and hub["title"] == t["title"] and hub["menu_order"] == t["order"], f"{key}: overview kind, title, content file, order"
    if t.get("headline"): assert hub.get("headline") == t["headline"], f"{key}: headline"
    assert (here / "learn/content" / hub["content"]).is_file() and hub["excerpt"].strip(), f"{key}: content file and excerpt"
    entries = []
    for i, s in enumerate(t["slugs"]):
        es = [p for p in m["pages"] if p["path"] == f"{t['hub']}/{s}"]
        assert len(es) == 1, f"exactly one manifest entry for {s}"
        e = es[0]
        assert e["kind"] == "article", f"{s}: kind"
        assert e["eyebrow"] == (t.get("eyebrow") or EYEBROWS[s]), f"{s}: eyebrow"
        assert e["menu_order"] == i, f"{s}: menu_order {i}"
        assert e.get("series") == t["series"], f"{s}: series {t['series']}"
        assert e["content"] == f"{s}.html" and (here / "learn/content" / e["content"]).is_file(), f"{s}: content file"
        assert e["excerpt"].strip(), f"{s}: excerpt"
        lines = e.get("sources", "").splitlines()
        assert 2 <= len(lines) <= 3, f"{s}: two or three sources"
        for line in lines:
            assert re.match(r"^[^|]+ · [^|]+ \| https://\S+$", line.strip()), f"{s}: source line format 'Organisation · Title | URL': {line}"
        urls = [l.split("|")[-1].strip() for l in lines]
        assert len(urls) == len(set(urls)), f"{s}: no duplicate source URLs"
        body = (here / "learn/content" / e["content"]).read_text()
        assert not re.search(r"localhost|127\.0\.0\.1|issuer-catalog|relying-party-websites|interop-profiles|interop-matrix", body), f"{s}: no local host/unavailable destination"
        assert "Content last checked: 13 November 2026" in body, f"{s}: last checked date"
        assert "Design preview" not in body and "Coming soon" not in body, f"{s}: no preview or placeholder text"
        ln = re.search(r"Learn more.*?<!-- /wp:list -->", body, re.S)
        assert ln and 2 <= ln.group(0).count("<li>") <= 4, f"{s}: Learn more has 2-4 links"
        if key == "world":
            assert "Responsible source" in body and "checked on 13 November 2026" in body, f"{s}: responsible source and check date"
            assert all("consulted 13 November 2026" in l for l in lines), f"{s}: sources name the consulted date"
        entries.append((s, e))
    ov = (here / "learn/content" / hub["content"]).read_text()
    assert "Design preview" not in ov and "Coming soon" not in ov and "not available yet" not in ov, f"{key}: overview has no preview or placeholder text"
    assert not re.search(r"<p>(A|An|The)\s*<", ov) and not re.search(r"<li>(A|An|The)\s*<", ov), f"{key}: no lone article opener in the overview"
    assert "Content last checked: 13 November 2026" in ov, f"{key}: overview last checked date"
    for s in t["slugs"]: assert f'<a href="{{{{learn}}}}/{t["hub"].replace("topics/", "topics/")}/{s}/">' in ov, f"{key}: overview links to {s}"
    t["hub_entry"], t["entries"], t["overview"] = hub, entries, ov
tech, world = TREES["tech"], TREES["world"]
for url in ["the-big-picture/formats-and-protocols/", "the-big-picture/trust-and-interoperability/"]:
    assert f"{{{{learn}}}}/topics/{url}" in tech["overview"], f"Technology overview links to the existing article {url}"
for url in ["the-big-picture/european-digital-identity-wallet/", "for-governments/the-eudi-wallet-and-national-implementation/"]:
    assert f"{{{{learn}}}}/topics/{url}" in world["overview"], f"Around the world overview links to the existing page {url}"
topics = (here / "learn/content/topics.html").read_text()
assert '<a href="{{learn}}/topics/technology/">Technology</a>' in topics, "Topics row links to Technology"
assert '<a href="{{learn}}/topics/around-the-world/">Around the world</a>' in topics, "Topics row links to Around the world"
for n in ("Technology", "Around the world"):
    assert f'<strong class="fides-learn-rows__title">{n}</strong>' not in topics, f"Topics has no unlinked {n} row left"
for f, target in [("formats-and-protocols.html", "technology/how-do-wallets-and-services-exchange-information"),
                  ("trust-and-interoperability.html", "technology/trust-frameworks-and-registries")]:
    assert f"{{{{learn}}}}/topics/{target}/" in (here / "learn/content" / f).read_text(), f"back link in {f}"
used = [p["content"] for p in m["pages"]]
files = sorted((here / "learn/content").glob("*.html"))
assert len(used) == len(set(used)), "content files used once"
assert {f.name for f in files} == set(used), "every content file is in the manifest and the reverse"
# Throwaway trees: the real overview at the root of a temporary tree and the three real pages below it.
for key, t in TREES.items():
    d = work / key
    (d / "content").mkdir(parents=True)
    h = dict(t["hub_entry"]); h["path"] = ""
    pages = [h]
    (d / "content" / h["content"]).write_text(t["overview"])
    for s, e in t["entries"]:
        c = dict(e); c["path"] = s
        pages.append(c)
        (d / "content" / e["content"]).write_text((here / "learn/content" / e["content"]).read_text())
    (d / "manifest.json").write_text(json.dumps({"version": 1, "note": "throwaway", "pages": pages}))
print(f"ok   static manifest/content checks ({len(m['pages'])} manifest pages, {len(files)} content files)")
PY

seed_all() { pilot_wp eval-file "$HERE/create-learn-pages.php" 2>&1 | grep -E '^(created|updated|unchanged|skipped|would|forced|error)' | awk '{print $1}' | sort | uniq -c | awk '{printf "%s%s=%s", s, $2, $1; s=" "}'; }

run_tree() {
  local key="$1" tmp="$2" series="$3" article="$4" lead="$5"
  export LEARN_SEED_DIR="$WORK/$key" LEARN_BASE="fides-design-pilot/$tmp" LEARN_BACKUP_DIR="$WORK/backup-$key"
  expect "created=4" "$(seed_all)" "$key: first seed creates the overview and the three pages"
  expect "unchanged=4" "$(seed_all)" "$key: second seed changes nothing (idempotent)"
  local PARENT ID
  PARENT=$(pilot_wp post list --post_type=page --name="$tmp" --field=ID)
  expect section "$(pilot_wp post meta get "$PARENT" _fides_learn_kind)" "$key: overview kind"
  ID=$(pilot_wp post list --post_type=page --post_parent="$PARENT" --name="$article" --field=ID)
  [[ -n "$ID" ]] || { echo "FAIL $key: throwaway page not found"; exit 1; }
  expect article "$(pilot_wp post meta get "$ID" _fides_learn_kind)" "$key: article kind"
  if [[ -n "$series" ]]; then expect "$series" "$(pilot_wp post meta get "$ID" _fides_learn_series)" "$key: series slug is stored"; fi
  yes_ "$(pilot_wp post get "$ID" --field=post_content | grep -q '{{' && echo 0 || echo 1)" "$key: no unreplaced {{token}} in the stored content"
  yes_ "$(pilot_wp post get "$ID" --field=post_excerpt | grep -qF "$lead" && echo 1 || echo 0)" "$key: excerpt is the editorial lead"
  yes_ "$(pilot_wp post meta get "$ID" _fides_learn_sources | grep -q ' · ' && echo 1 || echo 0)" "$key: sources are stored"

  # An editor changes the body of one page: it is skipped (also in dry-run), the others stay unchanged, nothing is forced.
  pilot_wp post update "$ID" --post_content="$(pilot_wp post get "$ID" --field=post_content)<!-- editor note -->" >/dev/null
  expect "skipped-edited=1 unchanged=3" "$(seed_all)" "$key: editor changed one page: it is skipped, the others stay unchanged"
  expect "skipped-edited=1 unchanged=3" "$(LEARN_DRY_RUN=1 seed_all)" "$key: same, dry-run"
  yes_ "$(pilot_wp post get "$ID" --field=post_content | grep -q 'editor note' && echo 1 || echo 0)" "$key: edited body survived the re-seed"
  # An editor changes the overview title: also skipped.
  pilot_wp post update "$PARENT" --post_title="Edited title" >/dev/null
  expect "skipped-edited=2 unchanged=2" "$(seed_all)" "$key: editor changed the overview title as well"
  yes_ "$([[ "$(pilot_wp post get "$PARENT" --field=post_title)" == "Edited title" ]] && echo 1 || echo 0)" "$key: edited title survived the re-seed"
  # An unmarked page is never touched.
  pilot_wp post meta delete "$ID" _fides_learn_seed >/dev/null
  expect "skipped-edited=1 skipped-unmarked=1 unchanged=2" "$(seed_all)" "$key: page without seed marker"
  for c in $(pilot_wp post list --post_type=page --post_parent="$PARENT" --field=ID); do pilot_wp post delete "$c" --force >/dev/null; done
  pilot_wp post delete "$PARENT" --force >/dev/null
  echo "cleanup: throwaway tree $tmp deleted"
}

run_tree tech learn-tech-tmp technology credential-formats-and-interoperability "See what a format describes and what else affects compatibility"
run_tree world learn-world-tmp "" germany "What is the German EUDI Wallet programme"
yes_ "$([[ "$(pilot_wp post list --post_type=page --post_status=publish --name=germany --field=ID | wc -l | tr -d ' ')" -le 1 ]] && echo 1 || echo 0)" "no stray copy of a real page was created"
[[ $fail -eq 0 ]] && echo "RESULT pass" || { echo "RESULT fail"; exit 1; }
