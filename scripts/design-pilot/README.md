# FIDES design pilot (local only)

A local trial of the new FIDES design for the use-case catalog. It runs on a
separate WordPress copy with its own database. Nothing here is deployed, and
the existing pages (`/use-cases/`, the homepage) are not changed.

Branch `feature/fides-design-pilot` in two worktrees:

| Worktree | Contents |
| --- | --- |
| `fides-community-tools-tiles` | Shared design layer: `assets/design-system.css`, `assets/design-system.js` (`window.FidesDS.card`), `includes/class-fides-ds-card.php` (`Fides_DS_Card::render`), self-hosted Inter |
| `use-case-catalog` | Use-case mapping and pilot views (this folder plus the plugin includes below) |

## Scripts

All paths live in `env.sh`. The MySQL server is the one from Local's
utrecht-demo, so that site must be running in Local.

| Script | Purpose |
| --- | --- |
| `setup-site.sh` | Copy utrecht-demo into `$PILOT_SITE`, create database `fides_design_pilot`, symlink the two pilot plugins, install the guard mu-plugin |
| `start-server.sh` | Serve the pilot on `http://localhost:10088` (IPv4 and IPv6; port 10080 is blocked by Chrome) |
| `create-pages.sh` | Create or update the pilot pages and the default homepage feature |
| `teardown-site.sh` | Stop the server, drop the pilot database, delete the pilot files |

`fides-design-pilot-guard.php` (installed as mu-plugin) blocks outgoing mail
and every outgoing HTTP request except GET/HEAD, so catalog data still loads
but nothing is published or synced. It also adds `noindex` and shows a
"Local design pilot" badge.

## Pilot pages

- `/fides-design-pilot/overview/`: `[fides_use_case_catalog design="pilot" detail_url="/fides-design-pilot/use-case/" add_url="/use-case-form/"]`
- `/fides-design-pilot/use-case/`: `[fides_use_case_detail id="…" listing_url="/fides-design-pilot/overview/"]`; other records open with `?usecase=<id>`
- `/fides-design-pilot/homepage-fragment/`: existing homepage hero text plus `[fides_use_case_featured detail_url="/fides-design-pilot/use-case/"]`

Without `design="pilot"` the catalog shortcode renders exactly as before.

## Changing the featured use case

Settings → FIDES Use Case Catalog → **Homepage feature**. Pick the featured and
fallback use case by stable catalog id; the preview uses the same card as the
page. An id that is no longer in the catalog is skipped (the fallback is used)
and the settings page shows a warning. A single placement can override the
setting with `[fides_use_case_featured id="<catalog-id>"]`.

## Rollback

1. `scripts/design-pilot/teardown-site.sh` (stops the server, drops `fides_design_pilot`, deletes the pilot WordPress copy).
2. From each main checkout: `git worktree remove ../fides-design-pilot/<repo>` and `git branch -D feature/fides-design-pilot`.

Nothing outside the pilot folder, the pilot database and these branches is touched.
