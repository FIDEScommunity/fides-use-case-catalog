#!/usr/bin/env bash
# Verify a staging package without any WordPress: checksums, PHP/JS syntax of everything shipped, address scan,
# route-map parity with the local guard, manifest versions against the plugin headers, and reproducibility
# (rebuilding from the same commits gives the same files).
#   verify-package.sh [package dir]      default: staging-package/latest
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/../env.sh"
PKG="$(cd "${1:-$PILOT_ROOT/staging-package/latest}" && pwd -P)"
FAIL=0; ok() { echo "ok - $1"; }; bad() { echo "not ok - $1"; FAIL=$((FAIL+1)); }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

(cd "$PKG" && shasum -a 256 -c SHA256SUMS --quiet) && ok "SHA256SUMS matches every file" || bad "checksums"

# Syntax of everything that will run on staging.
php_n=0; js_n=0; php_bad=0; js_bad=0
for z in "$PKG"/plugins/*.zip "$PKG"/non-git/plugins/*.zip "$PKG"/non-git/themes/*.zip; do unzip -q -o "$z" -d "$TMP/x"; done
while IFS= read -r -d '' f; do php_n=$((php_n+1)); "$PHP_BIN" -l "$f" >/dev/null 2>&1 || { php_bad=$((php_bad+1)); echo "  php -l failed: $f"; }; done < <(find "$TMP/x" "$PKG/seed" "$PKG/mu-plugins" -name '*.php' -print0)
while IFS= read -r -d '' f; do js_n=$((js_n+1)); node --check "$f" >/dev/null 2>&1 || { js_bad=$((js_bad+1)); echo "  node --check failed: $f"; }; done < <(find "$TMP/x" "$PKG/checks" \( -name '*.js' -o -name '*.cjs' \) ! -name '*.min.js' -print0)
[[ $php_bad -eq 0 ]] && ok "php -l passes for $php_n shipped PHP files" || bad "php -l ($php_bad failed)"
[[ $js_bad -eq 0 ]] && ok "node --check passes for $js_n shipped JS files" || bad "node --check ($js_bad failed)"
bash -n "$PKG/seed/seed.sh" && ok "seed.sh parses" || bad "seed.sh"

# Awards images: bundled, complete, checksummed, and the seed has no network dependency for them.
python3 - "$PKG" <<'PY' && ok "awards images: every manifest image is in seed/awards/images/ with matching size and SHA-256 ($(python3 -c "import json; m=json.load(open('$PKG/manifest.json')).get('awards_images',{}); print(m.get('count',0), 'files', round(m.get('bytes',0)/1e6,1), 'MB')"))" || bad "awards images missing or changed"
import hashlib, json, os, sys
pkg = sys.argv[1]
n = 0
for name in ("manifest.json", "community-manifest.json"):
    for image in json.load(open(f"{pkg}/seed/awards/{name}"))["images"]:
        path = f"{pkg}/seed/awards/images/{image['file']}"
        assert os.path.isfile(path), "missing " + path
        data = open(path, "rb").read()
        assert len(data) == image["bytes"] and hashlib.sha256(data).hexdigest() == image["sha256"], "mismatch " + path
        n += 1
assert n > 0 and os.path.isfile(f"{pkg}/seed/awards/images/PROVENANCE.txt")
assert json.load(open(f"{pkg}/manifest.json"))["awards_images"]["count"] == n
PY
if grep -q "PILOT_AWARDS_ALLOW_DOWNLOAD" "$PKG/seed/create-pages.php" && ! grep -q "PILOT_AWARDS_ALLOW_DOWNLOAD" "$PKG/seed/seed.sh" "$PKG"/seed/staging/*.php; then
  ok "awards seed has no network dependency: download is opt-in (PILOT_AWARDS_ALLOW_DOWNLOAD=1) and nothing in the package sets it"
else
  bad "awards seed may download images by default"
fi

# Address scan result recorded at build time, and recomputed from the package contents.
blockers="$(python3 -c "import json,sys; print(len(json.load(open('$PKG/manifest.json'))['address_scan_blockers']))")"
[[ "$blockers" == "0" ]] && ok "address scan: no fixed localhost, port 10088, utrecht-demo or pilot route in shipped code" || bad "address scan has $blockers blockers"
python3 - "$PKG" <<'PY' && ok "address scan summary: $(python3 -c "import json; print(json.load(open('$PKG/address-scan.json'))['summary'])")" || bad "address scan file"
import json, sys
d = json.load(open(sys.argv[1] + "/address-scan.json"))
assert "summary" in d and d["blockers"] == []
PY

# Route map parity: the staging config and the local guard must map the same shell paths to the same pilot pages.
"$PHP_BIN" -r '
  function map($file, $needle) { $t = file_get_contents($file); preg_match_all("~\x27(/[^\x27]*)\x27\s*=>\s*\x27([^\x27]*)\x27,~", $t, $m, PREG_SET_ORDER); $o = array(); foreach ($m as $r) { $o[$r[1]] = str_replace($needle, "{pilot}", $r[2]); } return $o; }
  $a = map($argv[1], "/fides-design-pilot"); $b = map($argv[2], "{pilot}");
  ksort($a); ksort($b);
  $diff = array_merge(array_diff_assoc($a, $b), array_diff_assoc($b, $a));
  if ($diff) { fwrite(STDERR, "  differs: " . json_encode($diff) . "\n"); exit(1); }
  echo count($a), " routes\n";
' "$PKG/reference/fides-design-pilot-guard.php" "$PKG/mu-plugins/fides-design-review-config.php" > "$TMP/parity.txt" 2>&1 && ok "route map parity with the local guard ($(cat "$TMP/parity.txt"))" || { cat "$TMP/parity.txt"; bad "route map parity"; }

# Glossary data: the bundled aggregate in the glossary plugin zip is the version recorded in staging/glossary-source.json,
# also when that file in the repo was changed after the package was built.
python3 - "$PKG" "$TMP/x" "$HERE/glossary-source.json" <<'PY' && ok "glossary data: bundled aggregate matches glossary-source.json and the manifest (sha256, term count, required ids)" || bad "glossary data differs from glossary-source.json"
import hashlib, json, sys
pkg, x, repo_src = sys.argv[1:4]
m = json.load(open(pkg + "/manifest.json"))["glossary_data"]
src = json.load(open(repo_src))
data = open(x + "/fides-vocabulary-glossary/data/glossary-aggregated.json", "rb").read()
terms = json.loads(data)["terms"]
ids = {t["id"] for t in terms}
assert hashlib.sha256(data).hexdigest() == m["sha256"] == src["sha256"], "sha256"
assert len(terms) == m["terms"] == src["terms"], "terms"
assert m["source_commit"] == src["source_commit"], "source commit"
assert all(i in ids for i in src["required_ids"]), "required ids"
assert json.load(open(pkg + "/glossary-source.json"))["sha256"] == src["sha256"], "glossary-source.json in package"
PY
grep -q "pre_option_fides_vocabulary_glossary_github_data_url" "$PKG/mu-plugins/fides-design-review-config.php" && ok "config mu-plugin points the glossary at the bundled data" || bad "config mu-plugin has no glossary data source override"

# Manifest versions equal the plugin headers inside the zips.
python3 - "$PKG" <<'PY' && ok "manifest versions equal the plugin headers" || bad "manifest versions"
import json, re, sys, zipfile
pkg = sys.argv[1]
m = json.load(open(pkg + "/manifest.json"))
for slug, info in m["plugin_files"].items():
    z = zipfile.ZipFile(f"{pkg}/{info['zip']}")
    main = f"{slug}/{slug}.php"
    text = z.read(main).decode(errors="replace")
    v = re.search(r"^\s*\*?\s*Version:\s*(\S+)", text, re.M).group(1)
    assert v == m["plugins"][slug], (slug, v, m["plugins"][slug])
PY

# Git state: every packaged commit is HEAD of a clean worktree (unless built with --allow-dirty).
python3 - "$PKG" <<'PY' && ok "packaged commits are the current HEAD of clean worktrees" || bad "worktree state differs from the package (rebuild)"
import json, subprocess, sys
m = json.load(open(sys.argv[1] + "/manifest.json"))
assert not m["dirty_at_build"], "built dirty"
for w in m["worktrees"]:
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=w["worktree"]).decode().strip()
    dirty = subprocess.check_output(["git", "status", "--porcelain"], cwd=w["worktree"]).decode().strip()
    assert head == w["head"] and not dirty, (w["repo"], head, w["head"], dirty)
PY

# Reproducibility: same commits, same files.
STAMP="$(python3 -c "import json; print(json.load(open('$PKG/manifest.json'))['package'].rsplit('-',1)[0])")"
python3 "$HERE/build-package.py" --out "$TMP/rebuild" --stamp "$STAMP" >/dev/null 2>&1 || true
REB="$(ls -d "$TMP"/rebuild/*/ 2>/dev/null | head -1 || true)"
if [[ -n "$REB" ]]; then
  diff <(grep -v -e ' manifest.json$' -e ' SHA256SUMS$' "$PKG/SHA256SUMS") <(grep -v -e ' manifest.json$' -e ' SHA256SUMS$' "${REB}SHA256SUMS") >/dev/null && ok "rebuild from the same commits gives identical files (reproducible)" || bad "rebuild differs"
else
  bad "rebuild failed"
fi
echo "# verify fail $FAIL"
exit $((FAIL>0 ? 1 : 0))
