# FIDES Learn pilot (Paper page 16)

First Learn setup in the local design pilot. Local only: nothing here is merged,
pushed, deployed or synced to utrecht-demo.

## What exists

| Page | Route (base `/fides-design-pilot/learn/`) | Paper | Kind |
|---|---|---|---|
| Learn overview | `/` | 24.1, mobile 24.7 | overview |
| Topics | `topics/` | 24.2 | topics |
| The big picture | `topics/the-big-picture/` | 24.10 | section |
| For businesses | `topics/for-businesses/` | 24.12 | section |
| How credentials connect issuers, wallets and services | `topics/the-big-picture/how-credentials-connect/` | 24.18, mobile 24.20 | article |
| Business wallets: where to start | `topics/for-businesses/business-wallets-where-to-start/` | 24.19 | article |
| Sessions & workshops | `sessions/` | 24.3, mobile 24.8 | sessions |
| Wallet Introduction | `sessions/wallet-introduction/` | 24.4 | offering |
| Wallet Readiness Workshop | `sessions/wallet-readiness-workshop/` | 24.5 (same pattern) | offering |
| Session enquiry (local preview) | `sessions/request/?offering=<slug>` | 24.6 | request |

Local URLs: `http://localhost:10088/fides-design-pilot/learn/` and the paths above.

Not built (shown as rows without a link and with a "Design preview" label, or as
a dashed "Design preview, not built yet" label): For you, For governments, the
four concept topics, the two further topics per section, Architecture Assessment
and Use Case & Business Case Development (shown only as possible follow-up steps).
Webinars and roundtables are topics in preparation: no dates, no booking.

### Explorer connection (Paper 25.0-25.6)

Second tree `start` (manifest `"tree":"start"`, ids `@start/<path>`, base
`LEARN_START_BASE`, default `fides-design-pilot/start`, token `{{start}}`):
the starting point (kind `start`) and the receive route (kind `route`). Only
the receive route is a link; the other two rows say "In preparation".
Editorial links live in the option `fides_ds_editorial_links`, keyed by context
(`usecase:<id>`, `wallet-overview:organizational`), and are seeded from
`editorial-links.json` with edit protection (`LEARN_FORCE=editorial-links`
replaces them after saving the old state). The module renders only for a listed
context whose target page is published; nothing is derived from record text.
Editors change a link by editing the option entry or a context in the JSON file.
The pilot guard maps `/learn/`, `/learn/topics/` and `/ecosystem-explorer/start/`;
a site that does not map them shows no Learn item and no dead links.
The homepage fragment has a primary "Find your starting point" button to `/fides-design-pilot/start/`.
The business wallet overview shows its editorial link as one compact line in the intro
(`data-learn-*` attributes from `Fides_DS_Editorial_Links::resolved()`, rendered by the wallet script).
Header menu: Learn, Explore, Updates, Ecosystem, Tools & API, About FIDES; Services and the other
not-yet-existing destinations are `proposed` in `Fides_DS_Site_Shell::navigation()` and appear as soon as a site
maps them through `fides_site_shell_url` (the pilot guard returns '' for unmapped proposed paths).
Open questions: a credential-types explanation (no existing article fits).

### Sessions & workshops route

Learn > Sessions & workshops > offering > enquiry. The page kinds `sessions`,
`offering` and `request` are set in the page's Learn metabox. Offerings are the
children (kind `offering`) of the page that is the parent of the request page, so
a new offering appears in the enquiry select without a code change.
The chosen offering travels as `?offering=<slug>` (unknown values are ignored);
`interest` is the webinar/roundtable expression of interest.

The enquiry view is a **local preview**: the form has `novalidate` and never
submits; `learn.js` validates required fields, shows a summary and a result panel
that does not echo what was typed. Nothing is sent, stored, booked or paid, no
mail is sent and no Matomo event fires. The request page is `noindex`.
Sessions, offering and enquiry pages contain no prices; fees are "agreed in a
proposal before booking".

Open choices for staging: where an enquiry goes (mail address, form plugin or CRM),
how consent and storage work, which privacy page is linked, whether the enquiry
page stays noindex, and whether Matomo events are wanted (they are not built).

Editorial fields added in this round (all in the metabox): `actions`,
`details_title`, `details`, `closing_title`, `closing_text`, `request_question`,
`request_placeholder`, `request_submit`. `actions` lines: `Label | URL | primary|secondary`.

Routes to existing pilot parts: closing bands and article links go to
`/fides-design-pilot/overview/` (use cases), `/business-wallets/`, `/credentials/`;
"Open the glossary" and the Glossary tab go to the existing `/glossary/`.

## Building blocks

| Part | Where | Notes |
|---|---|---|
| Page template "FIDES Learn (inside site shell)" | `fides-community-tools-tiles/includes/class-fides-ds-learn.php`, `templates/learn.php` | Uses `Fides_DS_Site_Shell::render_header()/render_footer()`. One header, one footer. No new plugin. |
| Styles / script | tiles `assets/learn.css`, `assets/learn.js` | Loaded only on Learn pages, on top of `design-system.css`. |
| Editorial fields | metabox "FIDES Learn page" on every page | page kind, headline, article label, sources, closing band, series. Excerpt = intro. |
| Glossary | shortcodes `[fides_learn_term]`, `[fides_learn_terms]` | Look up the existing vocabulary (`fides-vocabulary-glossary` data) and render the shared `Fides_DS_Glossary` dialog. Definitions are never typed. A term without entry (today: "Credential") is plain text and reported by the seed script. |
| Example content | `learn/manifest.json`, `learn/content/*.html` | Block markup with tokens `{{learn}}`, `{{pilot}}`, `{{glossary}}`. |
| Seed script | `create-learn-pages.sh/.php` | See "Seeding and overwrite protection". |
| Backup / restore | `backup-pilot.sh`, `restore-check.sh` | See "Backup and rebuild". |

## Who changes what

**Editor (WordPress admin, Pages):** edit text, links, lists and buttons as normal
blocks; title = breadcrumb and tab label; headline, intro (excerpt), article label,
sources (`Label | URL` per line) and the closing band in the "FIDES Learn page" box.
Use the shortcode `[fides_learn_term term="Issuer"]issuer[/fides_learn_term]` for a
glossary term; "Terms in this article" and "On this page" are generated.
A list item without a link is shown as a design preview. Previous/next appears only
when two or more pages share the same series slug (menu order decides the order);
the seed content has no series.

**Agent (layout):** change `learn.css`/`learn.js`/`class-fides-ds-learn.php` in the
tiles worktree; change example content in `learn/content` and `manifest.json`, then
re-seed. Block classes the seed uses: `fides-learn-rows` (`--plain`, `--from-zero`),
`fides-learn-panel` (+ `__aside`), `fides-learn-card--brand`, `fides-learn-band`
(`--plain`), `fides-learn-flow`, `fides-learn-split`, `fides-learn-glossary`,
`fides-learn-note`.

## Seeding and overwrite protection

```bash
bash create-learn-pages.sh                       # create missing pages, update untouched seeded pages
LEARN_DRY_RUN=1 bash create-learn-pages.sh       # report only
LEARN_FORCE="topics" bash create-learn-pages.sh  # replace one named page explicitly
LEARN_BASE=fides-design-pilot/learn bash create-learn-pages.sh   # route base (adjustable)
```

- Every seeded page carries `_fides_learn_seed` (the full route), a hash and a copy of
  its seeded state. Marked pages are only updated while their hash still matches.
- A page changed by an editor (content, title, excerpt, order, status, template or any
  Learn field) is **skipped and reported with the changed fields** (`skipped-edited`).
- An existing page at a seed route without the marker is never touched
  (`skipped-unmarked`).
- `LEARN_FORCE` takes seed ids (`""` is the root, `topics`, ...). The previous state of
  a replaced page is written to `pilot-backup/learn-replaced/` first.
- The script refuses to run outside the pilot (or `LEARN_ALLOW_NON_PILOT=1` on another
  non-production test site) and on `production` environments.
- Verified by `tests/run-learn-seed-checks.sh` (edit, re-seed, unmarked page, dry run,
  forced replacement, cleanup).

## Backup and rebuild

```bash
bash backup-pilot.sh                      # pilot-backup/snapshots/<time>/ : db.sql.gz, non-git copies, MANIFEST.txt, SHA256SUMS
bash restore-check.sh <snapshot dir>      # imports into a scratch database, compares pages and non-git copies, writes RESTORE_CHECK_OK
PILOT_SNAPSHOT=<snapshot dir> bash teardown-site.sh   # refuses without a snapshot that passed restore-check
```

A snapshot made on 2026-11-03 (before seeding) passed the restore check: 67 pages
identical, the three non-git copies identical. `teardown-site.sh` was **not** run.

Rebuild from nothing: `setup-site.sh` (copy of utrecht-demo, symlinked worktrees),
restore the non-git pieces from the snapshot (`non-git/`), activate plugins, then
`create-pages.sh` and `create-learn-pages.sh`. The Learn pages can also come back
from `db.sql.gz`. `wp-config.php` and uploads are not in a snapshot (secrets; uploads
come from the source site).

## Staging preparation (not a deploy)

### Dependencies and install order

1. WordPress 7.1.x, PHP 8.2, theme `blocksy` 2.1.59 + child theme `blocksy-child` 1.0.0.
2. `blocksy-companion-pro` 2.0.99, `complianz-gdpr` 7.4.6 (consent banner), as on the source site.
3. `fides-community-tools-tiles` 1.13.33 (shell, design system, **Learn template**) first.
4. `fides-vocabulary-glossary` 1.1.15 (glossary page and `data/glossary-aggregated.json`).
5. Catalog plugins for the linked pilot pages: `fides-use-case-catalog` 0.21.11, `fides-organization-catalog` 1.18.6, `fides-credential-catalog` 1.7.0, `fides-wallet-catalog` 2.16.4.
6. Optional: `fides-assistant` 0.6.1 (adds Ask FIDES to the Learn bar; the bar item is absent without it).
7. Pilot guard mu-plugin (`fides-design-pilot-guard.php`), pages `fides-design-pilot` and the glossary page, then `create-learn-pages.sh`.

Not needed for Learn: `fides-template-pilot` (older own header/footer; stays local).

Data sources: glossary data file inside the glossary plugin; catalog listings load
their `aggregated.json` from GitHub at runtime (read-only requests).

### Outside version control today, and how it becomes available

| Item | Why | Route to staging |
|---|---|---|
| `blocksy-child` theme | 16 lines, local only | commit to a theme repo, or ship from the snapshot `non-git/themes/` |
| `fides-vocabulary-glossary` | the pilot copy has no git worktree | needs its own repo/release; until then copy from the snapshot `non-git/plugins/` |
| `fides-template-pilot` | experiment, not used by Learn | do not ship |
| guard mu-plugin | lives in `use-case-catalog/scripts/design-pilot/` (versioned); the active copy must be re-copied after edits | copy to `mu-plugins/` of the test site |
| utrecht-demo database/uploads | source of the pilot copy | staging gets its own database; only the seeded pages are version-controlled |

### Configurable per environment (nothing pinned to localhost)

Content stores root-relative paths only (`/fides-design-pilot/...`); the host comes
from the site URL. Adjust with `LEARN_BASE`, `LEARN_PILOT_BASE`, `LEARN_GLOSSARY_PATH`
and, for shell links, the `fides_site_shell_url` filter. A site in a sub-directory
needs those bases to include the sub-directory.

### Protection a staging site needs (choose explicitly)

- Restricted access (HTTP auth or IP allow-list) in front of the whole site.
- noindex (`wp_robots`) and `Disallow: /` in robots.txt: the guard does this locally.
- Outgoing requests: the local guard blocks every non-GET/HEAD request. For staging,
  decide per integration (submission forms, GitHub sync, Ask FIDES gateway) whether it
  stays blocked or points to a test endpoint.
- Mail: the guard blocks all mail (`pre_wp_mail`). Staging needs either the same
  block or a mail catcher; real sending must stay off until decided.
- `WP_ENVIRONMENT_TYPE` = `staging` (the seed script refuses `production`).

### Still needed before staging

Own repo or release for the glossary plugin and the child theme; a decision on the
four protection points above; a real "Credential" glossary entry (and business wallet
wording check) in the vocabulary; content review of the two example articles by an
assessed author (no author or date is shown, by design); build of the sessions and
request pages (24.3-24.6) or removal of their previews; Matomo and request flow stay
out of scope.

## Tests

```bash
bash tests/run-learn-checks.sh        # browser: desktop 1440/1100, tablet 768, mobile 390/320
bash tests/run-sessions-checks.sh     # Sessions & workshops route, enquiry preview, nothing posted
bash tests/run-learn-seed-checks.sh   # overwrite protection
bash tests/run-connect-checks.sh      # home > start > receive > VOG > Learn, both ways
bash run-tests.sh                     # PHP behaviour (includes tests/learn-behaviour.php)
```

## UX round: strip, featured block, Receive

- `Fides_DS_Editorial_Links` variants are `band`, `card` and `strip`. The compact `strip` (light-blue, title, one line, one action link) replaces `inline`; the business wallet overview renders it above the search field.
- The homepage featured use case (`[fides_use_case_featured]`) is one block: existing image, title, status and, only when the programme name and the result are both known, an award ("Winner · FIDES Community Awards 2026"). The option `fides_use_case_featured` has an editorial field `short_title` (max 90 characters). It applies to the primary use case only; nothing is derived from submitter input.
- `[fides_learn_record heading="2"]` renders the title as `h2`; the Receive page uses it for the VOG practice card with the existing image (above the text below 600px).
- Tests: `tests/run-ux-round-checks.sh` (one browser per width).
- The short homepage title is stored with the record it belongs to (`short_title_for`). Changing the primary use case with the old title left in place clears it (with a notice); a title entered together with the new primary is bound to that record; legacy values without a record link are never shown.

## Updates (Paper 26.1 to 26.3)

- Page `/fides-design-pilot/updates/` (shortcode `[fides_updates]` in the shell template); the shell link `/about-fides/news/` maps to it in the pilot guard. Own article layout for posts is switched on by the setting `article_template` (pilot seed on; off by default).
- Sources: published WordPress posts (FIDES updates; intro = manual excerpt only) and the organization feed `pro-news.json` (remote raw URL, filterable and settable, with the bundled copy of the organization catalog plugin as fallback; transient cache). The retention of the feed is not touched here; the page shows what the feed contains.
- Layout (Paper 26.5): compact list (48px logo or tile, title max two lines, type · organization · source, date, action button) next to a FIDES column from 1024px; below that the columns stack with the list first. FIDES column: the featured FIDES update (image = the post's featured image, intro = manual excerpt only, both omitted when absent) and a Learn link. Featured post = setting `featured_post`, else the newest FIDES update with an image, else the newest; it is also in the list at its own date. FIDES rows show the FIDES tile, not the post photo.
- Publication source: when a post is published on another site than the organization's own (host check, subdomains and www count as the same site), the row shows "Source: <site>" next to the organization, the link name says "opens the original post on <site>", and search finds it.
- Programme updates: only an organization linked to a programme under Settings > FIDES Updates (`org:id | Label | host, host`). Hosts are optional but advised: only posts on those hosts get the label; a line with unreadable hosts is dropped. The pilot seed (`create-pages.php`) takes WE BUILD, EDI-Stelsel NL, German EUDI Wallet and TradeTrust from `listing-news-sources.json`, each limited to its `allowedHosts`; an existing setting is never overwritten. Nothing is derived from post text.
- Feed origin: the wrapper carries `data-feed-origin` (remote, bundled, none) and `data-feed-generated`; no visible notice yet.
- Search matches title, organization and programme label (accents and case ignored, all words must match). Filter: FIDES / organization / programme. Sort: newest, oldest, title. 10 per page. Query: `q`, `type`, `sort`, `pg`. No topic filter yet.
- Homepage (mobile) fixes for Paper 25.13 live in `usecase-design.css` under the class `fides-uc-hero` (set on the hero column in the seed).
- Tests: `tests/updates-behaviour.php` (in `run-tests.sh`) and `tests/run-updates-checks.sh` (one browser per width; remote hosts are stubbed).

## Homepage blocks (Paper 25.12)

- `[fides_home_routes]` under the hero: "Where would you like to start?" with three routes. Links go through `Fides_DS_Site_Shell::url()`, so a site decides the destination; a route whose destination is not mapped (today "Connect your organization" / "Find integration help", the planned "Get help choosing" page) is text without a link. Filter `fides_home_routes` changes the routes.
- `[fides_home_updates]`: the newest updates (default 3, filter `fides_home_updates_limit`, max 6) from `Fides_DS_Updates::collect()`, the same data as the Updates page. Kicker = type · organization, separate publication source in the footer, date, one link per item (original post for external items, FIDES article for own posts), "All updates" link, empty state.
- Seed: both shortcodes sit under the hero in `homepage-fragment`. Tests: `tests/home-behaviour.php` (in `run-tests.sh`) and `tests/run-home-checks.sh`.
- Not in this round: the secondary links row under the routes and all blocks below "Latest from the ecosystem".
