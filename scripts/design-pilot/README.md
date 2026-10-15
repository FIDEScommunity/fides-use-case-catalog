# FIDES design pilot (local only)

A local trial of the new FIDES design for the use-case catalog. It runs on a
separate WordPress copy with its own database. Nothing here is deployed, and
the existing pages (`/use-cases/`, the homepage) are not changed.

Branch `feature/fides-design-pilot` in two worktrees:

| Worktree | Contents |
| --- | --- |
| `fides-community-tools-tiles` | Shared design layer: `assets/design-system.css`, `assets/design-system.js` (`window.FidesDS.card`), `includes/class-fides-ds-card.php` (`Fides_DS_Card::render`), self-hosted Inter, and the site shell (`includes/class-fides-ds-site-shell.php`, `templates/site-shell.php`) |
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
| `run-tests.sh` | Run `tests/use-case-design-behaviour.php` and `tests/site-shell-behaviour.php` in the pilot WordPress (fixture data, mocked REST, no database writes) |
| `tests/run-shell-route.sh` | Visitor route in headless Chrome at 1440/1024/768/390/320 px: homepage fragment → overview → detail → back, dropdowns, mobile menu, section navigation; screenshots in `../screens/shell/`. Uses an existing Playwright install (`PLAYWRIGHT_MODULE`) and the server from `start-server.sh` |

`fides-design-pilot-guard.php` (installed as mu-plugin) blocks outgoing mail
and every outgoing HTTP request except GET/HEAD, so catalog data still loads
but nothing is published or synced. It also adds `noindex`, shows a
"Local design pilot" badge and maps the shell navigation to local pages
(`fides_site_shell_url`; destinations without a local page link to
fides.community). The mu-plugin is a copy: after editing it, copy it again to
`$PILOT_SITE/wp-content/mu-plugins/`.

## Site shell

The tiles plugin registers the page template **FIDES site shell**
(`fides-site-shell`). Only pages with that template get the blue header,
dropdown and mobile navigation, the footer and the white page frame; the theme
keeps rendering every other page, including the homepage. `create-pages.php`
sets the template on the three pilot pages (not on their parent page).
Catalog plugins render only their own content inside the shell.

Navigation destinations are fides.community paths. A site remaps them with
the `fides_site_shell_url` filter; returning `''` leaves a link out, and a
group or dropdown without links disappears. Destinations from the sitemap
without an existing page are not in the navigation: Knowledge index,
Intermediaries & connectors, Trust schemes, Get help choosing, Open Interop
Testbed and Ask FIDES.

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

## Behaviour tests

`scripts/design-pilot/run-tests.sh` exits non-zero on failure. It covers:
featured selection, fallback and missing records (including the settings
warning), non-HTTP identifiers kept as code, credential aliases linking to the
canonical record, copy link / canonical / related cards using the same detail
route, award and like display, the collapsible section navigation, the shell
template applying only to the pilot pages, remapped and dropped navigation
links, header/footer markup (unique ids, toggle targets, hidden dialog,
account link) and the contribute band. The regular `npm test` and the tiles
`phpunit` and card parity tests still apply.

## Not restored yet (no content parity claimed)

- Liking: the pilot rows and detail page show like counts but have no like toggle.
- Detail route: the pilot uses `/fides-design-pilot/use-case/?usecase=<id>`
  for copy link and canonical. Production needs one decided detail route with
  matching canonical, redirects from the old `?usecase=` modal links and metadata.
- Site shell: dropdowns, the mobile menu and the desktop section tabs need
  JavaScript (without it the links in the panels are not reachable). Search
  uses the WordPress search, whose results page still renders in the old theme.
  Blocksy and Complianz styles and scripts still load on shell pages. The
  shell is a page template; other page types (search, archives, posts) and
  the other catalogs are not on it yet.
- Consent: locally Complianz writes its cookie on path `:10088/`, so a choice
  does not persist across pages; the route test presets the cookie.
- Cache busting: the design CSS/JS use `filemtime` versions, but
  `usecase-catalog.js` still uses `FIDES_USE_CASE_CATALOG_VERSION` (0.21.11);
  bump the plugin version before any staging build.
- Environment: the pilot database runs on utrecht-demo's MySQL in Local;
  simplify this before using the pilot as a daily dev environment.

## Rollback

1. `scripts/design-pilot/teardown-site.sh` (stops the server, drops `fides_design_pilot`, deletes the pilot WordPress copy).
2. From each main checkout: `git worktree remove ../fides-design-pilot/<repo>` and `git branch -D feature/fides-design-pilot`.

Nothing outside the pilot folder, the pilot database and these branches is touched.
