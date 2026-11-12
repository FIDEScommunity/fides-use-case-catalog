#!/usr/bin/env bash
# Seed behaviour for the five Ecosystem roles articles: the real manifest entries and content files are seeded
# into ONE throwaway tree (/fides-design-pilot/learn-ecosystem-roles-articles-tmp/), never into the real Learn
# pages. Proves the seed creates the five pages, is idempotent, skips an edited copy (also in dry-run) and an
# unmarked page, and never forces. Static checks cover the manifest entries, sources and content files.
# Run: bash tests/ecosystem-roles-articles-seed.sh
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$HERE/env.sh"
WORK="$HERE/tests/output/ecosystem-roles-articles-seed"
rm -rf "$WORK"; mkdir -p "$WORK/content"
fail=0
expect() { if [[ "$2" == "$1" ]]; then echo "ok   $3: $2"; else echo "FAIL $3: expected $1, got $2"; fail=1; fi; }
yes_() { if [[ "$1" == "1" ]]; then echo "ok   $2"; else echo "FAIL $2"; fail=1; fi; }

python3 - "$HERE" "$WORK" <<'PY'
import json, sys, re, pathlib
here, work = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
m = json.loads((here / "learn/manifest.json").read_text())
slugs = ["the-holder", "the-issuer", "the-relying-party", "wallet-providers-and-other-service-providers", "trust-service-providers-and-trust-frameworks"]
entries = []
for i, s in enumerate(slugs):
    es = [p for p in m["pages"] if p["path"] == f"topics/ecosystem-roles/{s}"]
    assert len(es) == 1, f"exactly one manifest entry for {s}"
    e = es[0]
    assert e["kind"] == "article" and e["eyebrow"] == "Explainer · Ecosystem roles", f"{s}: kind and eyebrow"
    assert e["content"] == f"{s}.html" and (here / "learn/content" / e["content"]).is_file(), f"{s}: content file"
    assert e["excerpt"].strip(), f"{s}: excerpt"
    for line in e.get("sources", "").splitlines():
        assert re.match(r"^[^|]+ · [^|]+ \| https://\S+$", line.strip()), f"{s}: source line format: {line}"
    body = (here / "learn/content" / e["content"]).read_text()
    assert not re.search(r"localhost|127\.0\.0\.1|issuer-catalog|relying-party-websites", body), f"{s}: no local host/unavailable destination"
    assert "{{learn}}/topics/ecosystem-roles/" in body, f"{s}: links back to the overview"
    entries.append((s, e))
trust = (here / "learn/content/trust-service-providers-and-trust-frameworks.html").read_text()
assert "{{pilot}}/organizations/?role=eidas_trust_service_provider" in trust and "{{pilot}}/organizations/?cert=qtsp" in trust, "trust page: filtered organisation links"
# Throwaway tree: the five real entries seeded below one throwaway parent.
parent = {"path": "", "title": "Ecosystem roles articles (throwaway)", "kind": "section", "excerpt": "Throwaway parent.", "content": "tmp-parent.html", "menu_order": 0}
(work / "content" / "tmp-parent.html").write_text("<!-- wp:paragraph -->\n<p>Throwaway.</p>\n<!-- /wp:paragraph -->\n")
pages = [parent]
for s, e in entries:
    t = dict(e); t["path"] = s
    pages.append(t)
    (work / "content" / e["content"]).write_text((here / "learn/content" / e["content"]).read_text())
(work / "manifest.json").write_text(json.dumps({"version": 1, "note": "throwaway", "pages": pages}))
topics_back = {"what-is-a-digital-wallet": "the-holder", "issuing-credentials-for-wallets": "the-issuer", "accepting-information-from-a-wallet": "the-relying-party", "trust-and-interoperability": "trust-service-providers-and-trust-frameworks"}
for f, s in topics_back.items():
    assert f"{{{{learn}}}}/topics/ecosystem-roles/{s}/" in (here / "learn/content" / f"{f}.html").read_text(), f"{f} links to {s}"
ov = (here / "learn/content/ecosystem-roles.html").read_text()
for s in slugs: assert f'<a href="{{{{learn}}}}/topics/ecosystem-roles/{s}/">' in ov, f"overview links to {s}"
assert "not available yet" not in ov, "overview has no 'not available yet' paragraph"
print("ok   static manifest/content checks (" + str(len(m["pages"])) + " manifest pages)")
PY

export LEARN_SEED_DIR="$WORK" LEARN_BASE="fides-design-pilot/learn-ecosystem-roles-articles-tmp" LEARN_BACKUP_DIR="$WORK/backup"
seed_all() { pilot_wp eval-file "$HERE/create-learn-pages.php" 2>&1 | grep -E '^(created|updated|unchanged|skipped|would|forced|error)' | awk '{print $1}' | sort | uniq -c | awk '{printf "%s%s=%s", s, $2, $1; s=" "}'; }
expect "created=6" "$(seed_all)" "first seed creates the parent and the five articles"
expect "unchanged=6" "$(seed_all)" "second seed changes nothing (idempotent)"
ID=$(pilot_wp post list --post_type=page --name=the-issuer --post_parent="$(pilot_wp post list --post_type=page --name=learn-ecosystem-roles-articles-tmp --field=ID)" --field=ID)
[[ -n "$ID" ]] || { echo "FAIL throwaway article not found"; exit 1; }
expect article "$(pilot_wp post meta get "$ID" _fides_learn_kind)" "article kind"
yes_ "$(pilot_wp post get "$ID" --field=post_content | grep -q '{{' && echo 0 || echo 1)" "no unreplaced {{token}} in the stored content"
yes_ "$(pilot_wp post get "$ID" --field=post_excerpt | grep -q '^An issuer provides a credential' && echo 1 || echo 0)" "excerpt is the editorial lead"

pilot_wp post update "$ID" --post_content="$(pilot_wp post get "$ID" --field=post_content)<!-- editor note -->" >/dev/null
expect "skipped-edited=1 unchanged=5" "$(seed_all)" "editor changed one article: it is skipped, the others stay unchanged"
expect "skipped-edited=1 unchanged=5" "$(LEARN_DRY_RUN=1 seed_all)" "same, dry-run"
yes_ "$(pilot_wp post get "$ID" --field=post_content | grep -q 'editor note' && echo 1 || echo 0)" "edited body survived the re-seed"
pilot_wp post meta delete "$ID" _fides_learn_seed >/dev/null
expect "skipped-unmarked=1 unchanged=5" "$(seed_all)" "article without seed marker"

PARENT=$(pilot_wp post list --post_type=page --name=learn-ecosystem-roles-articles-tmp --field=ID)
for c in $(pilot_wp post list --post_type=page --post_parent="$PARENT" --field=ID); do pilot_wp post delete "$c" --force >/dev/null; done
pilot_wp post delete "$PARENT" --force >/dev/null
echo "cleanup: throwaway tree deleted"
yes_ "$([[ "$(pilot_wp post list --post_type=page --post_status=publish --name=the-holder --field=ID | wc -l | tr -d ' ')" == "1" ]] && echo 1 || echo 0)" "the real The holder page still exists once"
[[ $fail -eq 0 ]] && echo "RESULT pass" || { echo "RESULT fail"; exit 1; }
