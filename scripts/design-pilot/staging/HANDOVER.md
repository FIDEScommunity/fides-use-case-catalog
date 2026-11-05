# FIDES design pilot: handover for staging (`/design-review/`)

Target: `https://staging.fides.community/design-review/`. This package was built and rehearsed locally. Nothing in it
contacted staging or any other server; installing it is Codex's job. Nothing here merges, pushes or deploys.

`manifest.json` has the exact commits and plugin versions. `SHA256SUMS` covers every file. `address-scan.json` is the scan
for fixed local and production addresses.

## 1. What is in the package

| Path | Contents | Source |
| --- | --- | --- |
| `plugins/*.zip` | `fides-community-tools-tiles`, `fides-use-case-catalog`, `fides-organization-catalog`, `fides-wallet-catalog`, `fides-credential-catalog` | **Git**: committed state of branch `feature/fides-design-pilot` in the five worktrees (deterministic zips) |
| `non-git/plugins/fides-vocabulary-glossary-*.zip` | glossary plugin (Learn articles link to it) | **Local WordPress copy**: no Git repository exists |
| `non-git/themes/blocksy-child-*.zip` | 16-line child theme of Blocksy | **Local WordPress copy**: no Git repository exists |
| `mu-plugins/fides-design-review-config.php` | route mapping for `/design-review/`, noindex, disabled external actions | **Git** (`use-case-catalog/scripts/design-pilot/staging/`) |
| `seed/` | `seed.sh`, `create-pages.php`, `create-learn-pages.php`, `staging/preflight.php`, `staging/seed-guard.php`, `learn/` (manifest, 12 article/page HTML files, editorial links) | **Git** |
| `catalog-data/*.json` | reference copy of the four committed crawler outputs | **Git** (not installed; see section 6) |
| `checks/rehearsal-checks.cjs` | browser checks that also run against the real staging URL (GET only) | **Git** |
| `reference/fides-design-pilot-guard.php` | the local-only guard. **Do not install** | **Git** |

Not in the package, on purpose:

- **The local database.** It is a copy of the utrecht-demo database. Pages and options are created by the seed scripts, so staging keeps its own users, forms, ratings and content.
- **Uploads / images.** The pilot pages contain no `wp-content/uploads` references. Logos and use case images come from the catalog data (remote). The Manifesto photo is the live media file (section 5).
- **`wp-config.php`, secrets, `local-data/credential-aggregated.json`** (a local crawl with local paths) and the `fides_local_catalog` option (DCAT test data).
- Third-party plugins (Blocksy Companion Pro, Stackable, WPForms, Complianz, ...): staging has its own.
- `fides-template-pilot`: an earlier experiment, not used.

## 2. Install order

All commands use `wp --path=<staging wordpress>`; back up the staging database and the five plugin folders first.

1. Verify: `cd <package> && shasum -a 256 -c SHA256SUMS`.
2. Install `blocksy-child` and `fides-vocabulary-glossary` **only if staging lacks them or has an older version** (preflight reports versions).
3. Replace the five plugin folders with the zips (unzip over `wp-content/plugins/`, one folder per slug) and activate them. `fides-community-tools-tiles` first: the catalog plugins use its SSR renderer.
4. Copy `mu-plugins/fides-design-review-config.php` to `wp-content/mu-plugins/`.
5. In `wp-config.php` set `define('WP_ENVIRONMENT_TYPE', 'staging');` and, only if you want other behaviour than the defaults, the constants in section 4.
6. `WP="wp --path=..." seed/seed.sh preflight` (read only; stops on FAIL) then `seed/seed.sh dry-run`, then `seed/seed.sh apply`.
7. `wp rewrite flush` once, then run `checks/rehearsal-checks.cjs` against `https://staging.fides.community` (`PILOT_URL=... PILOT_BASE=design-review`; needs Playwright; read only).

The seed refuses any host outside `PILOT_ALLOWED_HOSTS` (default `localhost,127.0.0.1,staging.fides.community`) and always refuses `fides.community`.

## 3. How pages are seeded and how editorial changes survive

- Pages are created under `/design-review/` (pilot pages) and `/design-review/learn/`, `/design-review/start/` (Learn pages). All route strings in the seed content are tokens; the base comes from `PILOT_BASE` (default in `seed.sh`: `design-review`).
- Every seeded page gets a marker and a hash of the state it was seeded with (`_fides_pilot_seed*`, `_fides_learn_seed*`). A later `apply`:
  - changes a marked page only while it is still identical to the stored state;
  - **skips and reports** a page an editor changed (`skipped-edited`);
  - never touches an existing page at the same path that has no marker (`skipped-unmarked`);
  - never overwrites an existing option (`fides_use_case_featured`, `fides_ds_updates`, `fides_ds_editorial_links`).
- Replace a page on purpose with `PILOT_FORCE="design-review/overview"` (pilot pages) or `LEARN_FORCE="topics"` (Learn pages). The old state is saved as JSON under `PILOT_BACKUP_DIR` (default `./seed-backups/<time>`) first.
- `dry-run` writes nothing. Re-running `apply` on an unchanged site reports every page as `unchanged`.

Pages seeded (all with the FIDES site shell template unless noted): `design-review` (index, Blocksy hero), `overview`, `use-case`, `homepage-fragment`, `organizations`, `organization`, `personal-wallets`, `business-wallets`, `wallet`, `credentials`, `credential`, `existing-listing` (existing modal listing, no shell, for parity checks), `about-fides`, `manifesto`, `updates`, plus the Learn tree (`learn`, `learn/topics`, two topic pages, two example articles, `learn/sessions` with two offerings and `request`, and `start`, `start/receive`).

## 4. Settings and URL mappings for `/design-review/`

`mu-plugins/fides-design-review-config.php` (route map identical to the local guard; `staging/verify-package.sh` compares the two):

| Shell destination (fides.community path) | Pilot target |
| --- | --- |
| `/` (logo) | `/design-review/homepage-fragment/` |
| `/about-fides/`, `/manifesto/`, `/about-fides/news/` | `/design-review/about-fides/`, `.../manifesto/`, `.../updates/` |
| `/learn/`, `/learn/topics/`, `/ecosystem-explorer/start/` | `/design-review/learn/`, `.../learn/topics/`, `.../start/` |
| `/ecosystem-explorer/use-cases/` | `/design-review/overview/` |
| `/ecosystem-explorer/personal-wallets/`, `/organizational-wallets/`, `/credential-catalog/` | `.../personal-wallets/`, `.../business-wallets/`, `.../credentials/` |
| `/organizations/` | `/design-review/organizations/` |
| `/ecosystem-explorer/` (explorer), `/ecosystem-explorer/map/`, `/theme/`, `/issuer-catalog/`, `/relying-party-catalog/`, `/community-tools/glossary/` | existing staging pages `/explorer/`, `/map/`, `/theme/`, `/issuer-catalog/`, `/relying-party-websites/`, `/glossary/` |
| `/ecosystem-explorer/use-cases/submit-use-case/`, `/organizations/submit-organization/`, `/organizations/update-organization/` | existing forms `/use-case-form/`, `/organizations-submit/`, `/organizations-update/` |

Destinations without a page on the site (Plugfests, Community tracks, the two Awards pages, Plans, Use FIDES with AI, Interop profiles, Contact, Terms, Privacy) link to `https://fides.community` + path. Set `FIDES_DESIGN_REVIEW_LIVE_FALLBACK` to another origin or to `''` to hide them. These links are read-only navigation.

Optional constants in `wp-config.php` (none is required):

| Constant | Default | Effect |
| --- | --- | --- |
| `FIDES_DESIGN_REVIEW_BASE` | `design-review` | route base used by the mu-plugin; must equal `PILOT_BASE` of the seed |
| `FIDES_DESIGN_REVIEW_OUTGOING` | `blocklist` | `blocklist`: no outgoing write request to GitHub or the production site; `strict`: none to any other host; `off` |
| `FIDES_DESIGN_REVIEW_ALLOW_MAIL` | not set (mail not sent) | `true` allows `wp_mail()` |
| `FIDES_DESIGN_REVIEW_LIVE_FALLBACK` | `https://fides.community` | see above |
| `FIDES_DESIGN_REVIEW_SIGN_URL` | not set | Manifesto sign form; default is this site's own `/manifesto/#ratify-the-fides-manifesto-today` |
| `FIDES_DESIGN_REVIEW_BADGE` | shown | `false` hides the "Design review" badge |

Other settings that matter:

- Permalinks must be `/%postname%/`. Flush rewrites once after the seed.
- `noindex, nofollow` and `Disallow: /design-review/` in `robots.txt` apply to the pilot routes only. Whether the rest of staging is indexable or behind HTTP auth is up to the site setup; an access restriction in front of the site is advised.
- Catalog hosts: the loaders treat `*.local` and `localhost` as local development and read plugin data first. `staging.fides.community` is neither, so catalogs read GitHub first, like production.
- Option defaults that point at the live site (read-only links in details and cross references): `fides_org_catalog_issuer_catalog_url`, `..._credential_catalog_url`, `..._wallet_catalog_url`, `..._rp_catalog_url`, `..._use_case_catalog_url`, `fides_credential_catalog_trust_scheme_catalog_url`, plus the credential plugin constants `FIDES_CREDENTIAL_CATALOG_DEFAULT_*_URL`. Set the options to staging paths if reviewers should stay on staging.
- Do not set `fides_use_case_catalog_prefer_local_source`; the local guard sets it to false only because `localhost` is not `*.local`.

## 5. Demo parts and dependencies on existing staging

Demo / preview parts (in the package, not production features):

- The **Sessions & workshops enquiry** (`learn/sessions/request/`) is a local preview: it never submits, stores or mails anything and is `noindex`. Where an enquiry would go (mail, form plugin, CRM) is an open decision.
- Learn example articles have no author or date by design and need editorial review.
- The homepage fragment, spotlight and featured use case are pilot compositions of catalog records; they do not replace the live homepage.
- Like counts are shown but there is no like toggle yet.
- The detail route is `/design-review/use-case/?usecase=<id>` (and `?org=`, `?wallet=`, `?credential=`). Production still needs one decided route, canonical and redirects.
- Search uses the WordPress search; its result page renders in the theme, not the shell.

Existing staging pages the pilot links to (preflight checks them; FAIL = needed): `/use-case-form/`, `/organizations-submit/`, `/wallet-submit/`, `/credential-submit/`, `/glossary/`, `/manifesto/` (with the WPForms sign form), and for navigation `/organizations-update/`, `/explorer/`, `/map/`, `/theme/`, `/issuer-catalog/`, `/relying-party-websites/`. The submit and update forms keep working as they are on staging; their GitHub/mail side effects are covered by the blocklist below.

Existing plugin settings on staging that the pilot reads: `fides_catalog_ssr_enabled`, the catalog source options, and the WPForms form on `/manifesto/`.

Disabled external actions on staging (mu-plugin defaults):

- Outgoing POST/PUT/PATCH/DELETE to `github.com`, `api.github.com`, `raw.githubusercontent.com` and `fides.community`: blocked (catalog submissions and sync cannot create pull requests or write to production). GET stays open so catalog data loads.
- `wp_mail()`: nothing is sent (WPForms notifications, password resets and the sessions enquiry included) until `FIDES_DESIGN_REVIEW_ALLOW_MAIL` is set.
- Manifesto signing: the pilot page has **no form**. The buttons go to the existing sign form; on staging that is the form on staging's own `/manifesto/` page. Its notification mail is covered by the mail rule. Set `FIDES_DESIGN_REVIEW_SIGN_URL` only to point elsewhere on purpose.
- Matomo events and the Ask FIDES gateway are not built into the pilot pages (Ask FIDES appears in the Learn bar only if `fides-assistant` is active).

Live-site content the pilot reads at run time (all GET): catalog JSON from GitHub (`raw.githubusercontent.com/FIDEScommunity/...`), the organization news feed, supporter logos (via the catalog, mostly Google favicon service), and the **Manifesto photo** `https://fides.community/app/uploads/2025/06/manifesto-768x1024.jpg` (`fides_manifesto_photo` filter replaces or removes it). Seeded content has a few fixed links to live pages (`fides.community/topics/...` in the overview intro, three in Learn texts); they are plain links.

## 6. Catalog data

Staging reads GitHub like production, so nothing is installed from `catalog-data/`. The four files are the committed crawler outputs of the worktrees at the packaged commits (`manifest.json` lists record counts and checksums) and exist to compare with what GitHub serves. The credential plugin's bundled `data/` folder is git-ignored and is therefore **not** in the credential zip; the plugin falls back to GitHub data. The local credential crawl differed from the committed file only in `fetchedAt`, `catalogUrl` and `schemaComment`.

## 7. Checks

Before: `seed.sh preflight`. After: `seed.sh apply` (second run: all `unchanged`), `checks/rehearsal-checks.cjs`, and by hand:

- `/wp-sitemap.xml` is valid XML and still lists the catalog providers; `/wp-admin/` shows no `_load_textdomain_just_in_time` notices.
- View-source of `/design-review/overview/` has `data-fides-ssr` content and `noindex`.
- `/design-review/manifesto/` lists the supporters and both buttons go to the sign form.

Local evidence: the package was installed into a throw-away WordPress (`rehearse-staging.sh`: only package files, scratch database, port 10089) and passed preflight, dry-run, apply, a second apply, the edit-protection cases, the disabled external actions and the browser checks. The rehearsal output is saved as `REHEARSAL.txt` next to the package.

## 8. Rollback points

1. **Before step 3:** database dump and a copy of the five plugin folders (and `blocksy-child`, `fides-vocabulary-glossary` if replaced).
2. **Seed only:** `wp post list --post_type=page --meta_key=_fides_pilot_seed --fields=ID,post_name,post_modified` and the same with `_fides_learn_seed`: review, then `wp post delete <ids> --force`. Pages an editor changed show a later `post_modified`; keep those on purpose. The seed created `fides_use_case_featured`, `fides_ds_updates`, `fides_ds_editorial_links` and `fides_ds_editorial_links_seed` only if they were absent before (preflight prints this); delete them only then.
3. **Config:** remove `mu-plugins/fides-design-review-config.php`; the pages stay but the shell links fall back to live paths.
4. **Plugins:** restore the saved plugin folders, `wp rewrite flush`.
5. **Everything:** restore the database dump.

## 9. Open points for Codex or the owner

- Which staging plugin versions exist today (the zips replace five plugins; the pilot versions are in `manifest.json`).
- Whether `blocksy-child` and the glossary plugin should get their own repositories; until then the zips in `non-git/` are the only source.
- Mail and enquiry destination for the sessions request page; access restriction for the staging site.
- Whether reviewers should stay on staging for the live-site links in section 4/5.
