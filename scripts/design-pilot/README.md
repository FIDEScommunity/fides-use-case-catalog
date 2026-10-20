# FIDES design pilot (local only)

A local trial of the new FIDES design for the use-case and organization
catalogs. It runs on a separate WordPress copy with its own database. Nothing
here is deployed, and the existing pages (`/use-cases/`, `/organizations/`,
the homepage) are not changed.

Branch `feature/fides-design-pilot` in three worktrees:

| Worktree | Contents |
| --- | --- |
| `fides-community-tools-tiles` | Shared design layer: `assets/design-system.css`, `assets/design-system.js` (`window.FidesDS.card`), `includes/class-fides-ds-card.php` (`Fides_DS_Card::render`), self-hosted Inter, and the site shell (`includes/class-fides-ds-site-shell.php`, `templates/site-shell.php`) |
| `use-case-catalog` | Use-case mapping and pilot views (this folder plus the plugin includes below) |
| `organization-catalog` | Organization pilot overview (`design="pilot"` in `organization-catalog.js`) and detail page (`includes/class-fides-organization-design.php`, `includes/class-fides-organization-detail-page.php`, `assets/organization-design.css`) |

## Scripts

All paths live in `env.sh`. The MySQL server is the one from Local's
utrecht-demo, so that site must be running in Local.

| Script | Purpose |
| --- | --- |
| `setup-site.sh` | Copy utrecht-demo into `$PILOT_SITE`, create database `fides_design_pilot`, symlink the three pilot plugins, install the guard mu-plugin |
| `start-server.sh` | Serve the pilot on `http://localhost:10088` (IPv4 and IPv6; port 10080 is blocked by Chrome) |
| `create-pages.sh` | Create or update the pilot pages and the default homepage feature |
| `teardown-site.sh` | Stop the server, drop the pilot database, delete the pilot files |
| `run-tests.sh` | Run `tests/use-case-design-behaviour.php`, `tests/site-shell-behaviour.php` and `tests/organization-design-behaviour.php` in the pilot WordPress (fixture data, mocked REST, no database writes) |
| `tests/run-organization-checks.sh` | Organization overview and detail in headless Chrome (server render without JavaScript and the hand-over to the script, overview 1440/390/320, seven records at 1440/768/390/320); screenshots in `../screens/organizations/` |
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

- `/fides-design-pilot/organizations/`: `[fides_organization_catalog design="pilot" title="Organizations" detail_url="/fides-design-pilot/organization/" add_url="/organizations-submit/" intro="…"]`
- `/fides-design-pilot/organization/`: `[fides_organization_detail id="org:credenco" listing_url="/fides-design-pilot/organizations/" use_case_detail_url="/fides-design-pilot/use-case/"]`; other records open with `?org=<id>`

Without `design="pilot"` both catalog shortcodes render exactly as before.

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
  invalid links, 44 px targets and overflow. Repair round: Production
  deployment with two values through the URL, Back/Forward and the mobile
  dialog (Cancel/Apply); the narrow-screen preview ending on whole blocks
  with the rest hidden for focus and the accessibility tree, independent
  overview/journey toggles, focus after Show less, full text without JS;
  hero 792/520 and title 42/48 at 1440.
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

## Repair round (2026-10-18)

- Preview (`[data-fides-ds-readmore]`): whole blocks only. The first
  paragraph or step always shows in full, also when it is longer than the
  soft limit; later blocks get `hidden` (no `max-height` clip, no gradient),
  so sight, the accessibility tree and keyboard focus agree.
- Production deployment is a multi-select list like the other filters (OR
  within the group, `status=a,b` in the URL).
- More filters: one short head and one row (Production deployment, Awards,
  Technical filters); the technical group names only show while closed.
  Mobile: search and Search share a line, Ask FIDES sits next to the label,
  Filters and Sort share a row with the count under them, and row cards put
  the title before the image.
- Detail: hero 792/520 with a 32 gap and title 42/48 from 1100 px. A record
  with one image and no video gets an Open original image link under the
  hero image (fixture-tested; catalog data unchanged).

## Compact desktop (UX review 2026-10-18)

- Header bar 64 px from 1100 px (was 79). Catalog title 30/36, detail title
  34/40 from 600 px and 36/42 from 1100 px, detail section headings 26/32
  (24/30 below 1100 px).
- Controls are 40 px high only at 1100 px and wider with a fine pointer
  (mouse/trackpad); touch and narrower screens keep 44 px. The tests use the
  same threshold. Blocksy sets `height` on search inputs, so the override
  sets `height` too.
- From 1200 px search and the four filter buttons share one row.
- Row card media 120x75 from a 600 px card container; hidden below it.
- Detail: reading column (prose and steps) max 720 px, smaller section gaps.
  A video still used as hero is a link to `#media` with `data-fides-ds-play`
  that opens the gallery and starts the first video. A gallery with one
  video and no strip now plays from its stage button (`data-embed` on the
  button); before, that button did nothing.
- 1280x800 still shows two full result rows: row height is set by the text,
  not the controls. 1440x900 shows three.

## Review fixes (2026-10-19)

- Result rows keep 12 px inner padding for the hover fill but sit on the page
  edge (negative margin), flush with the heading; the arrow ends on the bar edge.
- Sort is plain text ("Sort by" + value + chevron, no box, Paper 02). Blocksy
  sets `height` on selects, so the rule sets it too.
- Search label and Ask FIDES share a baseline; the one-row search uses 12 px
  between every control.
- Technical filters has its own row in More filters, from the left edge.
- Arrow links: `<span>Label</span> <span aria-hidden="true">→</span>`. The
  shared rule in `design-system.css` underlines only the label (hover and
  current page); card CTAs split the arrow off the same way (PHP and JS).
- Explore further (Paper label) is back on the detail page, above the update
  bar; the contribute promo stays removed. See the review round below for the
  selection.
- Rows without an image keep the media column with a placeholder (organization
  name, else the title, in a light blue box); a broken image shows the same
  placeholder. Hidden on narrow rows like the image.
- Focused Sort shows a 2 px line under the value instead of an outline box;
  Chrome treats a clicked select as `:focus-visible`.
- The result count lives only in the results bar and stays visible when More
  filters opens (it moves down with the panel). The "More filters · N use
  cases" head count from Paper 02 is dropped so the number does not jump.

## Review round (2026-10-19, second review)

- Explore further uses `Fides_Use_Case_Design::similar_matches()`, a server
  port of `similarUseCaseMatch` / `similarUseCases` in `usecase-catalog.js`:
  shared theme bundle, credential, wallet, organisation or sector (no country
  match), the same rank, like count and title tie-breaks, the same reason
  text, own record excluded, at most three. It honours
  `fides_use_case_catalog_similar_cases_enabled()`; no match means no
  section. Tiles show that reason above the title and the organization below.
  `create-pages.php` adds `/fides-design-pilot/existing-listing/` (the
  existing listing with its modal) so the browser checks can compare both
  routes record by record.
- Sign in in the shared shell (`data-fides-ds-sign-in`, header and menu)
  rewrites `return_to` / `redirect_to` to the current URL when it is used, so
  client-side search, filters, sort, page and Back/Forward are kept. The login
  route and its redirect validation are unchanged.
- Explore further grid: at most three equal columns over the full width, CTAs
  on the bottom edge, tile titles 20/26. Detail section headings (Overview,
  User journey, Connected ecosystem, media, Explore further) share one role:
  26/32 from 1100 px, 24/30 below.
- Pager (Paper): "Page X of Y" on the left, Previous / numbers / Next on the
  right, with the edge action visible but disabled; below 600 px status plus
  Previous / Next; no pager for zero or one page. The existing listing keeps
  "Showing a–b of n".
- Row facts: every fact carries a 20 px separator and the list is pulled
  20 px left and clipped, so a wrapped line never starts with "·".
- Technical filters wrap as a flex row from each list's own width, so
  "Presentation protocol · Any" is not truncated at 1280 px.
- Not changed: the mobile detail hero (known review point) and the like
  toggle.

## Organization catalog (pilot brief v1, Paper 20.3 / 20.4 / 20.14 / 20.15 / 20.21)

- Overview: the existing organization filters, facets, search fields, sort
  and 48-row pages, rendered with the use-case pilot toolbar and the shared
  `FidesDS.card` row (logo 120×75 `contain`, name placeholder, role chips,
  "Country · N use cases · Updated date", arrow). Ecosystem role, Country and
  Sector are popovers; Certification (with QTSP / DIACC sub-options) and
  Official accounts only sit under More filters. URL state: `q`, `role`,
  `country`, `sector`, `cert`, `official`, `sort`, `catalog_page`; a legacy
  `?org=` on the overview opens the pilot detail. The contribute band is
  rendered by PHP next to the JS root.
- Detail: one server template (`[fides_organization_detail]`) from the same
  catalog source as the SSR core. Use cases come from the use-case catalog's
  `links.organizations[].refId` (the listing's runtime join), sorted by title;
  relations are listed per kind without derivation; news is the listing's
  `pro-news.json` (max five, http links only, `listingNewsEnabled`); media use
  the shared `Fides_DS_Gallery`. Suggest an update follows the modal's access
  rule; guests get the sign-in route. Community listings keep the content
  limits of the modal.
- Server-rendered first page (`includes/class-fides-organization-overview.php`):
  without a search or filter in the URL, PHP renders the whole overview
  (header, search, filter buttons, count, sort, the 48 rows of the requested
  page and sort through `Fides_DS_Card`, and the pager with real
  `?catalog_page=` links). No skeleton, and the page works without
  JavaScript. Once the catalog data has loaded, `renderPilot()` takes over
  search, filters, sort and paging; it keeps the server rows when they match
  its own render (no logo reload, no shift) and keeps typed text and focus.
  A stored sort preference or fresher browser data re-renders the rows. If the
  browser cannot load the data, the server page stays with a notice. URLs
  with `q`, `role`, `country`, `sector`, `cert` or `official` keep the
  client-side path (skeleton): the filter logic lives in the script only.
  Gated by `fides_catalog_ssr_enabled()`; otherwise the classic hidden SSR
  fallback is used as before.
- The classic `style.css` still loads (dependency of the shared catalog UI
  CSS); `organization-design.css` resets its ID-level root panel.
- `organization-catalog.js` and the classic plugin assets use the plugin
  version, not `filemtime`: hard-refresh after pulling JS changes.

## Organizations and use cases finishing round (2026-10-20, Paper 20.2 / 20.3 / 20.4 / 20.15 / 20.22)

- Shared top row (`Fides_DS_Detail_Top`, tiles): Back link, breadcrumb up to
  the catalog (never the record name) and one LinkedIn Share for the record
  URL. Below 600px the breadcrumb is hidden and Share is a 44×44 icon with
  the accessible name and tooltip "Share on LinkedIn". Copy link and the
  second LinkedIn action (organization section nav, use-case hero) are gone.
- Organization header: identity left, logo right (144×112 / 88×80,
  `contain`), no logo box without a logo; Official listing is a blue status
  badge; Manifesto supporter is a small secondary link.
- Ecosystem panel (`#ecosystem`, was `#relations`): separate groups in source
  order, three rows per group on every width through the opt-in
  `data-fides-ds-show-all-wide` (the default `data-fides-ds-show-all` stays
  narrow-only, so use cases are unchanged), full-row links. Below 1100px a
  closed accordion; section links open it.
- News: one source is named once in the intro; mixed sources stay per article.
- Profile closing "Profile information" replaces "Help keep this profile
  current": Contact (email / meeting link only, no second contact panel),
  "Update profile →" only when `update_url()` allows it, a sign-in route for
  guests only on Community listings (`sign_in_update_url()`), and "Catalog
  data on GitHub ↗" instead of the Sources section. The update form keeps its
  own server-side check.
- Contribute band: `Fides_Use_Case_Design::contribute_band()` renders both
  overviews (compact Paper 20.3 size); GitHub is named as data source only.
- Use-case detail keeps its own closing and "Suggest an update" route.

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
2. From each main checkout (tiles, use-case, organization): `git worktree remove ../fides-design-pilot/<repo>` and `git branch -D feature/fides-design-pilot`.

Nothing outside the pilot folder, the pilot database and these branches is touched.
