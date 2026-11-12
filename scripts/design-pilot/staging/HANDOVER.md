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
| `seed/` | `seed.sh`, `create-pages.php`, `create-learn-pages.php`, `staging/preflight.php`, `staging/seed-guard.php`, `learn/` (manifest, 26 Learn HTML files (the overview, topic pages and eleven articles: "Trust and interoperability", EUDI Wallet, European Business Wallet, their comparison, "What is a credential?", "What is a digital wallet?", "Formats and protocols: what do they do?", "Issuing credentials for wallets", "Accepting information from a wallet", plus the two reworked articles "How credentials connect..." and "Business wallets: where to start"), editorial links, `nl-translations.php`), `awards/` (content, image manifests with file/size/SHA-256, and `awards/images/`: the 107 bundled award images + `PROVENANCE.txt`) | **Git** |
| `catalog-data/*.json` | reference copy of the four committed crawler outputs | **Git** (not installed; see section 7) |
| `checks/rehearsal-checks.cjs` | browser checks that also run against the real staging URL (GET only; the signed-in form check needs a reviewer account) | **Git** |
| `reference/fides-design-pilot-guard.php` | the local-only guard. **Do not install** | **Git** |

Not in the package, on purpose:

- **The local database.** It is a copy of the utrecht-demo database. Pages and options are created by the seed scripts.
- **Uploads / images.** Only the two awards pages reference `wp-content/uploads`: their images are bundled in `seed/awards/images/` and imported from there (section 5, "Awards pages"). Logos and use case images come from the catalog data (remote). The Manifesto photo is the live media file (section 6).
- **`wp-config.php`, secrets, `local-data/credential-aggregated.json`** and the `fides_local_catalog` option.
- Third-party plugins. The standalone site needs **none** of them for the English pilot (section 3); the parent theme **Blocksy** is required. **TranslatePress** is also not in the package: it is only needed for the Dutch (`/nl/`) version, see "Dutch version" below.
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
- Learn pages follow the same rule with `_fides_learn_seed_hash`; an edited page stays as it is (also in dry-run). Details and the test are in `learn/README.md` ("Seeding and overwrite protection"). Learn pages need `fides-community-tools-tiles` 1.13.45 or later (source URL percent-encoding fix `0c89d3f`, `[fides_learn_usecase]` cards).
- `dry-run` writes nothing. Re-running `apply` on an unchanged site reports every page as `unchanged`.

Pages seeded (all with the FIDES site shell template): `pilot-pages` (index), `homepage-fragment` (also made the **front page**, so `/design-review/` is the pilot homepage), `overview`, `use-case`, `organizations`, `organization`, `personal-wallets`, `business-wallets`, `wallet`, `credentials`, `credential`, `existing-listing` (existing modal listing, for parity checks), `about-fides`, `manifesto`, `updates`, the Learn tree (`learn`, `learn/topics`, two topic pages, two example articles, `learn/sessions` with two offerings and `request`, `start`, `start/receive`, and the Services tree `services`, `services/wallet-readiness-assessment`, `services/enquiry`), the two **awards pages** (`global-digital-trust-awards`, `fides-community-awards`), and the **companion pages** that live on fides.community and that the pilot links to: `use-case-form`, `organizations-submit`, `organizations-update`, `wallet-submit`, `credential-submit`, `wallets-update`, `credentials-update` (plugin form shortcodes) and `glossary`.

## 5. Settings and URL mappings

`mu-plugins/fides-design-review-config.php` (route map identical to the local guard; `staging/verify-package.sh` compares the two). All targets below are on the standalone site, prefixed by `/design-review`:

| Shell destination (fides.community path) | Pilot target |
| --- | --- |
| `/` (logo) | `/design-review/` (the pilot homepage) |
| `/about-fides/`, `/manifesto/`, `/about-fides/news/` | `/about-fides/`, `/manifesto/`, `/updates/` |
| `/learn/`, `/learn/topics/`, `/ecosystem-explorer/start/`, `/services/` | `/learn/`, `/learn/topics/`, `/start/`, `/services/` |
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

Awards pages: the 107 images (83 + 24, about 73 MB) are **bundled** in `seed/awards/images/` and imported into this site's media library from that local folder with `media_handle_sideload()`. No outgoing HTTP is involved, so the outgoing guard does not need to be loosened (no GET allowlist). Why this way: it removes the network dependency completely, the guard stays exactly as it is, a build/verify step proves the files are the reviewed ones (SHA-256 and size per image in `seed/awards/manifest.json` and `community-manifest.json`), and an image can never point at the live site. The seed imports each image once: an attachment with the marker meta `_fides_awards_source` (= the original URL) whose file exists is reused, so a second `apply` reports `unchanged`. An attachment whose file is missing on disk (restored database without uploads) is imported again and takes over the marker. If a bundled file is missing or its checksum differs, the page is reported as `skipped-images` with the reason (first three images) and nothing is guessed; `PILOT_AWARDS_IMAGES_DIR` points the seed at another image folder. Downloading from the live site exists only as an explicit opt-in for local development (`PILOT_AWARDS_ALLOW_DOWNLOAD=1`); never set it on staging. Provenance: the files are the images the live pages use (`seed/awards/images/PROVENANCE.txt` lists file, SHA-256 and source URL). Usage rights of the ceremony photos are not documented in the repository: the site is noindex and not public, but check with FIDES communications before any public use. The glossary and the About FIDES menu link to these pages, so the link audit fails (404) until they exist.

Re-running only the awards pages on staging (idempotent, no network): `WP="wp --path=..." seed/seed.sh dry-run`, check that both awards pages say `would-created` (or `unchanged`), then `seed.sh apply`. Verify with `GET /design-review/global-digital-trust-awards/` and `/fides-community-awards/`: HTTP 200, every `<img src>` starts with the site's own `/design-review/wp-content/uploads/`, and `GET` of three of those image URLs returns `200 image/*`. The catalog cards on these pages (finalists, winners) show cover and logo images of the catalog data: those stay absolute https links to their own origin and are loaded by the visitor's browser, not by the server.

Link rewriting does not touch awards content: the only rewriting is the `fides_site_shell_url` filter of the config mu-plugin (header, footer and menu destinations). Image sources, `https://fides.community/...` links and catalog image URLs in page content are never rewritten, and the `{{pilot}}` / `{{base}}` tokens of the seed are replaced once at seed time.

## 6. Demo parts and dependencies

Demo / preview parts (in the package, not production features):

- The **Training & workshops enquiry** (`learn/sessions/request/`) and the **Services enquiry** (`services/enquiry/`) are local previews: they never submit, store or mail anything. Services actions for services without a page go to the site Contact page (`/about-fides/contact/`, the live page in the pilot).
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

## Glossary data (one version for the glossary page, the popups and Learn)

- **Source of truth:** `data/vocabulary.json` in `fides-interop-profiles`; `npm run build:glossary` generates `data/glossary-aggregated.json`. The version in this package is recorded in `staging/glossary-source.json` (source commit, sha256, term count, required ids). Pinned to glossary **1.12.2** (published, squash commit `a52a684`; see "Glossary status (current)" below), 344 terms. Published 1.12.0 is `b27bc88` (merged PR #4): duplicates merged (`duplicateOf`), `other` and `other-2` hidden (`hidden: true`), and `legacyIds` for renamed ids (sd-jwt-vc-2, iso18013-5, iso18013-7, vcdm20, mdoc). The glossary plugin copy is 1.1.16; tiles 1.13.47 (with 1.13.46's) has the `legacyIds` lookup and 301 redirect, and the pilot glossary page resolves old `?term=` ids.
- **Who reads what:** the glossary page (tiles) and the plugin script read the URL option `fides_vocabulary_glossary_github_data_url` (default GitHub `main`) first and the bundled file second; Learn reads the bundled file only. The catalog "i" popups (`openVocabularyModal`) read a different file, `data/vocabulary.json` from GitHub `main`, with the plugin's `assets/vocabulary.json` as fallback; the interop matrix does the same with its own copy.
- **On the review site** `mu-plugins/fides-design-review-config.php` (local pilot: the guard) points that option at the bundled file, so the glossary page and Learn show the same version without depending on an unpublished GitHub change. Production never loads these files. Set `FIDES_DESIGN_REVIEW_GLOSSARY_SOURCE` to `'github'` in `wp-config.php` to use the plugin default again, for example after the source change is merged.
- **How it comes along:** the glossary plugin is in the package as a zip (`non-git/plugins/fides-vocabulary-glossary-<version>.zip`, installed in step 3) and contains `data/glossary-aggregated.json`. `build-package.py` refuses to build, and `verify-package.sh` and `seed/staging/preflight.php` fail, when that file does not match `glossary-source.json` (sha256, 344 terms, the required ids listed there, the legacy-id map and the ids that must be absent: `credential`, `credential-type`, `verifiable-credential-type`, `mandate` and the eIDAS terms); the manifest has a `glossary_data` block. There is no manual copy step on staging.
- **Update steps:** (1) change `data/vocabulary.json` in `fides-interop-profiles`; (2) `npm run build:glossary`; (3) copy `data/glossary-aggregated.json` over the pilot's `wp-content/plugins/fides-vocabulary-glossary/data/` (this copy is not in git); (4) update `staging/glossary-source.json`; (5) commit, run `staging/verify-package.sh` (and a dry-run build into a temporary folder).
- **Not covered (current):** the catalog "i" popups (tiles, organization, wallet catalogs) read `vocabulary.json` from GitHub `main`, with the catalog plugin's `assets/vocabulary.json` as fallback; most fallback copies do not contain the European Business Wallet term at all. The interop matrix has its own copy (`fides-interop-matrix/assets/vocabulary.json`, version 1.10.0) with the old European Business Wallet text; it belongs to another repository and is not changed here. After the merge, live fides.community follows `main` through the aggregate (cache about 1 hour).
- **Duplicates (historic: fixed in `aa84e8b`, merged in 1.12.0):** the catalog [i] popups, in code that ships today (tiles `WALLET_OPTION_TO_VOCAB`, organization catalog), look up the short keys `QEAA`, `QERDS`, `QESeal`, `QESig`, ... in `vocabulary.json`, so those keys stay. `QEAA` and `QERDS` describe the same concept as the long terms: they now carry `duplicateOf` (same description and source URL as the long term); the build does not list them as glossary terms and merges their key and aliases into the long term, so searching the abbreviation or the full name gives one card. `QESeal` and `QESig` are certificates, a different concept from the Qualified Electronic Seal/Signature, so they got distinguishing titles ("Qualified Electronic Seal Certificate", ...) and the alias `QESeal` was removed from the seal term. The other 12 short terms got descriptive titles, the key as alias and the eIDAS Regulation as source URL. No id that exists on the live glossary changed: `qeaa` and `qerds` were never in a published aggregate (live: 335 terms, built 2026-07-01). `npm run check:glossary` in `fides-interop-profiles` fails when the aggregate is stale or a label resolves to two terms; the CI step is `.github/workflows/glossary-check.yml`.
- **Glossary status (current):** pinned in `staging/glossary-source.json`: version **1.12.2**, published as squash commit `a52a684` (PR #6, merged 11 November 2026) on `main` of `fides-interop-profiles` (`main` later moved to `9f0ef2a` through the matrix PR #7 without touching the glossary files), `source_commit_published: true`, 344 terms, aggregate sha256 `35552464…18a6`, vocabulary sha256 `a33c4f78…e3af`. The bundled files equal the published files. 1.12.2 changes four definitions on top of 1.12.1: *European Unique Identifier*, *QERDS* (both entries), *EU Company Certificate* and *Single Digital Gateway* now present their European Business Wallet link as part of the Commission proposal (EU Company Certificate no longer mentions the 28th regime); *Economic operator* is unchanged; no ids, keys, aliases or links changed. 1.12.1 (`9bf77c9`) differs from 1.12.0 (`b27bc88`) in five definitions: *European Business Wallet*, *Legal equivalence*, *Core minimum functionalities*, *European Digital Directory* and *Power of Attorney* now describe the Commission proposal (checked against COM(2025) 838 on EUR-Lex); no ids, keys, aliases or links changed. Catalog popups and the glossary page read the published `main`; the interop matrix fallback copy is separate (see its own branch/notes). **Historic:** the earlier source commits `bd923fe`, `0b63c68`, `aa84e8b` and the review PR text in `learn/glossary-pr-description.md` belong to the merged 1.12.0 round.

## 11. Open points for Codex or the owner

- **Learn, before staging/livegang:** (1) `Browse issuers` and `Browse relying parties` have no destination inside the pilot or the package (the roots `/issuer-catalog/` and `/relying-party-websites/` exist only on the full site), and neither has an interop profiles or interop matrix page; no Learn page links to them. (2) Glossary data: see "Glossary data"; the review site reads the bundled file. (3) Use case cards on the two business wallet articles and the VOG articles are live from the catalog record (`[fides_learn_usecase]`); recheck the paragraph above each card when the use case is changed. (4) `/nl/` routes show the English article with Dutch interface labels; there is no Dutch translation (inventory for the first route: `learn/translatepress-nl-inventory.md`). (5) Tiles: pilot 1.13.49 (1.13.49 shows the source name in the Learn sources list in semibold, with a tighter list: 32px rows on desktop, 44px touch target on mobile, no data or seed change; 1.13.48 removes the "Link to this term" action from open glossary terms; the address bar keeps `?term=<id>`; 1.13.45 or later is required; 1.13.46 adds the glossary `legacyIds` handling; 1.13.47 makes the article sources list compact: one open link line per source, no visible URL, external indicator and new tab only for other hosts, no data or seed change); glossary plugin copy 1.1.16. (6) Learn seed content: take the number of files from `ls learn/content` and the `pages` in `learn/manifest.json` when the package is built (26 files and 26 manifest pages on 11 November 2026); do not maintain the count by hand elsewhere. The new articles are "What is a digital wallet?", "Formats and protocols: what do they do?" and "Trust and interoperability"; the Big picture hub order, the Topics entry links and shorter follow-up lists also changed (all via the seed). An edited page on staging is skipped by the seed (also in dry-run); read the output and compare, never force. (7) For the record owner: the VOG use case card says the catalog marks the use case as in production (`productionDeployment: yes`), while the summary describes a successful pilot with sports associations and Justis investigating digital issuance; the record needs clarifying (the pilot did not change it).
- Whether `blocksy-child` and the glossary plugin should get their own repositories; until then the zips in `non-git/` are the only source.
- Mail and enquiry destination for the sessions request page; access restriction for the site.
- Whether reviewers need sign-in on the standalone site (WordPress accounts) to try the forms, or whether the form pages should link to the live forms instead.
- Whether reviewers should stay on the site for the live-site links in sections 5 and 6 (options listed there).

## Language switcher (TranslatePress)

- The EN / NL switcher sits in the site header (`Fides_DS_Site_Shell::language_switcher_html()`). It uses only TranslatePress data: `trp_custom_language_switcher()` for languages and destinations, `TRP_Language_Switcher_V2::get_flag_html()` for flags. There is no own router or translation storage. The header renders nothing when TranslatePress is missing or fewer than two languages are published.
- On staging, switch the floating switcher off in TranslatePress → Languages → Language Switcher (option `trp_language_switcher_settings`, `floater.enabled = false`). This is a database setting, not code, so repeat it per site.
- Keep TranslatePress → Advanced → Debug → "Disable post container tags for post title" on. It changes how translated post titles are indexed, so revisit it when search gets Dutch support.
- Run `tests/run-language-switcher-checks.sh` after changes.

## Glossary page switch

The new glossary page is off by default in the tiles plugin. On the design-review site `staging/fides-design-review-config.php` switches it on for the page with the slug `glossary` only (filter `fides_ds_glossary_page_enabled`). To activate it later on production or another site, use the filter, `define('FIDES_DS_GLOSSARY_PAGE', true)`, or the custom field `_fides_ds_glossary_page` = `1` on the page; remove it to return to the classic glossary. Dutch strings: see "Glossary page" in the pilot README (strings render as hidden text nodes so TranslatePress can translate them; the glossary data stays English).

## Dutch version (`/nl/`, optional, needs TranslatePress)

The English pilot works without any translation plugin; the header then shows no language switcher. Dutch needs
TranslatePress (free plugin, installed from wordpress.org, **not** part of this package) with English (US) as the default and
Dutch (`nl_NL`) as the second language, in this site's own database (its own table prefix gives its own dictionary table).

1. Install and activate TranslatePress, add Dutch, switch the floating switcher off and keep the debug option on (section "Language switcher").
2. Open each seeded page once under `/design-review/nl/...` (at least `/nl/`, `/nl/services/`, `/nl/services/enquiry/`, `/nl/learn/`, `/nl/learn/sessions/`, `/nl/glossary/`). TranslatePress only creates dictionary rows after the first visit.
3. `wp eval-file seed/learn/nl-translations.php status` lists strings without a row and rows still untranslated; then `wp eval-file seed/learn/nl-translations.php apply`. It fills empty rows only and never overwrites a translation an editor made.
   **Transfer of the Dutch Learn, Training & workshops, Services and start/receive translations:** the package contains `seed/learn/nl-translations.json` (export of the local dictionary: key = English source text, value = Dutch, no database ids, no personal data) and `seed/learn/nl-translations-transfer.php`. After step 2 run, in this order: `wp eval-file seed/learn/nl-translations-transfer.php status` (dry run: add, same, **differs** = existing translation kept and reported, **pending** = open that page under `/nl/` first, **stale** = the English source sentence changed since the export, **new** = English string without translation), then `wp eval-file seed/learn/nl-translations-transfer.php import-apply`. It fills empty rows only (never overwrites; there is no overwrite option), only rows whose English source is in the file and that belong to a route listed there (rows of other pages stay untouched; `status` shows the `scope:` and `outside scope:` counts), is repeatable (second run: 0 to add) and must not be run before the pages were opened once under `/nl/` (open the `/nl/` Learn, Training & workshops, Services and start pages first, including the eight Learn articles that were changed). The tool reads only the route pages' public HTML, the dictionary rows of those strings and four allowlisted gettext strings; it reads no form entries, mail logs, users or options. If a Learn article was edited on staging, the seed skips it and its sentence openers keep the old structure (a lone `A`/`The` then shows English in the Dutch view); re-seed that page deliberately or fix it in the page editor. A reviewer checks the Dutch text in the TranslatePress editor; run `export` on the editing site and commit the changed JSON to hand over later edits. Details: `learn/README.md`, "Dutch translations (TranslatePress): transfer, status and editing" (the repository document; not in the package). The lone fragments `A`, `An` and `The` are not transferred (the Learn articles carry the article inside the term, link or bold text); `and`, `or` and similar pieces are flagged `fragment`.
   **Terminology:** `learn/nl-terminology.md` (repository document; round 2 corrections: `learn/nl-translation-changes-2026-11-12-b.md`) holds the agreed Dutch terms (relying party = vertrouwende partij, and so on). Staging rows that already hold an older term are not changed by `import-apply`; see the list of changed translations in `learn/nl-translation-changes-2026-11-12.md` and `staging/UPDATE-PLAN-NL-LEARN.md`.
   **Updating an existing staging site** with this Dutch Learn route (backup, dry-runs, decision point, apply, verification, rollback): `staging/UPDATE-PLAN-NL-LEARN.md` in the repository (the 27 English strings that stay untranslated are reviewed in `learn/nl-remaining-strings-review.md`).
4. Glossary interface strings (25) are translated in the TranslatePress editor on `/nl/glossary/`; see the pilot README, "Glossary page".

Link paths in Dutch: TranslatePress filters `home_url()` per language (`/design-review/nl`). The config mu-plugin therefore detects the standalone layout from the stored `home` option / `WP_HOME` (never from the filtered `home_url()`), and it ignores a leading language segment when deciding whether a request is a pilot request. Earlier versions detected the layout from `home_url()`, which on `/nl/` pages looked like a subpath site and produced `/design-review/nl/design-review/learn/`. Checks: `tests/run-nl-links-checks.sh` (PHP behaviour for every shell destination in EN and NL, GET check of header/footer/switcher links) and `curl` after an update (section 8, Checks).

Known limits of the Dutch version: the cookie consent banner (Complianz), the Ask FIDES assistant widget and the data of the catalogs stay English; the section name "Learn" stays English on purpose; header and footer texts that are not part of the seeded pages can stay English until translated in the editor; Contact, Privacy, Terms and the other links without a pilot page open the live site (English); catalog data (descriptions, names) is English.
