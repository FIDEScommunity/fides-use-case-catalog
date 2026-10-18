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
| `tests/run-shell-route.sh` | Visitor route in headless Chrome at 1366×768 and 1440/1100/1024/768/390/320 px: homepage fragment → overview → detail → back, dropdowns, mobile menu, section navigation, filters with Escape/focus, pagination, long titles and the logo back to the homepage fragment; screenshots in `../screens/shell/`. Uses an existing Playwright install (`PLAYWRIGHT_MODULE`) and the server from `start-server.sh` |
| `tests/run-overview-detail-checks.sh` | Overview and detail behaviour (brief 2026-10-18) in headless Chrome; screenshots in `../screens/overview-detail/` |
| `tests/run-measure-density.sh <label>` | Measure computed type sizes, Explore panel height, first result position, controls under 44 px and overflow at seven viewports; writes `measurements.json` and screenshots to `../screens/density-<label>/` |

`fides-design-pilot-guard.php` (installed as mu-plugin) blocks outgoing mail
and every outgoing HTTP request except GET/HEAD, so catalog data still loads
but nothing is published or synced. It also adds `noindex`, shows a
"Local design pilot" badge and maps the shell navigation to local pages
(`fides_site_shell_url`; destinations without a local page link to
fides.community). The logo (`/`) maps to `/fides-design-pilot/homepage-fragment/`
in the pilot only; the active homepage is not touched. The mu-plugin is a copy: after editing it, copy it again to
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
Testbed and Ask FIDES. Glossary sits under Explore → Discover until
Learn & connect has more existing destinations.

Compactness (DS1.1): type roles and density come from tokens in
`design-system.css` (`--fides-ds-hero-*`, `--fides-ds-h1-*`,
`--fides-ds-detail-h1-*`, `--fides-ds-card-*`, `--fides-ds-count-*`,
`--fides-ds-menu-*`, `--fides-ds-catalog-*`) with mobile values first and
overrides at 600, 1100 and 1440 px. Headings use `fides-ds-heading-hero`,
`fides-ds-heading-1` and `fides-ds-heading-1--detail`. Dropdown links have no
descriptions; article text stays 18/29.

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
canonical record, share link / canonical using the same detail route, award
and like display, the collapsible section navigation, the shell template
applying only to the pilot pages, remapped and dropped navigation links,
header/footer markup (unique ids, toggle targets, hidden dialog, account
link), the contribute band, and the detail page: organisations in their own
block, invalid source URLs without destination, ecosystem summary without
organisations, wide/compact variant, groups over three records closed on
narrow screens, exact duplicates counted once, internal / external /
unlinked records, Themes/Tags, update bar at the bottom, no related cards
or promo. The regular `npm test` and the tiles
`phpunit` and card parity tests still apply.

Browser checks (system Chrome plus an existing Playwright install, all exit
non-zero on failure):

- `tests/run-shell-route.sh`: homepage fragment → overview → detail → back at
  1366, 1440, 1100, 1024, 768, 390 and 320 px, including Theme, Status under
  More filters, active filter removal, Clear filters, search, pagination, long
  titles and the Ecosystem anchor.
- `tests/run-ux16-checks.sh`: blocks GitHub for one browser context to force
  the catalog fallback, then checks the stale-data notice, a 44×44 dismiss
  button and no functional target under 44 px (with a self-test that a 20 px
  button is caught).
- `tests/run-overview-detail-checks.sh`: overview row card (one link,
  180×112 media, 2-line summary), search on Enter, lists that stay open on a
  choice, Escape order (list, then More filters), OR within / AND between
  technical groups, Clear filters keeping the search, Back restoring URL
  state and focus, Back to results; mobile Filters dialog (focus, Cancel,
  Escape, Apply). Detail at 1440/768/390/320 for the three example records
  (`DETAIL_SLUGS`): 800/64/480 columns, mobile order, accordions, technical
  details closed, Show all organisations, Read full / Show less position,
  anchors opening hidden content, gallery selection and in-place play,
  invalid links, 44 px targets and overflow.
- `tests/run-measure-density.sh <label>`: first row and image positions,
  text sizes, the catalog source per viewport and GitHub request timings;
  fails on small controls or horizontal overflow.
- `tests/probe-catalog-source.cjs` (`RUNS=5`): which catalog source each cold
  load used and how long each request took.

## Catalog data source

The overview loads `aggregated.json` from GitHub raw first, then the
same-origin last-known-good cache (`/wp-json/fides-catalog/v1/aggregated/usecase`),
then the plugin copy, with a 4 s timeout per source. The source used is on the
root as `data-catalog-source`. `localhost` is not a `*.local` host, so the
pilot guard sets `fides_use_case_catalog_prefer_local_source` to `false`
(GitHub first, as in production). Without the filter (`null`) the shared
loader keeps its host detection. A stale-data notice therefore means GitHub
did not answer in time; the cache is only as fresh as its last successful
refresh.

## UX round 16 (Paper 16.1 / 16.2)

- Overview: catalog title role `fides-ds-heading-1--catalog` (38/44 from
  1100 px, not a global H1 change), Add a use case link, intro from the
  enclosed shortcode content, one search row with Ask FIDES, Theme / Sector /
  Country / More filters (Status inside More filters), removable active
  filters, one results counter next to Sort.
- Detail: the sidebar shows a per-role summary before the technical details;
  the full Connected ecosystem section (`#ecosystem`) follows the story and
  user journey, before Video & links.

## Overview and detail (brief 2026-10-18, Paper 17.1 B, 18.x, 19.7)

- Overview: row card 17.1 B from the shared `Fides_DS_Card` / `FidesDS.card`
  row variant (title and arrow one link, linked organisation, facts line).
  Filter lists use the shared `[data-fides-ds-popover]` behaviour; More
  filters is an in-flow panel; below 600 px all filters sit in one Filters
  dialog with temporary choices. Search, filters, sort and page are in the
  URL; `FidesDS.rememberReturn()` feeds the detail page's Back to results.
- Detail: one template for every record; blocks render only for present
  fields. Shared narrow-screen behaviours in `design-system.js`:
  `[data-fides-ds-collapsible]`, `[data-fides-ds-readmore]`,
  `[data-fides-ds-show-all]`, `[data-fides-ds-gallery]` and anchors that open
  hidden content. Without JavaScript all content stays visible.

## Not restored yet (no content parity claimed)

- Liking: the pilot rows and detail page show like counts but have no like toggle.
- Detail route: the pilot uses `/fides-design-pilot/use-case/?usecase=<id>`
  for the share link and canonical. Production needs one decided detail route with
  matching canonical, redirects from the old `?usecase=` modal links and metadata.
- Site shell: dropdowns, the mobile menu and the desktop section tabs need
  JavaScript (without it the links in the panels are not reachable). Search
  uses the WordPress search, whose results page still renders in the old theme.
  Blocksy and Complianz styles and scripts still load on shell pages. The
  shell is a page template; other page types (search, archives, posts) and
  the other catalogs are not on it yet.
- Consent: locally Complianz writes its cookie on path `:10088/`, so a choice
  does not persist across pages; the route test presets the cookie.
- Cache busting: the design CSS/JS and `usecase-catalog.js` use `filemtime`
  versions; bump the plugin version before any staging build anyway.
- Shared notice CSS: only the use-case copy of `fides-catalog-ui.css` is
  synced with the tiles source; the other catalog repos are not in the pilot
  and keep the old dismiss button (about 20 px) until they are synced.
- Environment: the pilot database runs on utrecht-demo's MySQL in Local;
  simplify this before using the pilot as a daily dev environment.

## Rollback

1. `scripts/design-pilot/teardown-site.sh` (stops the server, drops `fides_design_pilot`, deletes the pilot WordPress copy).
2. From each main checkout: `git worktree remove ../fides-design-pilot/<repo>` and `git branch -D feature/fides-design-pilot`.

Nothing outside the pilot folder, the pilot database and these branches is touched.
