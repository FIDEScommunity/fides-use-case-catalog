# Patch list 2026-11-10: Dutch link paths and awards images

Not a package: no new staging package is built. Replace exactly these files on staging, on top of package
`20261110-172125-11dbba5c` (everything else stays). Paths are relative to the package root as installed.

| File on staging | Source in the repo (use-case-catalog, scripts/design-pilot/) | SHA-256 |
|---|---|---|
| `wp-content/mu-plugins/fides-design-review-config.php` | `staging/fides-design-review-config.php` | `9a3e180eecae344e4b140a89e662c493b0bf5be8d61aaf1c7dd017f353731eaa` |
| seed: `seed/create-pages.php` | `create-pages.php` | `872539e225fca9e3d9477ab130e18fca03155729567a36ba70c5b5c2fc077f13` |
| seed: `seed/awards/manifest.json` | `awards/manifest.json` | `b8ef872a09c8573be9c2106a3fc8373c950cc8706d6d679a8b16a1db9be30717` |
| seed: `seed/awards/community-manifest.json` | `awards/community-manifest.json` | `3e1b965ce71ed82b00c44a9b6a1c23b3effa56196199a7b930631ff2804f73e4` |
| seed: `seed/awards/images/*` (107 files + `PROVENANCE.txt`) | not in Git: `<pilot>/local-data/awards-images/` | `SHA256SUMS` in that folder (also the sha256 per image in the two manifests) |
| `HANDOVER.md` (documentation only) | `staging/HANDOVER.md` | `56244688d56c55adde79909e55dfcbbfa135c37ae6451543c73991f364965313` |

No plugin zip changes (the tiles plugin is untouched). Not for staging: `router-standalone.php`, `build-package.py`, `verify-package.sh`,
`collect-awards-images.php`, `tests/*` (local tooling, they only matter for the next package build).

Verify the images after copying: `cd seed/awards/images && shasum -a 256 -c SHA256SUMS` (copy `SHA256SUMS` with the images).
