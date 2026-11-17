#!/usr/bin/env python3
"""Check the 51 Learn SEO titles and descriptions in the manifest."""
import json
import sys
from pathlib import Path

manifest = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "learn/manifest.json")
data = json.loads(manifest.read_text(encoding="utf-8"))
pages = [
    page for page in data["pages"]
    if page.get("tree", "learn") == "learn" and page.get("path") != "sessions/request"
]
errors = []
if len(pages) != 51:
    errors.append(f"expected 51 Learn pages, found {len(pages)}")
titles = []
descriptions = []
old = "Join an open training in Utrecht"
for page in pages:
    path = page.get("path") or "(overview)"
    title = (page.get("seo_title") or "").strip()
    description = (page.get("seo_description") or "").strip()
    titles.append(title)
    descriptions.append(description)
    if not title.endswith(" | FIDES Community"):
        errors.append(f"{path}: title does not use the FIDES Community suffix")
    if not description or description[-1] not in ".?!":
        errors.append(f"{path}: description is empty or does not end a sentence")
    if "  " in description or description != description.strip():
        errors.append(f"{path}: description has doubled or trailing space")
    if old in description:
        errors.append(f"{path}: description still uses the old training sentence")
    for banned in ("staging.fides.community", "utrecht-demo.local", "localhost", "127.0.0.1"):
        if banned in title or banned in description:
            errors.append(f"{path}: metadata contains {banned}")
overview = next(page for page in pages if page["path"] == "")
sessions = next(page for page in pages if page["path"] == "sessions")
if overview["seo_title"] != "Learn about digital wallets and credentials | FIDES Community":
    errors.append("overview title differs")
if overview["seo_description"] != "Explore digital wallets, credentials and the roles behind them. Follow a learning route or discover training and workshops for your team.":
    errors.append("overview description differs")
if sessions["seo_title"] != "Digital wallet training & workshops | FIDES Community":
    errors.append("training title differs")
if sessions["seo_description"] != "Explore training and workshops on digital wallets and credentials for individuals and teams, including open training and in-house sessions.":
    errors.append("training description differs")
if len(set(titles)) != len(titles):
    errors.append("SEO titles are not unique")
if len(set(descriptions)) != len(descriptions):
    errors.append("meta descriptions are not unique")
if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)
print(f"SEO check passed for {len(pages)} Learn pages")
