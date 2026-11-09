# FIDES design pilot: handover for a standalone WordPress site at `/design-review/`

Target: an own WordPress installation (own database, own `wp-content`) that answers at
`https://staging.fides.community/design-review/`. Its `home_url()` and `site_url()` already end in `/design-review`.
The pilot pages sit at the root of that site, so `https://staging.fides.community/design-review/overview/` is the page
`overview` and nothing is repeated (no `/design-review/design-review/`).

This package was built and rehearsed locally in exactly that setup. Nothing in it contacted staging or any other
server; installing it is Codex's job. Nothing here merges, pushes or deploys.

`manifest.json` has the exact commits and plugin versions. `SHA256SUMS` covers every file. `address-scan.json` is the scan
for fixed local and production addresses. `REHEARSAL.txt` (next to the package) is the output of the local rehearsal.

The earlier layout (pilot below another site's root, `/design-review/` as a page of that site) still works with
`PILOT_LAYOUT=subpath`; it is described in section 10 only.

## 1. What is in the package

| Path | Contents | Source |
| --- | --- | --- |
| `plugins/*.zip` | `fides-community-tools-tiles`, `fides-use-case-catalog`, `fides-organization-catalog`, `fides-wallet-catalog`, `fides-credential-catalog` | **Git**: committed state of branch `feature/fides-design-pilot` in the five worktrees (deterministic zips) |
| `non-git/plugins/fides-vocabulary-glossary-*.zip` | glossary plugin (Learn articles and the glossary page use it) | **Local WordPress copy**: no Git repository exists |
| `non-git/themes/blocksy-child-*.zip` | 16-line child theme of Blocksy | **Local WordPress copy**: no Git repository exists |
| `mu-plugins/fides-design-review-config.php` | route mapping, noindex, disabled external actions, standalone detection | **Git** (`use-case-catalog/scripts/design-pilot/staging/`) |
| `seed/` | `seed.sh`, `create-pages.php`, `create-learn-pages.php`, `staging/preflight.php`, `staging/seed-guard.php`, `learn/` (manifest, 12 article/page HTML files, editorial links) | **Git** |
| `catalog-data/*.json` | reference copy of the four committed crawler outputs | **Git** (not installed; see section 7) |
| `checks/rehearsal-checks.cjs` | browser checks that also run against the real staging URL (GET only; the signed-in form check needs a reviewer account) | **Git** |
| `reference/fides-design-pilot-guard.php` | the local-only guard. **Do not install** | **Git** |

Not in the package, on purpose:

- **The local database.** It is a copy of the utrecht-demo database. Pages and options are created by the seed scripts.
- **Uploads / images.** The pilot pages contain no `wp-content/uploads` references. Logos and use case images come from the catalog data (remote). The Manifesto photo is the live media file (section 6).
- **`wp-config.php`, secrets, `local-data/credential-aggregated.json`** and the `fides_local_catalog` option.
- Third-party plugins. The standalone site needs **none** of them (section 3); the parent theme **Blocksy** is required.
- `fides-template-pilot`: an earlier experiment, not used.

## 2. Server and WordPress settings for the subpath `/design-review`

Codex owns the web server. What the site expects:

1. WordPress files in their own directory (or container) that the domain serves under `/design-review/`. Requests below `/design-review/` that are not an existing file go to that installation's `index.php` (nginx: `location /design-review/ { try_files $uri $uri/ /design-review/index.php?$args; }`; Apache: the usual WordPress `.htaccess` with `RewriteBase /design-review/`). Everything outside `/design-review/` belongs to someone else.
2. `wp-config.php`: `define('WP_HOME', 'https://staging.fides.community/design-review');` and `define('WP_SITEURL', 'https://staging.fides.community/design-review');` (same value, no trailing slash), `define('WP_ENVIRONMENT_TYPE', 'staging');`. The seed refuses to run when the path of `home_url()` is not `/design-review` (no doubled path, no site at the domain root).
3. Permalinks `/%postname%/`; flush once after the seed (`wp rewrite flush`).
4. `robots.txt`: WordPress does **not** serve `robots.txt` for a site below a path; the file belongs to the domain root. Add `Disallow: /design-review/` there if you control it. The site itself sends `<meta name="robots" content="noindex, nofollow">` and the header `X-Robots-Tag: noindex, nofollow` on every response; an HTTP authentication in front of `/design-review/` is advised.
5. Databases: use an own database for this site. Nothing in the package touches another site.

## 3. Install order

All commands use `wp --path=<standalone wordpress>`.

1. Install WordPress (core), install and activate the parent theme **Blocksy**, create `wp-config.php` as in section 2.
2. Verify the package: `cd <package> && shasum -a 256 -c SHA256SUMS` and `<repo>/staging/verify-package.sh <package>` if the repo is at hand.
3. Install `blocksy-child` (`non-git/themes`) and activate it. Unzip the six plugin zips (`plugins/` and `non-git/plugins/`) into `wp-content/plugins/` and activate them. `fides-community-tools-tiles` first: the catalog plugins use its SSR renderer.
4. Copy `mu-plugins/fides-design-review-config.php` to `wp-content/mu-plugins/`. It detects the standalone site by itself (no `FIDES_DESIGN_REVIEW_BASE` set and a `home_url()` path of `/design-review`).
5. `WP="wp --path=..." seed/seed.sh preflight` (read only; stops on FAIL), then `seed/seed.sh dry-run`, then `seed/seed.sh apply`. The default layout is `standalone`.
6. `wp rewrite flush`, then run `checks/rehearsal-checks.cjs` (section 8).

The rehearsal installed exactly steps 1 to 6 on a bare WordPress: no Stackable, no WPForms, no Complianz, no sign-in plugin, no uploads folder. Optional plugins (`complianz-gdpr` consent banner, `fides-assistant` for the Ask FIDES item in the Learn bar) only add to the pilot.

The seed refuses any host outside `PILOT_ALLOWED_HOSTS` (default `localhost,127.0.0.1,staging.fides.community`) and always refuses `fides.community`.

## 4. How pages are seeded and how editorial changes survive

- Standalone seeds **flat pages at the site root** (`overview`, `use-case`, ...), the Learn pages under `learn/` and `start/`, and a few companion pages (below). `{{base}}` is empty; there is no parent page.
- Links inside seeded content are **absolute** (`https://<host>/design-review/...`), built from `home_url()` at seed time. Reason: some plugin attributes (for example `detail_url`) are passed through `home_url()` and others are printed as they are, so a root-relative `/design-review/...` is wrong for one of them. Edit detection compares the content with the host replaced by `{{home}}`, so moving the site to another domain (`wp search-replace`, new `WP_HOME`) does not make every page look edited.
- Every seeded page gets a marker and a hash of the state it was seeded with (`_fides_pilot_seed*`, `_fides_learn_seed*`). A later `apply`:
  - changes a marked page only while it is still identical to the stored state;
  - **skips and reports** a page an editor changed (`skipped-edited`);
  - never touches an existing page at the same path that has no marker (`skipped-unmarked`);
  - never overwrites an existing option (`fides_use_case_featured`, `fides_ds_updates`, `fides_ds_editorial_links`);
  - sets the front page only while `page_on_front` is `0`.
- Replace a page on purpose with `PILOT_FORCE="overview"` (pilot pages; the full path) or `LEARN_FORCE="topics"` (Learn pages). The old state is saved as JSON under `PILOT_BACKUP_DIR` (default `./seed-backups/<time>`) first.
- `dry-run` writes nothing. Re-running `apply` on an unchanged site reports every page as `unchanged`.

Pages seeded (all with the FIDES site shell template): `pilot-pages` (index), `homepage-fragment` (also made the **front page**, so `/design-review/` is the pilot homepage), `overview`, `use-case`, `organizations`, `organization`, `personal-wallets`, `business-wallets`, `wallet`, `credentials`, `credential`, `existing-listing` (existing modal listing, for parity checks), `about-fides`, `manifesto`, `updates`, the Learn tree (`learn`, `learn/topics`, two topic pages, two example articles, `learn/sessions` with two offerings and `request`, `start`, `start/receive`), and the **companion pages** that live on fides.community and that the pilot links to: `use-case-form`, `organizations-submit`, `organizations-update`, `wallet-submit`, `credential-submit`, `wallets-update`, `credentials-update` (plugin form shortcodes) and `glossary`.

## 5. Settings and URL mappings

`mu-plugins/fides-design-review-config.php` (route map identical to the local guard; `staging/verify-package.sh` compares the two). All targets below are on the standalone site, prefixed by `/design-review`:

| Shell destination (fides.community path) | Pilot target |
| --- | --- |
| `/` (logo) | `/design-review/` (the pilot homepage) |
| `/about-fides/`, `/manifesto/`, `/about-fides/news/` | `/about-fides/`, `/manifesto/`, `/updates/` |
| `/learn/`, `/learn/topics/`, `/ecosystem-explorer/start/` | `/learn/`, `/learn/topics/`, `/start/` |
| `/ecosystem-explorer/use-cases/` | `/overview/` |
| `/ecosystem-explorer/personal-wallets/`, `/organizational-wallets/`, `/credential-catalog/` | `/personal-wallets/`, `/business-wallets/`, `/credentials/` |
| `/organizations/` | `/organizations/` |
| `/community-tools/glossary/` | `/glossary/` (seeded) |
| `/ecosystem-explorer/use-cases/submit-use-case/`, `/organizations/submit-organization/`, `/organizations/update-organization/` | `/use-case-form/`, `/organizations-submit/`, `/organizations-update/` (seeded) |
| `/ecosystem-explorer/` (explorer), `.../map/`, `.../theme/`, `.../issuer-catalog/`, `.../relying-party-catalog/` | **not on this site**: link to `https://fides.community` + the original path (read-only navigation) |

Everything else without a page on the site (Plugfests, Community tracks, Awards, Plans, Interop profiles, Contact, Terms, Privacy, ...) also links to `https://fides.community` + path. `FIDES_DESIGN_REVIEW_LIVE_FALLBACK` changes the origin or hides those links (`''`).

Optional constants in `wp-config.php` (none is required):

| Constant | Default | Effect |
| --- | --- | --- |
| `FIDES_DESIGN_REVIEW_STANDALONE` | automatic | `true` forces the standalone behaviour (every request is a pilot request: noindex, badge) |
| `FIDES_DESIGN_REVIEW_OUTGOING` | `blocklist` | `blocklist`: no outgoing write request to GitHub or the production site; `strict`: none to any other host; `off` |
| `FIDES_DESIGN_REVIEW_ALLOW_MAIL` | not set (mail not sent) | `true` allows `wp_mail()` |
| `FIDES_DESIGN_REVIEW_LIVE_FALLBACK` | `https://fides.community` | see above |
| `FIDES_DESIGN_REVIEW_SIGN_URL` | live form | Manifesto sign form; standalone default `https://fides.community/manifesto/#ratify-the-fides-manifesto-today` |
| `FIDES_DESIGN_REVIEW_BADGE` | shown | `false` hides the "Design review" badge |

Other settings that matter:

- Catalog hosts: the loaders treat `*.local` and `localhost` as local development and read plugin data first. `staging.fides.community` is neither, so catalogs read GitHub first, like production.
- Option defaults that point at the live site (read-only links in details and cross references): `fides_org_catalog_issuer_catalog_url`, `..._credential_catalog_url`, `..._wallet_catalog_url`, `..._rp_catalog_url`, `..._use_case_catalog_url`, `fides_credential_catalog_trust_scheme_catalog_url`, plus the credential plugin constants `FIDES_CREDENTIAL_CATALOG_DEFAULT_*_URL`. Set the options to `/design-review/` paths if reviewers should stay on the site.
- Do not set `fides_use_case_catalog_prefer_local_source`; the local guard sets it to false only because `localhost` is not `*.local`.
- Address scan of the shipped code: no `localhost`, port 10088, `utrecht-demo` or `/fides-design-pilot` in code that runs on staging, and no hard-coded `/design-review` in the plugins. The only place that knows the path is the mu-plugin (detection from `home_url()`) and the seed scripts (`PILOT_HOME_PATH`, default `/design-review`).

## 6. Demo parts and dependencies

Demo / preview parts (in the package, not production features):

- The **Training & workshops enquiry** (`learn/sessions/request/`) is a local preview: it never submits, stores or mails anything.
- The **submission and update forms** are the real plugin forms. They need a signed-in visitor. On a bare standalone site that means a WordPress account (the plugins fall back to `wp-login.php` when no sign-in option exists). Create a reviewer account if the forms must be demonstrated. With the defaults they can store a submission in this site's database; GitHub writes and mail are blocked (below).
- Learn example articles have no author or date by design and need editorial review.
- The homepage, spotlight and featured use case are pilot compositions of catalog records.
- The detail routes are `/design-review/use-case/?usecase=<id>` (and `?org=`, `?wallet=`, `?credential=`). Production still needs one decided route, canonical and redirects.

What the standalone site does **not** have, and what happens instead:

- The existing fides.community sign-in (OID4VP / e-mail login). The shell "Sign in" link goes to `wp-login.php` of this site.
- The Manifesto sign form (a WPForms form is site content): the sign buttons open the live form (constant above).
- Explorer, map, theme, issuer and relying party catalog pages: links to the live site.

Disabled external actions (mu-plugin defaults):

- Outgoing POST/PUT/PATCH/DELETE to `github.com`, `api.github.com`, `raw.githubusercontent.com` and `fides.community`: blocked. GET stays open so catalog data loads.
- `wp_mail()`: nothing is sent (form notifications, password resets and the sessions enquiry included) until `FIDES_DESIGN_REVIEW_ALLOW_MAIL` is set.
- Search engines: noindex meta tag and `X-Robots-Tag` on every response.
- Matomo events and the Ask FIDES gateway are not built into the pilot pages.

Live-site content the pilot reads at run time (all GET): catalog JSON from GitHub (`raw.githubusercontent.com/FIDEScommunity/...`), the organization news feed, supporter logos (via the catalog, mostly Google favicon service), and the **Manifesto photo** `https://fides.community/app/uploads/2025/06/manifesto-768x1024.jpg` (`fides_manifesto_photo` filter replaces or removes it). Seeded content has a few fixed links to live pages (`fides.community/topics/...`); they are plain links.

## 7. Catalog data

The site reads GitHub like production, so nothing is installed from `catalog-data/`. The four files are the committed crawler outputs at the packaged commits and exist to compare with what GitHub serves. The credential plugin's bundled `data/` folder is git-ignored and therefore **not** in the credential zip; the plugin falls back to GitHub data.

## 8. Checks

Before: `seed.sh preflight`. After: `seed.sh apply` (second run: all `unchanged`), then

```
PILOT_URL=https://staging.fides.community PILOT_LAYOUT=standalone PILOT_BASE=design-review \
  PLAYWRIGHT_MODULE=<path to playwright> node checks/rehearsal-checks.cjs
```

(read only; add `REHEARSAL_USER` / `REHEARSAL_PASS` of a reviewer account for the signed-in form checks; the script then performs only the sign-in POST). It covers: every pilot page (200, heading, noindex meta and header, no overflow at 1440/390/320), the homepage, Learn, all catalog listings, the first detail page of each catalog, the seeded forms, a link audit (every internal link of every page stays below `/design-review/`, none is doubled, each answers 200), a scan of every page's HTML for root-relative or absolute addresses outside the base, Manifesto tiles and sign route, and a no-write-request check.

By hand: `/design-review/wp-sitemap.xml` is valid XML; `/design-review/wp-admin/` shows no `_load_textdomain_just_in_time` notices; view-source of `/design-review/overview/` has `data-fides-ssr` content and `noindex`.

## 9. Rollback (a separate WordPress site)

Because the pilot is its own site, the rollback is mostly "remove the site"; nothing else on the domain changes.

1. **Before step 1:** note the web server rule for `/design-review/` and the database name. A fresh site has nothing to back up; for a site that already existed, take a database dump and a copy of its files first.
2. **Take the pilot offline without deleting it:** remove (or disable) the `/design-review/` rule at the web server. All other URLs on the domain are unaffected. Put it back to bring the site back.
3. **Seed only:** `wp post list --post_type=page --meta_key=_fides_pilot_seed --fields=ID,post_name,post_modified` and the same with `_fides_learn_seed`: review, then `wp post delete <ids> --force`. Pages an editor changed show a later `post_modified`; keep those on purpose. If the seed set the front page (the `apply` output has a `front page set` row), run `wp option update show_on_front posts && wp option update page_on_front 0`. Delete `fides_use_case_featured`, `fides_ds_updates`, `fides_ds_editorial_links` and `fides_ds_editorial_links_seed` only if they were absent before (preflight prints this).
4. **Config:** remove `mu-plugins/fides-design-review-config.php`; links in the shell then point at `/design-review/...` paths without the map and noindex protection is gone. Do this only together with step 2.
5. **Plugins and theme:** `wp plugin deactivate --all` (this site only) and delete the plugin folders and `blocksy-child`.
6. **Everything:** drop the database and delete the site directory. No other database, file or DNS record belongs to the pilot.

## 10. Earlier layout (pilot below another site)

`PILOT_LAYOUT=subpath seed/seed.sh ...` seeds the same pages under `/<PILOT_BASE>/` (default `design-review`) of a site at the domain root, with the existing forms and glossary of that site. The mu-plugin then needs no standalone detection (`FIDES_DESIGN_REVIEW_BASE` may be set). Rollback there is the page-level rollback of section 9, step 3, plus restoring that site's database dump.

## 11. Open points for Codex or the owner

- Whether `blocksy-child` and the glossary plugin should get their own repositories; until then the zips in `non-git/` are the only source.
- Mail and enquiry destination for the sessions request page; access restriction for the site.
- Whether reviewers need sign-in on the standalone site (WordPress accounts) to try the forms, or whether the form pages should link to the live forms instead.
- Whether reviewers should stay on the site for the live-site links in sections 5 and 6 (options listed there).

## Language switcher (TranslatePress)

- The EN / NL switcher sits in the site header (`Fides_DS_Site_Shell::language_switcher_html()`). It uses only TranslatePress data: `trp_custom_language_switcher()` for languages and destinations, `TRP_Language_Switcher_V2::get_flag_html()` for flags. There is no own router or translation storage. The header renders nothing when TranslatePress is missing or fewer than two languages are published.
- On staging, switch the floating switcher off in TranslatePress → Languages → Language Switcher (option `trp_language_switcher_settings`, `floater.enabled = false`). This is a database setting, not code, so repeat it per site.
- Keep TranslatePress → Advanced → Debug → "Disable post container tags for post title" on. It changes how translated post titles are indexed, so revisit it when search gets Dutch support.
- Run `tests/run-language-switcher-checks.sh` after changes.
