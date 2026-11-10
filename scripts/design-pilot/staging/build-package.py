#!/usr/bin/env python3
"""Build the reproducible staging package of the FIDES design pilot.

Nothing here connects to staging or to any other server. The package is made from:
  - Git: the committed state (HEAD) of the five pilot worktrees (plugin zips, seed scripts,
    the config mu-plugin, Learn seed content, reference catalog data);
  - the local WordPress copy: only the two items that have no Git repository
    (fides-vocabulary-glossary plugin, blocksy-child theme).
The local database is NOT exported; pages and options are created by the seed scripts.

Usage: build-package.py [--out DIR] [--allow-dirty] [--stamp STAMP]
Zips are deterministic (sorted, fixed timestamps), so the same commits give the same SHA-256.
"""
import argparse
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import time
import zipfile

ROOT = os.environ.get("PILOT_ROOT", "/Users/victorvanderhulst/Projects/fides-design-pilot")
WP_CONTENT = os.path.join(ROOT, "wordpress", "wp-content")

# name, plugin directory inside the repo ('' = repo root), slug, main file, paths left out of the zip
REPOS = [
    ("fides-community-tools-tiles", "", "fides-community-tools-tiles", "fides-community-tools-tiles.php",
     ("tests/", "tools/", "docs/", "scripts/", ".github/", "phpunit.xml.dist", ".gitignore", "README.md")),
    ("use-case-catalog", "wordpress-plugin/fides-use-case-catalog", "fides-use-case-catalog", "fides-use-case-catalog.php", ()),
    ("organization-catalog", "wordpress-plugin/fides-organization-catalog", "fides-organization-catalog", "fides-organization-catalog.php", ()),
    ("wallet-catalog", "wordpress-plugin/fides-wallet-catalog", "fides-wallet-catalog", "fides-wallet-catalog.php", ()),
    ("credential-catalog", "wordpress-plugin/fides-credential-catalog", "fides-credential-catalog", "fides-credential-catalog.php", ()),
]
# Seed and config files, taken from the committed use-case-catalog worktree (path in repo -> path in package)
SEED_DIR = "scripts/design-pilot"
SEED_FILES = {
    f"{SEED_DIR}/create-pages.php": "seed/create-pages.php",
    f"{SEED_DIR}/create-learn-pages.php": "seed/create-learn-pages.php",
    f"{SEED_DIR}/staging/seed-guard.php": "seed/staging/seed-guard.php",
    f"{SEED_DIR}/staging/preflight.php": "seed/staging/preflight.php",
    f"{SEED_DIR}/staging/seed.sh": "seed/seed.sh",
    f"{SEED_DIR}/staging/fides-design-review-config.php": "mu-plugins/fides-design-review-config.php",
    f"{SEED_DIR}/staging/rehearsal-checks.cjs": "checks/rehearsal-checks.cjs",
    f"{SEED_DIR}/staging/HANDOVER.md": "HANDOVER.md",
    f"{SEED_DIR}/fides-design-pilot-guard.php": "reference/fides-design-pilot-guard.php",
}
SEED_TREES = {f"{SEED_DIR}/learn/": "seed/learn/"}
# Reference copies of the catalog data the pages read at runtime (GitHub first on staging)
CATALOG_DATA = {
    "use-case-catalog": ("data/aggregated.json", "use-case"),
    "organization-catalog": ("data/aggregated.json", "organization"),
    "wallet-catalog": ("data/aggregated.json", "wallet"),
    "credential-catalog": ("data/aggregated.json", "credential"),
}
NON_GIT = [
    ("plugin", "fides-vocabulary-glossary", os.path.join(WP_CONTENT, "plugins", "fides-vocabulary-glossary"), "fides-vocabulary-glossary.php"),
    ("theme", "blocksy-child", os.path.join(WP_CONTENT, "themes", "blocksy-child"), "style.css"),
]


def run(cmd, cwd=None, binary=False, check=True):
    p = subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if check and p.returncode != 0:
        raise SystemExit(f"command failed: {' '.join(cmd)}\n{p.stderr.decode(errors='replace')}")
    return p.stdout if binary else p.stdout.decode().strip()


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def header(text, key):
    m = re.search(r"^\s*(?:\*\s*)?" + re.escape(key) + r":\s*(.+)$", text, re.M | re.I)
    return m.group(1).strip() if m else ""


def det_zip(entries, slug, timestamp):
    """entries: list of (relative path, bytes, is_exec). Deterministic zip below <slug>/."""
    buf = io.BytesIO()
    t = time.gmtime(timestamp)[:6]
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for rel, data, is_exec in sorted(entries):
            zi = zipfile.ZipInfo(f"{slug}/{rel}", date_time=t)
            zi.compress_type = zipfile.ZIP_DEFLATED
            zi.external_attr = (0o755 if is_exec else 0o644) << 16
            z.writestr(zi, data)
    return buf.getvalue()


def git_tree_entries(repo, subdir, excludes):
    spec = "HEAD" + (f":{subdir}" if subdir else "")
    tar_bytes = run(["git", "archive", "--format=tar", spec], cwd=repo, binary=True)
    out = []
    with tarfile.open(fileobj=io.BytesIO(tar_bytes)) as tf:
        for m in tf.getmembers():
            if not m.isfile():
                continue
            if any(m.name == e or m.name.startswith(e) for e in excludes):
                continue
            out.append((m.name, tf.extractfile(m).read(), bool(m.mode & 0o111)))
    return out


def fs_entries(directory):
    out = []
    for dp, dns, fns in os.walk(directory):
        dns[:] = sorted(d for d in dns if d not in (".git", "node_modules"))
        for fn in sorted(fns):
            if fn in (".DS_Store",):
                continue
            full = os.path.join(dp, fn)
            if os.path.islink(full):
                continue
            rel = os.path.relpath(full, directory)
            with open(full, "rb") as fh:
                out.append((rel, fh.read(), os.access(full, os.X_OK)))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "staging-package"))
    ap.add_argument("--allow-dirty", action="store_true")
    ap.add_argument("--stamp", default="")
    args = ap.parse_args()

    worktrees, plugins, dirty_any = [], {}, False
    for name, subdir, slug, main_file, excludes in REPOS:
        repo = os.path.join(ROOT, name)
        porcelain = run(["git", "status", "--porcelain"], cwd=repo)
        if porcelain:
            dirty_any = True
            if not args.allow_dirty:
                raise SystemExit(f"{name} has uncommitted changes (commit them or pass --allow-dirty):\n{porcelain}")
        head = run(["git", "rev-parse", "HEAD"], cwd=repo)
        ct = int(run(["git", "show", "-s", "--format=%ct", "HEAD"], cwd=repo))
        branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo)
        def rev(ref):
            return run(["git", "rev-parse", "--verify", "-q", ref], cwd=repo, check=False)
        om = rev("origin/main")
        entries = git_tree_entries(repo, subdir, excludes)
        main_text = next(d for r, d, _ in entries if r == main_file).decode(errors="replace")
        version = header(main_text, "Version")
        zdata = det_zip(entries, slug, ct)
        plugins[slug] = {"version": version, "zip": f"plugins/{slug}-{version}.zip", "sha256": sha256(zdata), "files": len(entries), "bytes": len(zdata), "_data": zdata}
        worktrees.append({
            "repo": name, "worktree": repo, "branch": branch, "head": head, "subject": run(["git", "log", "-1", "--format=%s"], cwd=repo),
            "plugin_dir": subdir or ".", "slug": slug, "version": version,
            "commits_ahead_of_local_main": int(run(["git", "rev-list", "--count", "main..HEAD"], cwd=repo)),
            "origin_main": om, "merge_base_origin_main": run(["git", "merge-base", "HEAD", "origin/main"], cwd=repo, check=False) if om else "",
            "ahead_of_origin_main": int(run(["git", "rev-list", "--count", "origin/main..HEAD"], cwd=repo, check=False) or 0) if om else None,
            "behind_origin_main": int(run(["git", "rev-list", "--count", "HEAD..origin/main"], cwd=repo, check=False) or 0) if om else None,
            "dirty": porcelain.splitlines(),
            "gitignored_plugin_data": [f for f in run(["git", "ls-files", "-o", "-i", "--exclude-standard", subdir or "."], cwd=repo).splitlines() if "/data/" in f or f.startswith("data/")],
        })

    uc_repo = os.path.join(ROOT, "use-case-catalog")
    stamp = args.stamp or time.strftime("%Y%m%d-%H%M%S", time.gmtime())
    tiles_head = next(w["head"] for w in worktrees if w["repo"] == "fides-community-tools-tiles")[:8]
    out = os.path.join(args.out, f"{stamp}-{tiles_head}")
    if os.path.exists(out):
        raise SystemExit(f"{out} exists")
    os.makedirs(os.path.join(out, "plugins"))

    for slug, p in plugins.items():
        with open(os.path.join(out, p["zip"]), "wb") as fh:
            fh.write(p.pop("_data"))

    # Seed, config and docs from the committed use-case-catalog tree.
    uc_ct = int(run(["git", "show", "-s", "--format=%ct", "HEAD"], cwd=uc_repo))
    def put(rel, data, mode=0o644):
        dest = os.path.join(out, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as fh:
            fh.write(data)
        os.chmod(dest, mode)
        os.utime(dest, (uc_ct, uc_ct))
    for src, dst in SEED_FILES.items():
        put(dst, run(["git", "show", f"HEAD:{src}"], cwd=uc_repo, binary=True), 0o755 if dst.endswith(".sh") else 0o644)
    names = run(["git", "ls-tree", "-r", "--name-only", "HEAD"], cwd=uc_repo).splitlines()
    for prefix, dst in SEED_TREES.items():
        for n in names:
            # learn/README.md is a developer document with local URLs and paths; it stays in the repository.
            if n.startswith(prefix) and not n.endswith("/README.md"):
                put(dst + n[len(prefix):], run(["git", "show", f"HEAD:{n}"], cwd=uc_repo, binary=True))

    # Reference catalog data (committed crawler output).
    catalog = {}
    for name, (path, label) in CATALOG_DATA.items():
        repo = os.path.join(ROOT, name)
        data = run(["git", "show", f"HEAD:{path}"], cwd=repo, binary=True)
        doc = json.loads(data)
        records = 0
        for key in ("useCases", "organizations", "wallets", "credentials", "items"):
            if isinstance(doc, dict) and isinstance(doc.get(key), list):
                records = len(doc[key])
                break
        put(f"catalog-data/{label}-aggregated.json", data)
        catalog[label] = {"source": f"{name}:{path}@{run(['git', 'rev-parse', '--short', 'HEAD'], cwd=repo)}", "records": records, "sha256": sha256(data)}

    # Items without a Git repository.
    non_git = {}
    for kind, slug, directory, main_file in NON_GIT:
        if not os.path.isdir(directory):
            raise SystemExit(f"missing {directory}")
        entries = fs_entries(directory)
        text = next(d for r, d, _ in entries if r == main_file).decode(errors="replace")
        version = header(text, "Version")
        zdata = det_zip(entries, slug, 1767225600)  # 2026-01-01, files carry no commit time
        rel = f"non-git/{kind}s/{slug}-{version}.zip"
        put(rel, zdata)
        non_git[slug] = {"kind": kind, "version": version, "zip": rel, "sha256": sha256(zdata), "files": len(entries), "source": directory.replace(ROOT, "<pilot>")}
        if kind == "plugin":
            plugins[slug] = {"version": version, "zip": rel, "sha256": non_git[slug]["sha256"], "files": len(entries), "bytes": len(zdata)}

    # Address scan over everything that is shipped as code.
    scan = address_scan(out)
    put("address-scan.json", json.dumps(scan, indent=2, ensure_ascii=False).encode() + b"\n")

    manifest = {
        "package": os.path.basename(out),
        "built_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "target": "https://staging.fides.community/design-review/ (not contacted; installed by Codex)",
        "route_base": "design-review",
        "dirty_at_build": dirty_any,
        "worktrees": worktrees,
        "plugins": {slug: p["version"] for slug, p in plugins.items()},
        "plugin_files": {slug: {k: v for k, v in p.items() if k != "version"} for slug, p in plugins.items()},
        "non_git": non_git,
        "catalog_data_reference": catalog,
        "address_scan_blockers": scan["blockers"],
    }
    put("manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False).encode() + b"\n")

    sums = []
    for dp, dns, fns in os.walk(out):
        for fn in sorted(fns):
            if fn == "SHA256SUMS":
                continue
            full = os.path.join(dp, fn)
            with open(full, "rb") as fh:
                sums.append(f"{sha256(fh.read())}  {os.path.relpath(full, out)}")
    put("SHA256SUMS", ("\n".join(sorted(sums, key=lambda s: s.split('  ', 1)[1])) + "\n").encode())

    latest = os.path.join(args.out, "latest")
    if os.path.islink(latest):
        os.unlink(latest)
    if not os.path.exists(latest):
        os.symlink(os.path.basename(out), latest)
    print(out)
    if scan["blockers"]:
        print("ADDRESS SCAN BLOCKERS:", json.dumps(scan["blockers"], indent=2), file=sys.stderr)
        sys.exit(3)


PATTERNS = {
    "localhost": r"localhost|127\.0\.0\.1|\[::1\]",
    "port-10088": r"\b10088\b",
    "utrecht-demo": r"utrecht-demo",
    "dot-local-host": r"\.local\b",
    "pilot-route": r"fides-design-pilot",
    "production-origin": r"https?://(?:www\.)?fides\.community",
    "staging-origin": r"staging\.fides\.community",
}
# Files in which a host check for local development is expected (it must stay: staging is neither *.local nor localhost).
HOST_DETECTION_OK = ("includes/class-fides-catalog-source.php", "assets/lib/fides-catalog-ui.js", "lib/fides-catalog-ui/fides-catalog-ui.js",
                     "assets/usecase-catalog.js", "assets/credential-catalog.js", "assets/organization-catalog.js", "assets/wallet-catalog.js",
                     ".php", ".js")
TEXT_EXT = (".php", ".js", ".css", ".json", ".html", ".sh", ".cjs", ".txt", ".md")


def address_scan(out):
    """Scan code in the zips, the mu-plugin and the seed scripts. Data files and docs are skipped."""
    hits = {k: [] for k in PATTERNS}
    def scan_text(origin, rel, text):
        if rel.endswith((".md", ".txt")) or "/data/" in rel or rel.startswith("data/") or "/tests/" in rel or rel.endswith("aggregated.json") or rel.endswith(".min.js"):
            return
        if rel.startswith("checks/"):  # browser rehearsal checks: test fixtures, never run by WordPress
            return
        for no, line in enumerate(text.splitlines(), 1):
            commentish = line.strip().startswith(("/*", "*", "//", "#"))
            for key, pat in PATTERNS.items():
                if re.search(pat, line):
                    if commentish and key in ("port-10088", "utrecht-demo"):
                        continue  # a comment never runs
                    hits[key].append({"file": f"{origin}:{rel}", "line": no, "text": line.strip()[:160]})
    for dp, _, fns in os.walk(out):
        for fn in fns:
            full = os.path.join(dp, fn)
            relp = os.path.relpath(full, out)
            if relp.startswith(("catalog-data/", "reference/")) or relp in ("manifest.json", "address-scan.json", "SHA256SUMS", "HANDOVER.md"):
                continue
            if fn.endswith(".zip"):
                with zipfile.ZipFile(full) as z:
                    for n in z.namelist():
                        if n.endswith(TEXT_EXT):
                            scan_text(os.path.basename(full), n, z.read(n).decode(errors="replace"))
            elif fn.endswith(TEXT_EXT):
                with open(full, "rb") as fh:
                    scan_text("package", relp, fh.read().decode(errors="replace"))
    summary = {k: len(v) for k, v in hits.items()}
    blockers = []
    for key in ("port-10088", "utrecht-demo"):
        blockers += [f"{h['file']}:{h['line']} {key}: {h['text']}" for h in hits[key]]
    # A literal local URL is a blocker; a bare host name inside a host check is not.
    blockers += [f"{h['file']}:{h['line']} local URL: {h['text']}" for h in hits["localhost"] if re.search(r"https?://(?:localhost|127\.0\.0\.1|\[::1\])", h["text"])]
    # Pilot route strings are allowed only in comments, never in code that runs on staging.
    for h in hits["pilot-route"]:
        t = h["text"]
        in_comment = t.startswith(("*", "//", "#", "/*")) or "TEXT" in t
        allowed_file = h["file"].endswith(("fides-design-pilot-guard.php",)) or "seed/create" in h["file"] or "seed/learn/" in h["file"] or "seed-guard" in h["file"] or "seed.sh" in h["file"] or "preflight" in h["file"] or "fides-design-review-config" in h["file"]
        if not in_comment and not allowed_file:
            blockers.append(f"{h['file']}:{h['line']} pilot route in code: {t}")
    return {
        "patterns": PATTERNS,
        "summary": summary,
        "blockers": blockers,
        "hits": {k: v[:80] for k, v in hits.items()},
        "classification": {
            "localhost / dot-local-host": "host detection for local development in the catalog loaders (*.local, localhost): required, staging is neither, so catalogs read GitHub first",
            "pilot-route": "seed defaults (create-pages.php, create-learn-pages.php, seed.sh, preflight.php) and comments; the routes are tokens ({{pilot}}, PILOT_BASE) at run time",
            "production-origin": "outgoing links and option defaults to the live site (read-only); see HANDOVER.md for the list and how to override",
        },
    }


if __name__ == "__main__":
    main()
