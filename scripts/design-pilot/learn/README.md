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
| European Digital Identity Wallet | `topics/the-big-picture/european-digital-identity-wallet/` | no Paper frame (same article template) | article |
| European Business Wallet | `topics/for-businesses/european-business-wallet/` | no Paper frame (same article template) | article |
| EUDI Wallet and European Business Wallet: how do they relate? | `topics/the-big-picture/eudi-wallet-and-european-business-wallet/` | no Paper frame (same article template) | article |
| What is a credential? And what is an attestation? | `topics/the-big-picture/what-is-a-credential/` | no Paper frame (same article template) | article |
| Training & workshops | `sessions/` | 24.3, mobile 24.8 | sessions |
| Wallet Introduction | `sessions/wallet-introduction/` | 24.4 | offering |
| Wallet Readiness Workshop | `sessions/wallet-readiness-workshop/` | 24.5 (same pattern) | offering |
| Session enquiry (local preview) | `sessions/request/?offering=<slug>` | 24.6 | request |

Local URLs: `http://localhost:10088/fides-design-pilot/learn/` and the paths above.

Not built (shown as rows without a link and with a "Design preview" label): For you, For governments, the
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
Header menu: Learn, Explore, Services, Updates, Ecosystem, Tools & API, About FIDES (the pilot guard maps Services to `/fides-design-pilot/services/`); the other
not-yet-existing destinations are `proposed` in `Fides_DS_Site_Shell::navigation()` and appear as soon as a site
maps them through `fides_site_shell_url` (the pilot guard returns '' for unmapped proposed paths).
Open questions: a credential-types explanation (no existing article fits).

### Training & workshops route

Learn > Training & workshops > offering > enquiry. The page kinds `sessions`,
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

**European Digital Identity Wallet (article, English source only):** all text, the
"Continue learning" list and the line "Content last checked: <date>" (last paragraph, a
normal block) are edited in the page editor. Sources are the "Sources" field in the
"FIDES Learn page" box (`Label | URL` per line). There is no separate date field:
update the date line whenever the page is rechecked, and recheck the regulatory
statements (availability by end 2026, acceptance rules) before each publication.
The **European Business Wallet** article (`topics/for-businesses/european-business-wallet/`) works the
same way: text, "Continue learning", sources field and the "Content last checked" line. It describes a
legislative proposal; recheck the status paragraph before each publication.
Source URLs keep percent-encoding (`%3A` and similar): the Learn fields use `Fides_DS_Learn::sanitize_field_value()`, not `sanitize_text_field()`, which deletes `%xx`. "Continue learning" lists are grouped under "Learn more" and "Explore in the catalogs"; the closing band (manifest `cta_*`) is the single place for the workshop or catalog button. Glossary wording proposals that the pilot cannot change live in `learn/glossary-proposals.md`. "Terms in this article" shows whole sentences and a "Full definition" button.
Only links to existing pages are present; "Issue credentials for wallets" is added when that page exists.

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
bash tests/run-sessions-checks.sh     # Training & workshops route, enquiry preview, nothing posted
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

## Homepage blocks (Paper 25.15)

Order under the hero: readiness block (Paper 25.16 / 25.17, replaces the 25.15 Learn strip), themes (Digital trust in practice), blue spotlight, latest updates, footer. Desktop spacing after the readiness block is 56px (48px before the blue band); mobile 32px.

- `[fides_home_readiness]` (editorial timeline variant of Paper 25.16 / 25.17): light-blue block. Left about 60%: heading (default "EUDI Wallet: what is changing?"), short introduction, an introduction over the full width of the column, up to three milestones (date or status, title, explanation; the source stays in the data and is not shown in the block) joined by a 1px line (horizontal from 641px, vertical below) an explanation link ("Understand the EUDI obligations and exceptions →") and a separate link "For organisations: explore European Business Wallets →". Right about 40% (stacked below 900px): "What does this mean for your organisation?" with Readiness Workshop (calendar icon) and Topics & guides (book icon) rows of at least 44px. Editors maintain the left side in WordPress under Settings > FIDES Home (option `fides_ds_home_readiness`, same pattern as FIDES Updates); nothing is computed, no countdown. Defaults hold a one-sentence introduction and the two EUDI milestones (End 2026 availability, source European Commission; End 2027 acceptance, source Regulation 910/2014 Art. 5f) with the agreed short texts ("EU Member States are required to provide at least one EUDI Wallet." / "Certain private service providers must accept EUDI Wallets for online identification when requested by users."); exceptions (micro and small enterprises) and the voluntary-use nuance in detail belong on the explanatory Learn page. Both links need a published Learn page as target (Settings > FIDES Home). While the target is empty (temporary) each link is shown as a placeholder without destination: same look, no href, not focusable, announced as "(link coming soon)"; an empty link text hides it; no Learn page about the EUDI obligations and exceptions exists yet, and no page about the European Business Wallet exists yet (the proposal COM(2025) 838 is still being negotiated), so it is not seeded. The sources are listed on a Learn page with the shortcode `[fides_home_readiness_sources]` (add it to the page that explains the milestones; none exists yet). Never present the EUDI dates as European Business Wallet deadlines. Tests: `tests/run-readiness.sh` (seeded homepage, then a temporary option with three milestones and a business link).
- `[fides_home_learn]` (no longer on the homepage): "New to digital trust?" with Topics & guides (book icon) and Training & workshops (calendar icon). The destinations come from the Learn section the site shell points at (`Fides_DS_Learn::bar_model()`); a missing page is left out. Filter `fides_home_learn_links`. `[fides_home_routes]` still exists (hides routes without a destination) but the homepage no longer uses it.
- `[fides_use_case_discovery layout="index"]` (use-case plugin): six themes in two columns of three rows from 900px, one column below. Names, counts and links (`overview/?theme=<bundle>`) come from the plugin's theme bundles and published use cases, the same data as the overview; the total is shown on its own. "Browse all use cases" goes to the overview. No data: heading, a notice and the link.
- `[fides_home_updates]`: newest updates (default 3, filter `fides_home_updates_limit`) from `Fides_DS_Updates::collect()`. Source (organization, programme, real publisher when it differs) and date sit above the title; the title is the only link; external items end with an arrow and an accessible name that says the link leaves the site. "All updates" and an empty state.
- Tests: `tests/home-behaviour.php` (in `run-tests.sh`) and `tests/run-home-checks.sh` (five widths, follows every theme at 1440 and compares counts with the overview).
- `[fides_use_case_spotlight id="<catalog id>" detail_url="/fides-design-pilot/use-case/"]` (use-case plugin), directly under the themes (the latest updates follow it): blue "One use case. A connected ecosystem." block. Title, status, image and a short preview (first line of `summary`, max 200 characters, "…" when it continues) come from the catalog record; no editorial intro. Under the text one compact link per linked relation type (`Organizations 7 →`, Business wallets, Personal wallets, Credential types, Issuers, Relying parties) goes to its section on the use case page (`#organisations`, `#ecosystem-<type>`) with the count that page lists; empty types are omitted; a wrapping row on desktop under the text (diagram of 280px left of the text from 900px), two compact columns on mobile.
- Counter: the theme index reuses `usecase-discovery.js` (`.fides-ct-count`, 3 s with ease-out quad on the index via `data-count-duration`, runs once on first view). Real values are in the markup, so no JavaScript or reduced motion shows them directly.
- Spotlight link states: text and arrows stay white on hover and focus (they override the theme link colours), arrow links get an underline on hover and focus, keyboard focus is a 3px white ring with a 4px offset, "View all N …" is its own arrow step with space above. Check with `tests/run-spotlight-states-checks.sh`.

## About FIDES (Paper 27.1)

- Page `/fides-design-pilot/about-fides/` with the shortcode `[fides_about]` (tiles `Fides_DS_About`, `assets/about.css`); the shell path `/about-fides/` (menu and footer) maps to it in the pilot guard.
- Destinations go through the shell resolver: Topics & guides and Training & workshops and the use case overview are pilot pages; Submit a use case and Manage your organization's listing go to the pilot forms. Contact, Manifesto and Plans have no pilot page and resolve to the live fides.community paths. A destination that resolves to nothing is omitted, not linked.
- Tests: `tests/run-about-checks.sh` (1440, 390 and 320 px; screenshots in `screens/about-*.png`).

## FIDES Manifesto (Paper 27.2 / 27.3 / 27.4)

- Page `/fides-design-pilot/manifesto/` with `[fides_manifesto detail_url="/fides-design-pilot/organization/"]` (tiles `Fides_DS_Manifesto`, `assets/manifesto.css`, `assets/manifesto.js`); the shell path `/manifesto/` (footer, About) maps to it in the pilot guard.
- Our vision (between hero and principles): three paragraphs from Paper 27.2 in a reading column of at most 720px. The original handover photo (340px column) sits right of the principle list from 1100px, top aligned with principle 1 and never overlapping it; below 1100px it stacks after the vision and before the principles heading (`#principles` is the heading, so the anchor skips the photo). The photo is the WordPress media file on fides.community (`manifesto-768x1024.jpg` with srcset, 3:4), shown whole (never cropped), with the verified original caption, worded neutrally and without any claim of formal Parliament support. Staging can point at its own copy through the `fides_manifesto_photo` filter (empty array removes the photo).
- The seven principles keep their original titles and full texts (from fides.community/manifesto); the short texts in Paper are layout placeholders only.
- Supporters: every organization with `fidesManifestoSupporter === true` from the organization catalog source, alphabetical, no paging. A tile shows the logo (as the organization listing resolves it) with a modest 13px name below it, or a single readable name tile when the logo is missing, fails to load, or is smaller than 32 px. Logos are limited to 160 x 40 px (110 x 36 px below 768 px), keep their proportions and are never scaled up (`width/height:auto` plus max sizes). Each tile links to the organization profile (`detail_url` page with `?org=`; without it the canonical organization route).
- Signing is the existing WPForms form on the live Manifesto page (`#ratify-the-fides-manifesto-today`). The pilot has no copy and collects nothing; the support actions use the `fides_manifesto_sign_url` filter (pilot guard: the live URL; default: the form anchor on the site's own Manifesto page).
- Content-page type scale (shared classes in `design-system.css`, used by the Manifesto): section heading `.fides-ds-heading-section` 26/32 bold, item heading `.fides-ds-heading-item` 22/28 bold, running text `.fides-ds-text-body` 17/27, all in Inter. Principle numbers are 28/34 semibold in a 52px column (36px below 768 px), 24px (16px mobile) from the title. About FIDES still uses `.fides-ds-heading-2` (30/36) for its section headings; align it when the design owner decides to.
- Comparison of the gallery with the catalog: `organization-catalog/docs/manifesto-gallery-vs-catalog.md`.
- Tests: `tests/manifesto-behaviour.php` (in `run-tests.sh`) and `tests/run-manifesto-checks.sh` (1440, 1100, 768, 390, 320; `REAL_LOGOS=1` only for screenshots with real logos).

## Training & workshops: who changes what

A content manager can change everything below in the WordPress page editor, without code.

- **Facts box** (For, Format, Price, plus duration, location and so on): field `details`, one `Label | Value` per line. This is the single source: the overview cards (`[fides_learn_offers]`) read the For, Format and Price rows from here, so a price is edited in one place only.
- **Overview card**: fields `card_summary` (short text) and `card_label` (button label). `details_note` is the small note under the facts box (for example the final-price sentence).
- **Band without button**: leave `cta_url` empty and the closing band shows text only.
- **Training dates**: field `dates`, one `Date | Location | Time` per line. Each row gets a "Register interest" link that preselects the date in the enquiry form. Add a line for a new date, delete a line when it has passed. `dates_title` and `dates_note` change the heading and the note under the table.
- **Subtitle, intro, buttons**: fields `subtitle`, `excerpt`, `actions`. Body text is normal block content.
- **Extra training or workshop**: add a child page of Training & workshops, set kind `offering`. It appears in the enquiry form's offering list automatically. Pages with `dates` get a date selector; pages without get the timing field.
- **Optional question**: end `request_question` with "(optional)".
- The enquiry page is still a local preview (no mail, no storage). A real form, mail or CRM hookup is a separate step.
- Open training: €999 per participant excluding VAT. Inhouse sessions: from-prices only (€1,495 session, €3,750 workshop); duration, group size and inclusions are not decided yet and must not be added until they are.
- After changing English text, Dutch needs a new translation in TranslatePress for each changed string (no silent fallback is configured; untranslated strings show in English).

## Services: who changes what

The Services section is separate from Learn. Its own page tree sits under `/fides-design-pilot/services/` and is seeded from the same manifest (`"tree": "services"`; token `{{services}}`; route base `LEARN_SERVICES_BASE`).

| Page | Path | Kind |
| --- | --- | --- |
| Services (overview) | `services/` | services |
| Wallet readiness assessment | `services/wallet-readiness-assessment/` | offering |
| Enquiry (local preview) | `services/enquiry/?offering=wallet-readiness-assessment` | request |

- **Navigation.** Services is no longer a main menu item. It sits in the About FIDES dropdown, under the group "Work with FIDES", and in the matching mobile disclosure. The shell proposes `/services/`; the pilot guard and `staging/fides-design-review-config.php` map it to the pilot Services page. About FIDES shows as current on every Services page. A site that does not map `/services/` shows no Services link. The button supports Enter, Space, ArrowDown (opens a closed panel) and Escape (closes and returns focus). The Learn bar does not appear on Services pages. The breadcrumb is Home / Services / page.
- **Size.** Services pages use the detail H1 tokens (36/42 on wide screens) and a compact hero through the `fides-learn--services-tree` class. Training & workshops and the other Learn pages keep the 48/52 H1.
- **Services overview.** Intro, hero button, "How can we help?" text and the closing band are normal fields and block content. The four services have four named input groups in the page editor: title, description, action label and destination. The destination is a path, an https address, or the word `contact` (resolves to the site Contact page from the shell, `/about-fides/contact/`; the pilot has no local Contact page, so it links to the live page). Saving checks every group: a title and a destination are required, the keyword must be known, and the address must be safe (no `javascript:` or similar). If something is wrong, nothing is stored, the previous services stay live and a red notice above the editor lists what to fix. The stored value is still one line per service (`Title | Description | Action label | URL`), so existing content needs no migration. Each row is the shared catalog row card.
- **Readiness assessment.** Same editor fields as an offering: headline, eyebrow, `excerpt`, `actions`, `details_title` and `details` (the details box), closing block and the enquiry fields. The page body is block content. Put a **More** block in the body: content before it sits beside the details box, content after it runs full width below (How it works, Workshop or assessment?, See wallets in practice).
- **Enquiry.** One enquiry page per section. The offerings in its select are the `offering` pages below its parent, so a new service page under `services/` appears there automatically. The webinar interest option and the date field only exist in Training & workshops.
- **No prices.** The Services pages carry no price, fee, duration or fixed deliverable. Keep it that way until FIDES has decided them.
- **Other services** have no page of their own. Their actions go to Contact. When a page exists, change the URL in the `services` line.
- **What happens next.** The enquiry page describes the process after go-live. It says this form is a preview, nothing is sent locally, and lists what FIDES will do once the form is live.
- **Translation.** All visible text is server-rendered. The texts the form script changes (context label, "Back to ...", "Return to ...", validation, preview result) are rendered as a hidden list `ul[data-fides-learn-strings]` that TranslatePress translates like any page text; the script reads the list. Dutch texts live in `learn/nl-translations.php`: run `pilot_wp eval-file learn/nl-translations.php apply` (or `status`) after opening the pages once under `/nl/`. It only fills empty or untranslated rows and never overwrites an editor's translation.


## Availability and training partnerships

FIDES serves an international audience, while its own services and physical trainings currently take place mostly in the Netherlands. Every page stays visible to everyone: there is no IP filtering or blocking.

- **One source.** Location, language and format are separate facts in the `details` field of an offering page (`Label | Value` per line). There is no extra field. Do not mix them in one row.
- **Open training.** `Location | Utrecht, the Netherlands` is confirmed and also shows on its overview card. Language and online participation are deliberately not stated until they are decided. Add `Language | …` or `Online | …` rows when they are.
- **Team sessions and the readiness assessment.** The last details row is `Availability | Primarily available in the Netherlands. Contact us to discuss your requirements and location.` Editors change that row on the Wallet Introduction, Wallet Readiness Workshop and Wallet readiness assessment pages. The overview cards show a row only when it exists in the details field (format, location, audience, price), so the availability line stays on the detail pages and the overview stays compact.
- **Training partnerships.** The text sits in two places: the block on the Training & workshops page (body content) and the Training partnerships page (excerpt and body). It says FIDES wants to talk with training providers, including outside the Netherlands, that no partner network or programme exists yet and that nothing is agreed. "Discuss a partnership" opens the existing enquiry. There is no partner catalogue, paid placement, commission handling or booking.
- **Translation.** The availability line and the partnership text are server-rendered, so TranslatePress can translate them. Until a Dutch translation exists, a Dutch URL shows the English text. Changed English strings lose their Dutch translation: the partnership excerpt ("Are you a training provider looking to offer …"), the hub block ("Do you run training courses …") and the partnership page body ("FIDES works with training partners …"). Translate the new availability and partnership strings in TranslatePress.
- **Assessment details.** The Wallet readiness assessment details box has four rows (For, Starting point, Independent advice, Availability). The "Getting started" row was removed; the contact buttons stay. Language, location, duration and delivery are not stated until FIDES has decided them.
- **Orphaned Dutch rows.** TranslatePress keeps rows whose English source changed. Currently unused and left in place: "Getting started", "Are you a training provider looking to offer a practical course on digital wallets…" and "FIDES works with training partners to deliver accessible programmes…". Remove them in the TranslatePress editor when convenient.
