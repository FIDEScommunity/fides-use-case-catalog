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
| `seed/` | `seed.sh`, `create-pages.php`, `create-learn-pages.php`, `staging/preflight.php`, `staging/seed-guard.php`, `learn/` (manifest, 57 HTML content files, one per manifest page (52 Learn pages, 3 Services pages, 2 start pages; the summary that follows names a selection only: the overview, the three practice-question articles under For businesses (acting for an organisation, preparing a wallet use case, checking a received credential), the For you overview and its three articles (receiving, sharing, choosing and managing a wallet), the For governments overview and its four articles (digital wallets and public services, issuing public information, accepting information in public services, the EUDI Wallet and national implementation), topic pages including the Ecosystem roles overview and its five role articles (the holder, the issuer, the relying party, wallet providers and other service providers, trust service providers and trust frameworks), and eleven articles: "Trust and interoperability", EUDI Wallet, European Business Wallet, their comparison, "What is a credential?", "What is a digital wallet?", "Formats and protocols: what do they do?", "Issuing credentials for wallets", "Accepting information from a wallet", plus the two reworked articles "How credentials connect..." and "Business wallets: where to start"), editorial links, `nl-translations.php`), `awards/` (content, image manifests with file/size/SHA-256, and `awards/images/`: the 107 bundled award images + `PROVENANCE.txt`) | **Git** |
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

- **Learn, before staging/livegang:** (1) `Browse issuers` and `Browse relying parties` have no destination inside the pilot or the package (the roots `/issuer-catalog/` and `/relying-party-websites/` exist only on the full site), and neither has an interop profiles or interop matrix page; no Learn page links to them. (2) Glossary data: see "Glossary data"; the review site reads the bundled file. (3) Use case cards on the two business wallet articles and the VOG articles are live from the catalog record (`[fides_learn_usecase]`); recheck the paragraph above each card when the use case is changed. (4) The Dutch translations of the `/nl/` routes exist locally (local pilot, entered 12-14 November 2026) and are handed over to staging separately, not through the seed: via TranslatePress export/import with `learn/nl-translations.php` (local authoring helper, not for staging), `learn/nl-translations-transfer.php` and `learn/nl-translations.json` (steps in "Dutch version (`/nl/`)" below and in `staging/UPDATE-PLAN-NL-LEARN.md`; the entry count is in the `counts` block of the JSON file). Existing translations on staging are never overwritten automatically: rows an editor entered by hand stay and are reported as `differs`. Attention point: English glossary definitions and catalog (use case record) titles still appear on some `/nl/` routes; decision of 14 November 2026: they stay, the glossary translation round is parked, no catalog records are translated (`learn/nl-known-english-remains.md`). Do not report these as open defects. Earlier inventory: `learn/translatepress-nl-inventory.md`. (5) Tiles: pilot 1.13.51 (1.13.51 makes the "Back to results" label on record pages translatable (server-rendered, TranslatePress) and shows it only after a visit from the overview; 1.13.50 adds the shared page header for Training & workshops, Updates, Global Digital Trust Awards, the personal wallet overview and the wallet detail: two H1 roles, breadcrumb, label, intro and spacing from the page-header styleguide, no data or seed change for Learn; 1.13.49 shows the source name in the Learn sources list in semibold, with a tighter list: 32px rows on desktop, 44px touch target on mobile, no data or seed change; 1.13.48 removes the "Link to this term" action from open glossary terms; the address bar keeps `?term=<id>`; 1.13.45 or later is required; 1.13.46 adds the glossary `legacyIds` handling; 1.13.47 makes the article sources list compact: one open link line per source, no visible URL, external indicator and new tab only for other hosts, no data or seed change); glossary plugin copy 1.1.16. (6) Learn seed content: take the number of files from `ls learn/content` and the `pages` in `learn/manifest.json` when the package is built (41 files and 41 manifest pages on 12 November 2026); do not maintain the count by hand elsewhere. The new articles are "What is a digital wallet?", "Formats and protocols: what do they do?" and "Trust and interoperability"; the Big picture hub order, the Topics entry links and shorter follow-up lists also changed (all via the seed). An edited page on staging is skipped by the seed (also in dry-run); read the output and compare, never force. The Ecosystem roles overview (`topics/ecosystem-roles`, kind section) is a new seed page; the Topics page and five articles (how credentials connect, trust and interoperability, what is a digital wallet, issuing, accepting) gained a link to it, and if staging holds an edited copy of one of them the seed skips it and the link is added by hand. For governments (`topics/for-governments`, kind section, four articles with series `for-governments`) is a new seed page set; the Topics row links to it and the EUDI, issuing and accepting articles gained a link; if staging holds an edited copy of one of those pages the seed skips it and the link is added by hand. The GBO example uses version 0.9.5 (September 2026), a draft design submitted for adoption (consulted 12 November 2026; status check in `learn/for-governments-editorial-gaps.md`), Dutch proposals in `learn/nl-translation-changes-for-governments.md` (not seeded; the Dutch was entered locally and goes over through the transfer file). For you (`topics/for-you`, kind section, three articles with series `for-you`) is a new seed page set; the Topics row links to it and What is a digital wallet?, What is a credential? and The holder gained a "Learn more" item; if staging holds an edited copy of one of those pages the seed skips it and the link is added by hand. Deviations and gaps: `learn/for-you-editorial-gaps.md`, Dutch proposals in `learn/nl-translation-changes-for-you.md` (not seeded; the For you rows are still to be checked against `nl-translations.json` before staging). The five role articles are written (see the Ecosystem roles round); the remaining gaps are in `learn/ecosystem-roles-editorial-gaps.md`, the Dutch proposals in `learn/nl-translation-changes-ecosystem-roles.md` (not seeded; entered locally 12-13 November 2026 and handed over through the transfer file). (6b) Technology and Around the world (13 November 2026, local only): 8 new seed pages (`topics/technology` + 3 articles, series `technology`; `topics/around-the-world` + The Netherlands, Germany, UN Transparency Protocol), 52 content files and 52 manifest pages. The Topics rows are links and the formats-and-protocols and trust-and-interoperability articles gained one "Learn more" link each; on staging these three pages are skipped by the seed when an editor changed them, so add the links by hand (never `LEARN_FORCE`; run `LEARN_DRY_RUN=1` first and report `skipped-edited`/`skipped-unmarked`). Re-check before staging: German launch date (2 January 2027), UNTP version and status (0.8.0, Work in Progress), GBO version 0.9.5, SD-JWT VC draft status (version 26). Sources and results: `learn/technology-around-world-legal-fact-check-2026-11-13.md`; gaps: `learn/technology-editorial-gaps.md`; Dutch: entered locally on 13 November 2026 and handed over through the transfer file, not the seed (proposals: `learn/nl-translation-changes-technology-around-world.md`; final: `learn/nl-translation-changes-technology-around-world-final-2026-11-13.md`). (6c) Around the world, five country pages (13 November 2026, local only): India, Canada, United States, Honduras and Ethiopia are new seed pages (`topics/around-the-world/<slug>`), 57 content files and 57 manifest pages; the overview and "Credential formats and interoperability" changed (skipped by the seed when edited on staging; add by hand, never `LEARN_FORCE`). Re-check before staging: Utah and West Virginia TSA dates, the CBP crude oil test period, BC Wallet status, the DIGER credential list, and the record status of FaydaPass, Neoflow, Swiggy and BIEN. FaydaPass: the record says in production while the programme's authentication page describes the wallet as work in progress (record field, unchanged; the page makes no production claim). Sources and results: `learn/around-world-countries-fact-check-2026-11-13.md`; Dutch: entered locally on 13 November 2026, handed over through the transfer file, not the seed (proposals: `learn/nl-translation-changes-around-world-countries.md`). (7) For the record owner: the VOG use case card says the catalog marks the use case as in production (`productionDeployment: yes`), while the summary describes a successful pilot with sports associations and Justis investigating digital issuance; the record needs clarifying (the pilot did not change it).
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
   **Ecosystem roles and For governments (Dutch, local pilot 12-13 Nov 2026):** 221 rows entered (26 of them written by Cursor, to review), transfer file now 1167 entries (repair round 13 Nov 2026: `learn/nl-translation-changes-repair-round-2026-11-13.md`); details in `staging/UPDATE-PLAN-NL-LEARN.md`.
   **Terminology:** `learn/nl-terminology.md` (repository document; round 2 corrections: `learn/nl-translation-changes-2026-11-12-b.md`) holds the agreed Dutch terms (relying party = vertrouwende partij, and so on). Staging rows that already hold an older term are not changed by `import-apply`; see the list of changed translations in `learn/nl-translation-changes-2026-11-12.md` and `staging/UPDATE-PLAN-NL-LEARN.md`.
   **Updating an existing staging site** with this Dutch Learn route (backup, dry-runs, decision point, apply, verification, rollback): `staging/UPDATE-PLAN-NL-LEARN.md` in the repository (the 27 English strings that were left untranslated at the time are reviewed in `learn/nl-remaining-strings-review.md`; later rounds translated most of them, current known English remains: `learn/nl-known-english-remains.md`).
4. Glossary interface strings (25) are translated in the TranslatePress editor on `/nl/glossary/`; see the pilot README, "Glossary page".

Link paths in Dutch: TranslatePress filters `home_url()` per language (`/design-review/nl`). The config mu-plugin therefore detects the standalone layout from the stored `home` option / `WP_HOME` (never from the filtered `home_url()`), and it ignores a leading language segment when deciding whether a request is a pilot request. Earlier versions detected the layout from `home_url()`, which on `/nl/` pages looked like a subpath site and produced `/design-review/nl/design-review/learn/`. Checks: `tests/run-nl-links-checks.sh` (PHP behaviour for every shell destination in EN and NL, GET check of header/footer/switcher links) and `curl` after an update (section 8, Checks).

Known limits of the Dutch version: the cookie consent banner (Complianz), the Ask FIDES assistant widget and the data of the catalogs stay English; the section name "Learn" stays English on purpose; header and footer texts that are not part of the seeded pages can stay English until translated in the editor; Contact, Privacy, Terms and the other links without a pilot page open the live site (English); catalog data (descriptions, names) is English.

**Technology and Around the world (Dutch, local pilot 13 Nov 2026):** transfer file 1315 entries (148 rows + 2 corrections), see `learn/nl-translation-changes-technology-around-world-final-2026-11-13.md` and the section in `staging/UPDATE-PLAN-NL-LEARN.md`. Staging risks: six seed pages changed after the first seed (skipped when edited on staging, never use `LEARN_FORCE`); "Around the world" and the topics-page row stay "Wereldwijd" on staging until changed by hand ("Internationaal"); re-check the dates and versions listed in the plan before going live; glossary definitions on the new pages are English.

**Around the world, five country pages (Dutch and links, local pilot 13 Nov 2026):** 91 Dutch rows entered locally, transfer file 1430 entries, see `learn/nl-translation-changes-around-world-countries-final-2026-11-13.md` and the section in `staging/UPDATE-PLAN-NL-LEARN.md`. Eleven seed pages changed (five country pages and six articles with one link each); on staging an edited page is `skipped-edited`, so dry run first, never `LEARN_FORCE`. Records were not changed; open questions per owner (National ID Program, Neoflow/Mavennet, TECH5/DIGER, UIDAI, California DMV) are in `learn/around-world-country-record-status.md`.

**Two For you / For businesses articles (Dutch, local pilot 13 Nov 2026):** 24 Dutch rows entered locally, transfer file 1454 entries (`learn/nl-translation-changes-two-articles-2026-11-13.md`). Risk: if staging already holds rows for these sources with another translation, `import-apply` keeps them (`differs`); run `status` first. Known remaining English (glossary definitions, catalogue titles): `learn/nl-known-english-remains.md`.

## Cross links between Explore and Learn (13 November 2026, local only)

**These changes go together. Roll them out as one set, in this order:**

1. `fides-community-tools-tiles` **1.13.52** (commit 2859c80): the `line` variant and the shortcode `[fides_editorial_inline]`. Tiles first, because the catalogs and
   the catalogs use both (the Learn pages only link to the catalogs and use the existing Learn template). A catalog plugin without the new tiles renders nothing for
   the new lines and keeps plain text in the use case intro.
2. The three catalog plugins (any order, after tiles): `fides-credential-catalog` (commit 7f89c44, Learn links in the attestations dialog and the formats section),
   `fides-organization-catalog` (commit efe56868, roles line and QTSP-only line), `fides-use-case-catalog` (readme/plugin change of ff745cc: nested shortcodes in the
   enclosed intro text).
3. The Learn content and the editorial links (`create-learn-pages.sh` / `seed.sh`, dry run first), then the Dutch transfer file (`nl-translations.json`, import in
   `status` first). Pages that use the new sentences: the issuer, the relying party, UN Transparency Protocol, credential formats and interoperability,
   how wallets and services exchange information, The Netherlands, Germany, What is a digital wallet?.

If only some parts arrive: tiles without the catalog changes shows nothing new; the catalog changes without tiles lose the lines and the intro links (no error);
Learn pages without the catalogs link to filters that do not exist yet. So do not ship the catalogs or the Learn pages before tiles 1.13.52.

**Handover checklist (staging, read-only checks before the seed):**

- [ ] Tiles on staging is 1.13.52 or higher; the three catalog plugins contain the commits above.
- [ ] Option `fides_ds_editorial_links`: look at the existing entries. The seed treats the whole option as one unit: if it was edited by hand (or has no seed hash) the
      seed reports `editorial links skipped-edited` / `skipped-unmarked` and does NOT add the new contexts. Hand-edited entries stay as they are; the new
      contexts then have to be added by hand: `wallet-overview:personal`, `credential-explain`, `credential-formats`, `usecase-overview:digital-wallets`,
      `usecase-overview:verifiable-credentials`, `organization-overview:roles`, `organization-overview:qtsp` (source: `learn/editorial-links.json`).
- [ ] Every target page of those entries is published on staging (choosing and managing a wallet, what is a credential, credential formats and interoperability,
      what is a digital wallet, ecosystem roles, trust service providers and trust frameworks). An entry whose target is not published renders nothing.
- [ ] Fallback: the two intro words on Use cases fall back to the old fides.community address when the entry or target is missing; the other lines simply do not render.
- [ ] Run the seed dry run: `LEARN_DRY_RUN=1` (never `LEARN_FORCE`). Read `skipped-edited` and `skipped-unmarked` per page and for `editorial links`; edited pages stay as
      they are and must be updated by hand or by an editor decision.
- [ ] Dutch: `nl-translations-transfer.php status`; `import-apply` only fills empty rows. Three strip strings have no dictionary row yet (see
      `learn/nl-translation-changes-explore-crosslinks-final-2026-11-13.md`); they stay English on `/nl/` until the rows exist.
- [ ] Data: the Reusable KYC and VOG records say `productionDeployment: yes` while their text describes a testnet or a pilot; not changed, see `learn/explore-open-data-checks.md`.

Local dry run (13 November 2026, pilot database, no staging): `LEARN_DRY_RUN=1 bash create-learn-pages.sh` -> `editorial links unchanged (9 entries)`, 58 pages
unchanged, no `skipped-edited`, no `skipped-unmarked`. Tests: `tests/explore-learn-crosslinks-checks.cjs`.

## Recovery round and package of 13 November 2026 (evening, local only)

Nothing in this round was run on staging or production. Tiles is **1.13.53** (1.13.52 plus one CSS change, see below); the catalog plugins are use case 0.21.11,
organization 1.18.6, wallet 2.16.5, credential 1.7.0. Install tiles first.

### What changed since the previous package

- **Language kept in the catalogs** (use-case-catalog `eef93b2`, credential-catalog `1e0b25b`, organization-catalog `1741e9a5`, wallet-catalog `f8e322e`): result cards, script-rendered
  cards after search, filter and paging, and the back link keep `/nl/`, the search and the filters. Test: `tests/catalog-language-links-checks.cjs` (real clicks, EN and NL, 1440 and 390 px,
  use cases, credential types, organizations, personal and business wallets).
- **Tiles 1.13.53** (`assets/learn.css`, plugin header, readme): a Learn list item with the class `fides-learn-rows__item--plain` gets no automatic label; the "In preparation" label of
  `fides-learn-rows--prep` lists reads "In voorbereiding" on `html[lang|=nl]`. Local design pilot only.
- **Learn content (4 pages)**: `topics` (the "Wallets & credentials" row is a plain compact row with its two deepening links, no "Design preview"), `overview` (For you and For governments rows are links),
  `for-businesses` and `the-big-picture` (rows use the `--prep` list class). "Design preview" no longer appears anywhere in Learn: `tests/learn-no-design-preview-checks.cjs`.
- **"Het credential"**: 13 Dutch rows corrected, old to new in `learn/nl-translation-changes-credential-gender-2026-11-13.md`; `tests/nl-terminology-checks.cjs` fails on "de credential".
  "Ontvangende partij" in the Technology articles stays: the English source says "receiving party" in the generic sense, not the role "relying party".

### Numbers (do not mix them up)

| Number | Meaning |
|---|---|
| **57** manifest pages | `learn/manifest.json` pages: 52 Learn (tree `learn`), 3 Services, 2 start. One HTML file each under `learn/content/` (57 files). |
| **58** in the seed summary (`SUMMARY {"unchanged":58}`) | The seed counts **57 pages + 1 editorial-links option** (`fides_ds_editorial_links`, 9 entries). It reports one line per page and one for the option, so 58 is the number of seeded objects, not of pages. |
| **9** editorial link entries | `learn/editorial-links.json`. |
| **1454** transfer entries | `learn/nl-translations.json` after the export of this round (+4 gettext strings). Local `status`: add 0, same 1455 rows, differs 0, pending 0, stale 0, new 0. (the status counts dictionary rows, so it can be one higher than the number of sources when a source has two rows.) |

### Seed and Dutch import on the review site (steps for the installer, in this order)

1. Install tiles 1.13.53, then the four catalog plugins from `plugins/`.
2. **Dry run first**: `LEARN_DRY_RUN=1 bash seed/create-learn-pages.sh` (or the `seed.sh` dry-run option). Never `LEARN_FORCE`. Read every `skipped-edited` and `skipped-unmarked` line and the `editorial links` line.
   Pages that this package changes: `topics`, `topics/for-businesses`, `topics/the-big-picture`, `overview` (this round); earlier rounds: see the lists in `UPDATE-PLAN-NL-LEARN.md`. A page an editor changed on staging is **skipped**
   and keeps its text. Known: the Wallet Readiness Workshop page was edited on staging (expect `skipped-edited` for `sessions/wallet-readiness-workshop`; its new language row is then missing). For every other
   skipped page the plan says what to add by hand (editorial links entries, the "Ecosystem roles" link, the extra Learn more links). If `topics` is skipped, the "Wallets & credentials" row keeps the label
   "Design preview": edit that row by hand (class `fides-learn-rows__item--plain` on the list item, see the seed file `learn/content/topics.html`).
3. Run the seed (without `LEARN_FORCE`), then open the `/nl/` routes once (Learn, Services, start, the four catalog overviews).
4. `wp eval-file seed/learn/nl-translations-transfer.php status` (dry run), read the `differs` list, then `import-apply` twice (the second run must add 0).
5. **Expected `differs` rows** (the staging dictionary already holds other Dutch; the import never overwrites; correct them by hand in the TranslatePress editor from the change lists):
   - **13 rows of "het credential"** (`learn/nl-translation-changes-credential-gender-2026-11-13.md`): if staging holds the old text with "de credential";
   - **"Around the world"**: "Wereldwijd" on staging, "Internationaal" in the file (page title, nav title, breadcrumb, Topics row), and the Topics list row ending in "Wereldwijd" -> "Internationaal"
     (`learn/nl-translation-changes-technology-around-world-final-2026-11-13.md`; further rows with "Wereldwijd" or "Initiatief/Land · Internationaal" sources: same lists);
   - the rows of earlier corrections: up to 11 Tag C rows (`nl-translation-changes-repair-round-2026-11-13.md`), up to 18 (`nl-translation-changes-2026-11-12.md`), up to 39/21 rows from the first and second package
     (`UPDATE-PLAN-NL-LEARN.md`, "Expected differs");
   - gettext: the four allowlisted rows may differ if staging holds other Dutch.
   After the corrections `status` must show differs 0, or only rows the owner deliberately keeps.

### First impression in Dutch: cookie banner

Measured locally (`tests/cookie-banner-first-visit-probe.cjs`, first visit without a consent cookie, Complianz 7.4.6): the banner (`cmplz-cookiebanner`, "Manage Consent", buttons Accept / Deny / Save preferences) is
**English on `/nl/`** and covers **65% of the viewport at 390 x 844 px** (547 px high) and 17% at 1440 x 900 (414 px high). The screenshots are `tests/output/cookie-banner-{EN,NL}-390.png` (not committed).
How the banner can be Dutch on the review site:
- The banner text is server-rendered into the page, so TranslatePress has dictionary rows for it (empty rows exist locally). One row was filled temporarily as a test ("Accept" -> "Accepteren"), the NL page showed it, and the row was emptied again.
  So the rows can be translated in the TranslatePress editor. The strings: Manage Consent, the "To provide the best experiences..." paragraph, Functional, Always active, Preferences, Statistics, Marketing, their four descriptions,
  Manage options, Manage services, Manage {vendor_count} vendors, Read more about these purposes, Accept, Deny, View preferences, Save preferences. They are **not** in `nl-translations-transfer.php` (outside the Learn/Services/start routes) and not in the package.
- Complianz itself only hooks into WPML and Polylang for the banner texts (`cmplz_translate()` in the plugin); there is no TranslatePress hook. The dictionary rows are therefore the route that was verified for this site.
- To reduce the cover on mobile, set the banner layout in the Complianz wizard (banner position and a shorter text or a compact layout); that is a plugin setting of the review site and was **not** changed here (no licence or settings touched).
- Complianz is optional for the review site (it is not in the package). Without it there is no banner and nothing to translate.

### Dutch links and labels between Learn and Explore (checked on `/nl/`)

Dutch: the Learn links of the catalogs (article titles as link labels), the Learn lines of the credential and organization overviews, the Topics rows. **Still English on `/nl/`** (no TranslatePress row exists; the strings sit in `data-learn-title` /
`data-learn-text` attributes that the JavaScript turns into the strip, and TranslatePress neither stores nor translates those; rows cannot be created by the existing transfer tool, and the strings are outside its route scope):
- Personal wallets strip: "Choosing a wallet?" and "Learn what to look for and how to manage it." (Dutch is prepared in `learn/nl-translations.php`: "Een wallet kiezen?", "Lees waar u op let en hoe u een wallet beheert.");
- Business wallets strip: "New to business wallets?", "Understand what they do before comparing solutions.", "Business wallets explained" (proposal: "Nieuw met business wallets?", "Begrijp wat ze doen voordat u oplossingen vergelijkt.", "Business wallets uitgelegd");
- the intro link "Looking for a wallet for your organization? Business wallets" on Personal wallets (proposal: "Zoekt u een wallet voor uw organisatie? Business wallets");
- Updates: "Explore Learn" and the sentence "New to digital wallets? Learn how wallets and credentials connect." (proposal: "Bekijk Learn", "Nieuw met digitale wallets? Lees hoe wallets en credentials samenhangen.");
- Credential types overview: "Credentials & attestations explained", "Explain -> TS11 metadata";
- Use cases intro: the intro sentence is rendered by the script; the only translated piece is the connecting word "and", which shows as "en" inside the English sentence ("digital wallets en verifiable credentials"). That row ("and" -> "en") was entered by an editor and is kept;
- the QTSP line on Organizations (see `nl-translation-changes-explore-crosslinks-final-2026-11-13.md`).
Options to resolve (owner decision): (a) open the page in the TranslatePress editor on the review site so rows are created, then enter the Dutch above; (b) have the tiles code translate these attribute strings with `__()`/gettext (a code change, not done here).
The filter labels ("Filters", "Alle ...") and card labels are Dutch except "Filters 0" (the count button) on Credential types and the wallet overviews, which shows English "Filters".

### Remaining English headings and introductions outside Learn (NL routes, 1440 and 390 px, same result at both)

Measured with `tests/nl-outside-learn-probe.cjs` (report in `tests/output/x-outside-learn.txt`, not committed):

| Route (under `/nl/design-review/` on the review site) | H1 | Introduction |
|---|---|---|
| home | "FIDES design pilot" (pilot title; no intro text) | - |
| `about-fides/` | English: "An independent platform for wallets and verifiable credentials" | English: "We help organizations understand the technology, find suitable solutions, and prepare for implementation." |
| `manifesto/` | English: "The FIDES Manifesto" | English: "Seven principles for a digital world people can trust." |
| `global-digital-trust-awards/` | English title (proper name) | English: "Celebrating practical applications of digital wallets and verifiable credentials from around the world." |
| `fides-community-awards/` | English title (proper name) | English: "The first FIDES Community Awards brought together practical applications of business wallets and verifiable credentials. ..." |
| `updates/` | "Updates" (same word) | English: "Follow developments in digital identity, wallets and trusted data." |
| `overview/` (Use cases) | "Usecases" (Dutch) | English (mixed with "en", see above) |
| `credentials/` | English: "Credential Types" | English: "Find credential types, inspect their attributes and reuse the published schemas." |
| `organizations/` | "Organisaties" | English: "Discover organizations shaping the global ecosystem of digital wallets and verifiable credentials and explore their roles." |
| `personal-wallets/` | "Persoonlijke wallets" | English: "Explore digital wallets for individuals." |
| `business-wallets/` | "Business wallets" (term) | English: "Explore digital wallets and related tooling that allow organizations to receive, store, present, issue or verify verifiable credentials." |
| header "Learn" menu section | "Learn" stays English on purpose | - |
| Ask FIDES assistant intro | English ("Ask me about use cases, ...") | - |
| cookie banner | English (see above) | - |

These are **review decisions**, not defects of the Learn translation: the earlier decision was that Dutch covers Learn, Services, start and the Learn/Explore references. Known and reported separately:
**English glossary definitions** on 4 pages (Credential formats and interoperability: 1; Trust frameworks and registries: 1; The Netherlands: 2; UN Transparency Protocol: 2) and **original catalog titles** (UN Transparency Protocol: "Reeco Textile DPP ..."; United States and the issuer article show "The California mDL ..." and "From Repeated Verification to Reusable Trust ...", listed in `learn/nl-known-english-remains.md`).
The full NL route check ends with 578 ok and 8 failing checks = exactly those 4 pages x 2 widths.

### Open record status questions (no record was changed; nobody has confirmed a different value)

| # | Record (id) | Part | Value in the record | What the source says (13 November 2026) | Who confirms |
|---|---|---|---|---|---|
| 1 | Reusable KYC (`reusable-kyc-on-open-standards-...-JBaAQX`, Solidus Network, WordPress-managed) | use case | `productionDeployment: yes` | its own summary says "runs today on a public testnet... no production deployment"; docs.solidus.network lists a testnet and a beta wallet but also Verify as a live product | Solidus Network (record owner, WordPress update form) |
| 2 | VOG as a verifiable credential (`digital-certificate-of-good-conduct-vog-...-yjw4BC`, Credenco/Justis, WordPress-managed) | use case | `yes` | credenco.com/case/vog: "a controlled pilot in a production environment", evaluated early 2026, large-scale issuance from 2026 onward | Credenco together with Justis; plus a catalog decision on what "in production" means |
| 3 | FaydaPass (`faydapass-rP7gpJ`, National ID Program) | use case | `yes` | id.gov.et/authentication: "working on" the wallet; a FaydaPass app is listed on Google Play | National ID Program |
| 4 | Neoflow (`neoflow-digital-energy-passport-...-RZDhoP`, Mavennet) | use case | `yes` | Federal Register 2026-10979: a one-year CBP test planned from 2 July 2026, using the Neoflow platform; routine operation not shown | Neoflow (Mavennet), CBP for the test |
| 5 | BIEN (`honduras-billetera-electronica-nacional-bien-...-YVNSXc`, submitted by TECH5) | use case, issuer list in the text | `yes` | DIGER: available; four issuers; INM residence card: overview presents it, FAQ says "próximamente" | TECH5 (text), DIGER (INM) |
| 6 | Swiggy and the Aadhaar App (`delivery-agent-and-customer-identity-verification-...-p0mDau`, UIDAI) | use case | `yes` | UIDAI FAQ: Aadhaar App supports consent-based sharing with OVSEs; no source names Swiggy | UIDAI |
| 7 | CA DMV Wallet (`ca-dmv-wallet`, wallet-catalog, GitHub-only) | wallet status | `beta`, description says "mDL pilot" | California DMV: "a free, optional app" available to Californians, uses at 800+ locations; no "beta" or "pilot" | California DMV or the wallet catalog maintainers; proposed `production` |

WordPress-managed records (rows 1, 2, 6 and the others submitted through WordPress) can only be changed by the owner in the update form; a local edit would be overwritten by the next sync.

### Time-sensitive sources (re-read on 13 November 2026, no page text changed)

TSA participating states (Utah 1 January 2027, West Virginia 4 May 2027), California DMV mDL page, Federal Register 2026-10979 (test from 2 July 2026, one year), BC Wallet page (updated 26 October 2026, BC Services Card app, no date),
Canada.ca "Trusted access to digital services" (still plans, "in the coming months"), UIDAI Aadhaar App FAQ (updated 18 September 2026), DIGER BIEN overview and FAQ, id.gov.et authentication (FaydaPass "working on").
Unreachable by curl (read with WebFetch instead): UIDAI FAQ, Canada.ca, DIGER, `www.id.gov.et`. PDFs not readable with the tools: UIDAI handbook and date-of-birth clarification (earlier pass only). Details: `learn/around-world-countries-fact-check-2026-11-13.md`, "Third pass".
Re-check on the day of the installation: CBP test status (any later Federal Register notice), the TSA list, the BC Services Card app, the FaydaPass status.

### Request route

The request route (Services -> enquiry/request form) was checked up to the form, EN and NL, with 0 submissions (`tests/nl-route-checks.cjs`: Dutch form fields shown, no non-GET request). No form was submitted and no mail was sent.

## Learn article template (Paper 24.21 / 24.22, 13 November 2026, local only)

- **Tiles 1.13.55 first** (renderer with the DOM-based Continue learning lift, `learn.css` restyled per Paper 24.25/24.24, `learn.js`); then the seed. A new staging package is needed and was NOT built.
- **Seed:** 34 Learn articles change (Continue learning reduced to 3 + 2, country articles 3 + 3 country filters; `what-is-a-digital-wallet` also gets one Formats paragraph). Local dry run: 34 would-updated, 24 unchanged, 0 skipped. A staging page that was edited by hand reports `skipped-edited` and keeps its own links; the layout still works. Run the seed dry run first; never `LEARN_FORCE`.
- **One new Dutch row:** "For what these formats and protocols do, see" (route `learn/topics/the-big-picture/what-is-a-digital-wallet`), exported to `learn/nl-translations.json` (1450 entries; four stale rows of removed link texts left the file). Open the NL page once on staging, then `import-apply`.
- Editors keep managing the links in the page editor (see `learn/README.md`). Open editorial decisions: `learn/continue-learning-selection.md` and `learn/continue-learning-pending.json`.

## Learn repair round: Continue learning links and filter links (14 November 2026, local only)

- **Seed:** seven Learn pages change (`the-relying-party`, `what-is-a-credential`, `accepting-information-from-a-wallet`, `issuing-credentials-for-wallets`, `trust-and-interoperability`, `how-do-wallets-and-services-exchange-information`, `credential-formats-and-interoperability`). Local dry run: 7 would-updated, 51 unchanged, no `skipped-edited`, no `skipped-unmarked`. On staging, run `LEARN_DRY_RUN=1` first. A page that was edited by hand there is skipped and keeps the old links: add the new links by hand (Formats link on the relying party, what is a credential, accepting and issuing; the TSP link on trust and interoperability; the filter links in the text of the two Technology articles). Never `LEARN_FORCE`. After the seed, check that links keep their bold labels (countries, "SD-JWT VC").
- **Dutch:** six new rows in `learn/nl-translations.json` (1458 entries). Open the two Technology articles once under `/nl/`, run `status` and `import-apply` (fills empty rows only).
- **Links:** `learn/continue-learning-selection.md` has the decisions, the country filter counts and the supported catalog filter parameters. The pending list is empty. An empty filter is never linked; the template does not hide an empty filter, so an editor removes or replaces a link that returns 0 results. The new test `tests/learn-filter-links-checks.cjs` checks every filter link.
- **Before the next staging update (checklist, 14 November 2026):** re-run `tests/learn-filter-links-checks.cjs` on the then-current catalog data. Catalog data can change, so a filter link that returned results on 14 November may return 0 later. Replace or remove such a link in the Learn content (editorial rule; tiles gets no automatic hiding mechanism). Rationale: `learn/continue-learning-selection.md`, "Empty catalog filters".
- **Dutch technical names and known NL remains (14 November 2026):** SD-JWT VC, mdoc and ISO mDoc stay untranslated, the text around them is Dutch (`learn/nl-terminology.md`). The English glossary definitions and catalog titles on the Dutch routes stay for now; the glossary translation round is parked and no catalog records are translated (`learn/nl-known-english-remains.md`). Do not report these as open defects at the next check.
- **No new staging package was built.** Tiles is unchanged (1.13.55).

## Explore by theme and sector (14 November 2026, local only)

The local pages `themes/` and `sectors/` are **not yet in the package** (see `explore/README.md`).

Repair round (14 November 2026, local only): the Explore pages now use the shared catalog row card with image and status badge, one row per organisation/wallet/credential (details lists the examples), "Listing only" for records without a pilot page, and marked English catalog content on `/nl/`. Eight shared Dutch rows were corrected and about 23 added (`learn/nl-translation-changes-themes-sectors-repair-2026-11-14.md`; "Business wallet" and the Learn link rows also appear on Learn pages). Still not in the package; after a new package run `status` and `import-apply`. Tiles is unchanged.
