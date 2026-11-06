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
| `tests/run-filter-dialog-checks.sh` | Filters dialog on all five overviews: a draft choice at 390 kept through 390 → 1440 → 390 → 1440 (dialog, scroll lock, focus trap) until Apply or Cancel / Escape, focus on a visible Filters or More filters button afterwards, normal close at 390, removable pills ≥44px at 1100/1440 with mouse and touch and at 320/390, and no wheel chaining at the bottom of a long dialog; screenshots in `../screens/filter-dialog/` |
| `tests/run-more-filters-checks.sh` | Shared More filters pattern (Paper 20.45) on the credential, personal and business wallet, organization and use-case overviews at 1440/1280/1100/1024/768/390/320 (`MORE_WIDTHS`); screenshots in `../screens/more-filters/` |
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

- `/fides-design-pilot/personal-wallets/`: `[fides_wallet_catalog type="personal" design="pilot" title="Personal wallets" detail_url="/fides-design-pilot/wallet/" add_url="/wallet-submit/" cross_url="/fides-design-pilot/business-wallets/" intro="…"]`
- `/fides-design-pilot/business-wallets/`: the same with `type="organizational"` and `cross_url` to the personal overview
- `/fides-design-pilot/wallet/`: `[fides_wallet_detail id="credenco-business-wallet" personal_listing_url="…" business_listing_url="…" use_case_detail_url="/fides-design-pilot/use-case/"]`; other records open with `?wallet=<id>`

- `/fides-design-pilot/credentials/`: `[fides_credential_catalog design="pilot" title="Credential Types" detail_url="/fides-design-pilot/credential/" add_url="/credential-submit/" intro="…"]`
- `/fides-design-pilot/credential/`: `[fides_credential_detail id="cred:eu:ehic" listing_url="/fides-design-pilot/credentials/" use_case_detail_url="/fides-design-pilot/use-case/"]`; other records open with `?credential=<id>`

Without `design="pilot"` the catalog shortcodes render exactly as before.

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
- More filters: superseded by the shared pattern (2026-10-23, below).
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
- Technical filters has its own row in More filters, from the left edge
  (full-width disclosure row since 2026-10-23).
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

## Wallet catalog (pilot brief 2026-10-20)

- One plugin, one template: personal and business overviews are the same
  `wallet-catalog.js` pilot path (`data-design="pilot"`, organization-style
  rows, popovers, More filters, mobile Filters dialog, pager, return context);
  the detail page is `Fides_Wallet_Detail_Page` for both types
  (`fides-wallet-detail--personal|business`). Styles: `wallet-design.css` on
  top of `organization-design.css` (the wallet pilot depends on the
  organization pilot plugin).
- URL state: `q`, `sort` (default `explore`), `catalog_page`, one parameter per
  filter (`platform`, `availability`, `capability`, `country`, `profile`,
  `format`, `issuance`, `presentation`, `identifier`, `keystorage`, `alg`,
  `credstatus`, `provider`, `license`) and the flags `new`, `eudi`, `official`.
  Old `?wallet=` links on a pilot overview open the pilot detail.
- Rights: `Fides_Wallet_Design::can_edit()` mirrors `userCanEditWallet()`
  (tier UI off: admin or signed in; on: admin, unlinked, not Pro, or owner).
  Guests only see "Sign in to suggest an update" on Community listings.
  Full fields follow `walletListingTierIsPro` / curated-full / `fullOrgIds`.
- If the catalog data does not load, the classic server list is revealed with
  an alert instead of an empty catalog.
- Tests: `tests/wallet-design-behaviour.php` (in `run-tests.sh`, fixtures only)
  and `tests/run-wallet-checks.sh` (overviews, six detail records at
  1440/1280/768/390/320, glossary, eIDAS, classic modal deep links; screens in
  `screens/wallets`).

## Credential catalog (Paper 20.7 / 20.8 / 20.18 / 20.19 / 20.33–20.41)

- Overview: `credential-catalog.js` pilot path (`data-design="pilot"`), same
  rows, popovers, More filters, mobile Filters dialog, pager and return
  context as the other catalogs; compact rows only (no list/grid switch, as
  in Paper; a stored grid preference is ignored). Styles: `credential-design.css` on top of
  `organization-design.css`. Detail: `Fides_Credential_Detail_Page`
  (`[fides_credential_detail]`), data and rules in `Fides_Credential_Design`.
- Overview controls (Paper 20.7): search label with Ask FIDES, then field and
  Search as one group (at most 720 px from 600 px), then the five filter
  buttons together (wrapping on tablets, never a four-slot grid), then the
  quick filters; 40 px controls from 1100 px with a fine pointer, otherwise
  44 px. Credential-only overrides in `credential-design.css`.
- Search (credential-refinements-2026-10-23 § 5, pilot only; the classic
  listing keeps its substring search): applied on Enter / Search. Fields are
  title, description, native identifier, authority, tags, taxonomy codes and
  labels and attribute names, split on separators and camelCase (keeping the
  unsplit word, so "mDL" is also "mdl"). Words of up to four characters match
  a whole word or a word start; longer words, and words with an inner
  separator (`birth_date`, `eu.europa.ec`), match as a substring. Every word
  must occur in the record. "Relevance" tiers: exact title; every word a title
  word, or a title prefix; every word an exact tag, identifier segment or
  authority word; other title matches; the rest — ties by title, then id. The
  pure helpers sit between `pilot-search:begin` / `:end` and are checked on
  their own by `credential-checks.cjs`.
- URL state: `q`, `sort` (only an explicit choice; the default is Relevance
  with a query and `rating` without; an explicit sort survives a new query and
  Clear, an explicit Relevance ends with the query), `catalog_page`, `subject`,
  `format`, `ecosystem`, `authority`, `sector`, `theme`, `schema`, the flags
  `new`, `rp`, `ts11`, and `credentials` (aliases are canonicalized). Old
  `?credential=` links on the pilot overview open the pilot detail; the detail
  page accepts format ids and legacy aliases and sets the canonical to the type id.
- "TS11 metadata" marker (same criteria as the classic "TS11 compliant"
  filter, `isTs11SchemaMetaComplete`): attestationLoS, bindingType, rulebook,
  a format with a TS11 identifier and any schema URI. The API check
  (`toTs11SchemaMeta`) additionally needs a semantic version and trusted
  authorities, so a marked record (EUCC) can still be "Partial" there. The
  detail shows both; the Explain dialog lists provided and missing fields.
- Formats: identifiers and schema links per format (tabs when there is more
  than one); the attribute index is shared at type level and labelled as such.
  Fields under an array (`<array>/item/<field>`) nest under the array. Source
  notes (schema `$comment` as "Schema source note", schema description,
  metadata endpoint) are shown as given; missing data reads "Not provided".
- `schemaComment` comes from the crawler and is not in the committed
  `aggregated.json` until the next CI crawl. The guard serves
  `<pilot>/local-data/credential-aggregated.json` when that file exists (a
  local `npm run crawl` output, kept out of git because it holds local
  `catalogUrl` paths); without it the source note is simply absent.
- Mobile (< 600 px): the logo sits on its own compact row above the kicker so
  long names get the full width.
- Detail layout (Paper 20.8 / 20.19 / 20.33–20.35): the main column holds
  Overview, Use cases and Attributes (its own section, `#attributes`); the
  context column holds Credential details (Authority, Subject type, Category,
  Ecosystem, Theme, Sectors — only when recorded), Formats & identifiers (with
  the Schema description and Schema source note), Schema metadata · TS11, Tags
  (shared `fides-ds-tags`, `#` is presentation only) and Sources & catalog data
  (data source and API record only; schema links stay with their format).
  The page navigation lists Attributes and Formats & identifiers separately.
  Below 1100 px the context blocks follow the main content as light-blue
  frames; Formats, TS11 and Sources are the shared accordions (Formats open,
  TS11 and Sources closed, 56 px rows), Credential details and Tags stay open.
  Category shows a display label (`Fides_Credential_Design::category_label`,
  e.g. health → Health); the recorded code, filters and API are unchanged.
- Compact TS11 (Paper 20.39): the marker line with Explain, then a short
  explanation built from field presence only (e.g. EHIC "2 supported formats.
  Rulebook, trusted authorities, security level and holder binding are not
  provided."). All fields sit behind "View technical metadata" /
  "Hide technical metadata" (a real button with `aria-expanded` /
  `aria-controls`, 44 px, closed at every width; visible without JS) with
  readable labels: Metadata ID, Version, Rulebook, Trusted authorities,
  Security level, Holder binding, Formats (TS11), Source URIs, API metadata
  coverage. Source URIs are named by kind with the existing
  `is_metadata_endpoint` check: "issuer metadata endpoint" (Open Badge:
  "1 issuer metadata endpoint; not an attribute-schema link"), "schema link"
  for a typed schema, otherwise a generic "source link". The API projection
  (`schemaURIs`, missing list, level) is unchanged.
- "Credentials & attestations" (Paper 20.35): a `<template>` opened through the
  shared term dialog from Credential details and from the overview intro
  ("EUDI terminology"). It explains EAA, QEAA, PID and the public-sector
  category; no record is classified and no EAA/QEAA status is derived.
- Ecosystem connections (Paper 20.36–20.38): a full-width band between the
  main/context columns and the closing, with "Who issues it?", "Which
  wallets?" and "Where is it accepted?" (counts from the data; Age
  Verification is the rich example, its numbers are a snapshot). Wallets are
  the ones the linked relying parties name in `supportedWallets` with a
  `walletCatalogId` (deduplicated by id, intro "Wallets named by these
  relying parties.", second line "Named by X [and other services]" from the
  same links, no status slot); no compatibility is derived and without such
  links that role is "Not specified". With at least one link all three roles
  show (Paper 20.41), side by side from 1280 px
  (`data-fides-ds-wide-min="1280"` on the collapsible) and stacked below;
  each shows three rows A–Z with its own "View all N" / "Show fewer" and the
  count as the shared small badge (14/22, 400, info surface) beside the
  20/26 heading. Narrower, roles with links are shared collapsibles in the
  same order, closed by default, with equal heads (question, "Role · N",
  chevron; the badge only when open) that open with the full list
  (`data-fides-ds-show-all-follow`). A role without links is a static block
  in the same box: wide "Not specified" plus its reason, narrow
  "Role · Not specified" and the shared line "Not specified means no link is
  recorded in this catalog." — no badge, list, button, link or chevron.
  Without any link the section and its navigation entry are hidden. A note below
  the band says the catalog connections do not guarantee that every issuer,
  wallet and service works together; no arrows or row alignment. Rows are the shared relation row
  (`.fides-org-eco__row`: no negative margins, so row, divider, hover and
  focus share one outer edge; 16 px / 12 px padding; hover is the info
  surface `--fides-ds-soft` with only the name underlined; focus is a 2 px
  brand ring inset in the row) with name, organization · country and the recorded
  status: issuer `environment`, relying-party `readiness` as Production /
  Pilot / Demo / Technical demo, otherwise "Not specified". Rows open
  `?issuer=` / `?rp=` / the wallet record (pilot `?wallet=`, otherwise
  `?wallet=` in the wallet catalog, which opens `/wallet/<id>/`); under a full list the filtered catalog route (`?issuers=a,b` /
  `?wallets=a,b` / `?rps=a,b`) appears; up to three rows need no toggle.
- Hero formats (Paper 20.8): "Formats" with one static label per format
  (14/22, 500, brand-strong on the info surface, 1px divider border; no
  cursor, role, hover or tab stop), then "Subject · …", the TS11 marker and
  the update date as separate metadata.
  No internal scroll areas. The closing is the shared light-blue band of 20.6.
- Shared show-all (tiles `design-system.js`): optional
  `data-fides-ds-show-all-more` / `-fewer` labels and `-follow` (open the list
  with its collapsible). "Show fewer" keeps its button in the same place on
  screen, for every show-all list. A collapsible may set
  `data-fides-ds-wide-min="<px>"` to stay an accordion up to a wider
  breakpoint than the default 1100 px.
- Public catalog links (classic modal and pilot): defaults are constants in
  `fides-credential-catalog.php` — relying parties
  `https://fides.community/ecosystem-explorer/relying-party-catalog/`
  (the former `/community-tools/relying-party-catalog/` now redirects to an
  image), wallets `https://fides.community/ecosystem-explorer/personal-wallets/`
  (the former `/community-tools/personal-wallets/` works only through a
  WordPress redirect; `https://wallets.fides.community` does not resolve).
  Stored options win; missing or empty options use the default. A query in a
  stored base is kept. Local sites keep their local wallet, organization and
  trust-scheme routes. Stored former defaults are not rewritten at runtime:
  `credential-catalog/scripts/migrate-catalog-url-options.php` (WP-CLI
  `eval-file`; dry run by default, `apply <backup.json>`, `rollback
  <backup.json>`) replaces only those exact values and keeps custom ones.
- Rights: `Fides_Credential_Design::can_edit()` mirrors
  `userCanEditCatalogItem`; guests see "Sign in to suggest an update".
- Tests: `tests/credential-design-behaviour.php` (in `run-tests.sh`, real
  records plus fixtures, including link building for defaults, stored
  options and the public wallet fallback),
  `tests/run-public-link-checks.sh` (read-only, needs network: opens the real
  fides.community destinations of the classic modal and pilot links and checks
  HTML, the selected record or filter, and Back from a real click) and
  `tests/run-credential-checks.sh` (offline, labelled stub for external
  links; the search contract on its pure helpers with synthetic and source
  fixtures, no fixed totals; overview state, search relevance, explicit
  sort, Clear, pager and detail/Back with a query, dialogs, More filters
  with Listing, TS11 Explain and the Technical filters row, the compact bar
  at 1440/1320/1280/1200/1100/1024/768/390/320 (expected layout per width,
  one Ecosystem control, a long selected label) and Ecosystem keeping its
  value across 1280 → 1440 → 768 → 1280; five records at 1440/1280/768/390/320 including the column
  split, static format labels, navigation and narrow-screen accordion states;
  the ecosystem band for Age Verification at 1440/1280/1279/1200/768/390/320
  including the count badge, wallet links and back navigation, plus EHIC,
  loyalty, Open Badge, EUCC, Aadhaar and a record without relations at
  1440/1320/1319/1280/1279/1200/1199/1100/768/390/320; screens in
  `screens/credentials`).
- Not in the data, so not shown: resolved trust schemes for mDL. "View API record"
  links to `https://api.fides.community/api/public/credentialtype/<id>`
  (override with the `fides_credential_catalog_public_api_base` option).

## Shared More filters and compact credential bar (2026-10-23)

Paper 20.45 / 20.42 and `docs/site-redesign/shared-more-filters-2026-10-23.md`
plus `credential-compact-filterbar-2026-10-23.md`.

- One More filters pattern in `usecase-design.css` for credentials, personal
  and business wallets, organizations and use cases: a white in-flow panel
  under the primary row with a 2px brand top line and a 1px bottom line, no
  shadow; "More filters" 20/26 semibold with a 44px close button and no
  total; extra lists side by side (300px, 16/24 gaps); checkbox groups
  (Listing, or Awards for use cases) on their own line below; then the
  Technical filters disclosure row (16/24 title, muted field summary, chevron
  at the far end, at least 56px, closed by default; `aria-expanded` /
  `aria-controls`) with its lists below a light line. Organizations have no
  technical row. Mobile: the same groups stacked in the Filters dialog.
- Field mapping only; no filters added or removed. Credentials: Sector and
  Theme as lists, Listing (Added in last 30 days, Used by relying parties,
  TS11 metadata with Explain) inside More filters, Schema type under
  Technical filters. The More filters badge counts these selections; the
  intro sentence and the separate Listing row are gone.
- Credential bar: the script measures the bar on render, resize and
  selection changes and sets `data-pilot-layout` on the root: `full` (search,
  Search, Subject, Format, Ecosystem, Authority, More filters on one line;
  1440), `reduced` (Ecosystem first in More filters; 1200–1320) and, when
  that still leaves less than 280px for the input, `data-pilot-short` hides
  unselected values visually (labels only, value kept in the accessible name;
  1024–1100). Otherwise `compact`: the search group plus the Filters dialog
  (768 and below; the dialog CSS above 600px is mirrored in
  `credential-design.css`). Ecosystem is one DOM node that moves, so its value,
  pill and URL never reset; a selection change never moves it while it holds
  focus, a resize does and returns focus to it or to More filters.
- Filters dialog (all five overviews): resizing is not a cancel. An open
  dialog keeps its dialog layout above 600px (shared `.is-open` rules at the
  end of `usecase-design.css`), with its draft choices, scroll lock and focus
  trap, until Apply or Cancel / Escape. After closing, the final layout is
  settled first; focus then goes to the visible Filters button or, when the
  layout no longer shows it, to More filters.
- Controls stay 40px only at 1100px+ with a fine pointer; removable filter
  pills, the More filters close button and option labels keep 44px at every
  width and pointer type, the technical row 56px.
- Deviations from Paper: the search input takes the width the bar leaves
  (about 390px at 1440, up to about 450px at 1320); at 1024px the three lists
  in credential More filters wrap to two lines (300px fields); the Filters
  dialog above 600px is full-screen with its content capped at 720px.

## FIDES Learn pilot (Paper page 16, 2026-11-03)

Learn overview, topics, two sections and two example articles at
`/fides-design-pilot/learn/`, built as ordinary pages on the "FIDES Learn" template
(tiles 1.13.33) inside the shared shell. Seeding, overwrite protection, backup and
restore check, staging dependencies and maintenance are described in
[`learn/README.md`](learn/README.md). Scripts: `create-learn-pages.sh`,
`backup-pilot.sh`, `restore-check.sh` (`teardown-site.sh` now requires a snapshot that
passed the restore check). Tests: `tests/run-learn-checks.sh`,
`tests/run-learn-seed-checks.sh`, `tests/learn-behaviour.php` (in `run-tests.sh`).

## Global Digital Trust Awards (Paper 28.2 / 28.3, 2026-11-06)

One ordinary page, `/fides-design-pilot/global-digital-trust-awards/`, with the site shell template and normal core
blocks (group, heading, paragraph, image, gallery, details, list, buttons). Editors change texts, images, the
gallery and the accordions in the block editor; nothing editorial is stored in PHP.

- Content: `awards/content/awards.html` (block markup, seeded by `create-pages.sh`). Image references are tokens
  (`{{aw:id:KEY}}`, `{{aw:url:KEY[:size]}}`); `awards/manifest.json` lists the 83 original images of the live page
  (5 winner banners, 71 ceremony photos, jury image, 6 partner logos). The seed downloads each one once into the
  media library (needs network; without it the page is skipped and reported as `skipped-images`).
- Same edit protection as the other pilot pages: a page an editor changed is skipped, `PILOT_FORCE=<path>` replaces it.
- Styles and the small anchor script: `fides-community-tools-tiles/assets/awards.css` / `awards.js`, enqueued by the
  site shell for pages whose content carries the `fides-awards` wrapper class. The script only opens the accordion an
  anchor points to.
- Accordions are `core/details` blocks, closed by default. Anchors: `#winners`, `#finalists`, `#highlights`,
  `#categories`, `#jury` (and `#about`, `#finalists-<category>`); a link or deep link opens the row it targets.
- Repair round (2026-11-06): the section menu is the shared `fides-ds-section-nav` of the use-case detail page
  (sticky white bar from 1100px, 2px blue current-section underline, "On this page" disclosure below, anchors clear
  it by 80px). The editor keeps a plain anchor list; `Fides_DS_Awards` (tiles) turns it into the shared markup on
  render and adds the catalog image (use case `imageUrl`, wallet `logo`) next to a finalist only when the record has
  one. Ranking titles 20/26, descriptions 17/27; closed rows are the 62px click row; winner cards share rows by
  subgrid so descriptions and actions align. Route map: `/awards/global-digital-trust-awards/` points to the pilot
  page in the guard and in `staging/fides-design-review-config.php`.
- Tests: `tests/awards-behaviour.php` (in `run-tests.sh`) and `tests/run-awards-checks.sh` (1440, 1024, 768, 390, 320).

### FIDES Community Awards (same template, 2026-11-06)

`/fides-design-pilot/fides-community-awards/` uses exactly the same page structure, classes, shared section menu and
styles as the Global Digital Trust Awards page (hero with report button, sticky section menu, winner cards, about band,
finalist accordions with catalog images, highlights / categories / jury accordions). Differences are content only: three
winners and three categories, 15 finalists, 20 Utrecht photos, no partner logos, the jury as a member list.

- Content: `awards/content/community-awards.html`, images in `awards/community-manifest.json` (24 originals). `create-pages.php`
  seeds both awards pages from one list.
- Menu: Ecosystem > Community Awards maps to the pilot page in the guard and in `staging/fides-design-review-config.php`.
- Tests: `tests/run-community-awards-checks.sh` (1440, 1024, 768, 390, 320) and the community block in `tests/awards-behaviour.php`.

## Staging preparation (`/design-review/`)

Everything for a later roll-out lives in `staging/` (see `staging/HANDOVER.md`). Nothing here connects to staging.

- `create-pages.php` now uses route tokens (`{{pilot}}`, `{{base}}`) and `PILOT_BASE` (default `fides-design-pilot`, staging `design-review`).
- Seeded pages carry a marker, a content hash and the seeded state. A re-seed skips pages edited since the seed (`skipped-edited`) and pages without a marker (`skipped-unmarked`). `PILOT_FORCE=<path,...>` replaces them after a backup. `PILOT_DRY_RUN=1` only reports. Options are only set when absent.
- Local pages created by older versions are adopted once (markers only, content unchanged).
- Hosts: `PILOT_ALLOWED_HOSTS` (default `localhost,127.0.0.1,staging.fides.community`). Production hosts are always refused.
- `staging/build-package.py` builds the package from committed HEAD, `staging/verify-package.sh` checks it, `staging/rehearse-staging.sh` installs it into a throw-away site on port 10089.

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
2. From each main checkout (tiles, use-case, organization, wallet, credential): `git worktree remove ../fides-design-pilot/<repo>` and `git branch -D feature/fides-design-pilot`.

Nothing outside the pilot folder, the pilot database and these branches is touched.
