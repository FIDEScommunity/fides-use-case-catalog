# Update plan: Dutch Learn route and translations on staging

For Codex. Written 12 November 2026. **Nothing in this plan was run on staging by the author**; the package and this plan were
prepared locally. Do not skip the dry-run decision point (step 6). Nothing is forced, nothing is overwritten.

Package: the newest folder under the local `staging-package/` (`latest` points to it; name `<yyyymmdd-hhmmss>-<hash8>`), checked
with `SHA256SUMS` and `verify-package.sh`. Replace `<wp>` with the WordPress path of the standalone staging site and `<pkg>` with the
unpacked package. Real mail and form submissions stay blocked on staging (the config mu-plugin disables external actions); do
not submit the request form, and do not change that block.

## Changes adopted from staging (12 November 2026, afternoon)

Two changes that were already made and checked on the review site are now in the local sources, so the next package carries them:

- **Request form notice removed.** The visitor notice "Local pilot view. Nothing you enter here is sent or stored. No email is sent,
  nothing is booked and nothing is paid. ..." is gone from the Learn request form template (`Fides_DS_Learn::render_request()` in the
  tiles plugin, used by the training and service requests). Form, fields, the `onsubmit` guard and the mail block are unchanged;
  the `<noscript>` line "JavaScript is needed for this preview form." stays. The two Dutch lines for the notice were removed from
  `learn/nl-translations.php` (they were never in the transfer file). Rows already in a staging dictionary are harmless and unused.
- **Wallet Readiness Workshop: language row.** `learn/manifest.json` (page `sessions/wallet-readiness-workshop`, field `details`) has a
  new row `Workshop language | Dutch. English available on request.` between "Format" and "Price" (EN: "Workshop language" /
  "Dutch. English available on request."; NL: "Voertaal" / "Nederlands. Op verzoek ook in het Engels."). Two new transfer entries
  (label and value are two TranslatePress strings), file now 936 entries (153 training). The seed updates the page only while it is
  unchanged; staging pages edited there are `skipped-edited` (the workshop page was adjusted on staging, so expect that line for it and
  no change). On staging `status` reports these two rows as `same` (already translated identically) or `add` if still empty.

## Standalone review site (fix of the transfer tool, 12 November 2026)

The review site is a standalone WordPress installation: `home_url()` ends in `/design-review` and the route roots `learn`, `services`
and `start` are **top-level pages**. The first version of the tool assumed the local layout (one top-level pilot page with these
roots below it) and read the English pages over HTTP; on staging it therefore found 0 rows in scope. Now:

- **Routes** come from the page hierarchy in `wp_posts` (`post_name` / `post_parent` of published pages), for both layouts: roots at the
  top level (standalone, any home sub-path or root) or below one top-level pilot page. A route is the page path below the site root
  (`learn/topics/the-big-picture/what-is-a-credential`), the same string as `routes` in `nl-translations.json`.
- **No HTTP.** `status`, `import` and `import-apply` make no request of any kind (no `wp_remote_get`, no loopback). Scope: the source
  is in the file AND at least one of the routes listed for it exists as a page on this site. Sources whose routes do not exist as pages
  stay untouched. The stale and new signals need rendered pages, so they are skipped on staging; the output says
  `stale/new check skipped: no HTTP`. `stale` and `new` then show 0 and are not meaningful. (Locally an optional extra argument
  `http` brings them back: `status <file> <scratch> http`; never needed for an import.)
- **Unchanged protection:** dry run writes nothing; `import-apply` fills empty rows only, never overwrites (`differs` is listed),
  no overwrite option, second run 0 changes, `A`/`An`/`The` skipped, only `home`/`siteurl` options are read, `correct` stays localhost only.
- **Rows must exist.** TranslatePress creates a dictionary row for a string when the English page is rendered under `/nl/`.
  `pending` in the output = no row yet. The tool does **not** create rows (that would mean writing `trp_original_strings`,
  `trp_dictionary_*` and `trp_original_meta` by hand: TranslatePress-internal ids and meta, not worth the risk). The safe way:
  open each route page once under `/nl/` with a plain GET (a browser, or the loop below), then run `status` again until `pending` is 0.

### Files for a translations-only update

Replace in the unpacked package (the tool and, since the workshop-language row, the Dutch file changed). Nothing is copied into the web root or the plugins:

| File (repository) | In the package | Needed |
|---|---|---|
| `scripts/design-pilot/learn/nl-translations-transfer.php` | `<pkg>/seed/learn/nl-translations-transfer.php` | yes, **replace** (new version) |
| `scripts/design-pilot/learn/nl-translations.json` | `<pkg>/seed/learn/nl-translations.json` | yes, **replace** (936 entries; sha256 `026c802d...6331`; the two workshop-language rows are new) |
| `scripts/design-pilot/learn/nl-translations.php` | `<pkg>/seed/learn/nl-translations.php` | no (local authoring helper, do not run on staging) |

### Steps

```
# 0. backup (as in step 2 of this plan): the TranslatePress tables at least
wp --path=<wp> db export "$B/db-translatepress.sql" --tables="$(wp --path=<wp> db tables 'wp_trp_*' --format=csv)"
# 1. make the Dutch rows exist: GET every route once under /nl/ (no login, GET only)
cd <pkg>/seed/learn
php -r '$d=json_decode(file_get_contents("nl-translations.json"),true);$r=[];foreach($d["entries"] as $e)foreach($e["routes"] as $x)$r[$x]=1;ksort($r);echo implode("\n",array_keys($r)),"\n";' \
  | while read -r r; do curl -s -o /dev/null -w "%{http_code} $r\n" "https://staging.fides.community/design-review/nl/$r/"; done
# 2. dry run (writes nothing, no HTTP)
wp --path=<wp> eval-file <pkg>/seed/learn/nl-translations-transfer.php status
# 3. apply (empty rows in scope only), twice
wp --path=<wp> eval-file <pkg>/seed/learn/nl-translations-transfer.php import-apply
wp --path=<wp> eval-file <pkg>/seed/learn/nl-translations-transfer.php import-apply     # must report: add 0
# 4. cache
wp --path=<wp> cache flush ; purge page cache/CDN ; then the GET checks of section 8
```

The 27 routes of the file include `learn/sessions/request-wpforms` and the other form pages; the GET only renders them. If a route
answers 404 the page does not exist on staging; its sources then stay untouched. If the `/nl/` URL form differs, take it from the
language switcher link of the site. If step 1 cannot be run from the server (blocked loopback), open the 27 URLs in a browser.
Expected `status` after step 1: `scope: 936 sources ...`, rows in scope about 937, `pending` 0, `add` = all rows without a translation,
`differs` = rows that hold other Dutch (see the lists in the sections above), `stale/new check skipped`, gettext `add`/`same`/`differs`.

Example of the `differs` output (the existing translation is kept):

```
  differs (existing translation kept, only reported): 2
    differs: Overview
    differs: What do recipients and relying parties need to know?
  gettext (allowlist of 4): add 1, same 2, differs 1 (kept), no row yet 0, not allowlisted (ignored) 0
```

**Gettext** (4 strings: Blocksy "Skip to content", three WPForms Lite strings): they are in the file; `trp_gettext_nl_nl` rows are read by
domain + exact original only. An empty or missing-translation row is filled with status 2; a row with another translation stays
(`differs ... (kept)`); "no row yet" means TranslatePress has not seen the string (open a page that shows it). Verify with
`wp --path=<wp> db query "SELECT original, translated, status FROM wp_trp_gettext_nl_nl WHERE original IN ('Skip to content','This field is required.')"`.

## Ecosystem roles overview (12 November 2026, local only)

- **Seed:** one new Learn page, `topics/ecosystem-roles` (kind `section`, Learn template, content `learn/content/ecosystem-roles.html`), and
  six existing seed pages with a small content change: `topics` (the Ecosystem roles row title is now a link) and a "Ecosystem roles" item in the
  "Learn more" list of `how-credentials-connect`, `trust-and-interoperability`, `what-is-a-digital-wallet`, `issuing-credentials-for-wallets`
  and `accepting-information-from-a-wallet`. `learn/manifest.json` and `learn/content/` now hold 27 pages and 27 files (read the number from
  the manifest and `ls learn/content` when the package is built). Tiles are unchanged (1.13.51 stays); no CSS, no glossary change.
- **Protection:** a dry-run (`LEARN_DRY_RUN=1`) lists the page as `would-created` and the six changes as `would-updated` on a site where nobody edited them.
  A page edited on staging is reported `skipped-edited` and keeps its text; then add the "Ecosystem roles" link by hand in the editor. Never use
  `LEARN_FORCE`. Behaviour test: `tests/ecosystem-roles-seed.sh` (throwaway tree; created, unchanged, skipped-edited, skipped-unmarked).
- **Role articles (12 November 2026, later round):** five new article pages below `topics/ecosystem-roles/`: `the-holder`, `the-issuer`,
  `the-relying-party`, `wallet-providers-and-other-service-providers`, `trust-service-providers-and-trust-frameworks` (kind `article`, eyebrow
  "Explainer · Ecosystem roles", content files of the same name, sources from the manifest). The overview rows are now links (the "Read ... for now"
  pointers and the "not available yet" paragraph are gone) and four existing articles got one extra "Learn more" item pointing to their role article
  (`what-is-a-digital-wallet` -> the holder, `issuing-credentials-for-wallets` -> the issuer, `accepting-information-from-a-wallet` -> the relying party,
  `trust-and-interoperability` -> trust service providers and trust frameworks). `learn/manifest.json` and `learn/content/` now hold 32 pages and 32 files.
  On a site where nobody edited them, a dry-run shows 5 `would-created` and 5 `would-updated` (the overview and the four articles). A page edited on
  staging is `skipped-edited`: add the extra "Learn more" link by hand (the five new pages are created either way). Tests: `tests/ecosystem-roles-articles-checks.cjs`,
  `tests/ecosystem-roles-articles-seed.sh` (both run from `tests/run-ecosystem-roles-checks.sh`).
  The trust page links to the organisation catalog with `?role=eidas_trust_service_provider` and `?cert=qtsp` (separate links; both work together as well).
  On staging, check that the organisation data there contains organisations with that role and with QTSP certification, and that the chips show.
  Dutch proposals for the articles: `learn/nl-translation-changes-ecosystem-roles-articles.md` (not seeded).
- **Dutch (entered 12-13 Nov 2026, local pilot):** see the section "Dutch for Ecosystem roles and For governments" below. (Earlier status: proposals only.)
- Links: the overview links only to destinations that exist in the pilot (use cases, credential types, personal and business wallets,
  organisations, existing Learn articles). `/issuer-catalog/` and `/relying-party-websites/` are not linked.

## For governments (12 November 2026, local only)

- **Seed:** five new Learn pages: `topics/for-governments` (kind `section`, content `for-governments.html`, menu order 3) and four articles below it
  (kind `article`, eyebrow "Explainer · For governments", series `for-governments` so Previous/Next appears): `digital-wallets-and-public-services`,
  `issuing-public-information-to-wallets`, `accepting-information-from-wallets-in-public-services`, `the-eudi-wallet-and-national-implementation`.
  Four existing seed pages changed slightly: `topics` (the For governments row is now a link), `european-digital-identity-wallet`,
  `issuing-credentials-for-wallets` and `accepting-information-from-a-wallet` (one extra "Learn more" item each). `learn/manifest.json` and
  `learn/content/` now hold 37 pages and 37 files (read the number from the manifest and `ls learn/content` when the package is built).
  Tiles are unchanged (1.13.51 stays); no CSS, no glossary change.
- **Protection:** on a site where nobody edited them, a dry-run shows 5 `would-created` and 4 `would-updated`. A page edited on staging is `skipped-edited`
  and keeps its text: **the editor must then add the link by hand** (the Topics row "For governments" links to `/learn/topics/for-governments/`; the
  three articles get a "Learn more" item). Never use `LEARN_FORCE`. Local result on 12 November 2026: created 5, updated 4, nothing skipped. Second pass (same day): updated 5 (the overview and the four articles), 33 unchanged, nothing skipped; on staging an edited For governments page is skipped and needs the new text by hand.
  Behaviour test: `tests/for-governments-seed.sh` (throwaway tree).
- **Article 5f and QTSP route:** article 3 explains Article 5f of Regulation (EU) 2024/1183 with an EUR-Lex link; article 2 separates the verify and retrieve services; version and status of the GBO draft now sit on article 4 only. See `learn/for-governments-editorial-gaps.md`.
- **GBO example:** based on the Globaal Ontwerp, version 0.9.5 (September 2026), "a draft design submitted for adoption". Public status check on
  12 November 2026 and sources: `learn/for-governments-editorial-gaps.md`. Recheck before staging.
- **Dutch (entered 12-13 Nov 2026, local pilot):** see the next section. (Earlier status: proposals only.)

## Dutch for Ecosystem roles and For governments (12-13 November 2026, local only)

- **What is entered:** 195 new dictionary rows (100 from the edited document, 81 exact matches from the proposal files, 7 agent completions and 7 interface labels; list with tags: `learn/nl-translation-changes-roles-governments-2026-11-12.md`) for the 11 pages `topics/ecosystem-roles` (+5 articles) and `topics/for-governments` (+4 articles). No existing translation was changed.
- **What is not entered:** about 24 English strings that the document does not cover or whose English changed (Dutch example texts, the Article 5f questions, catalog card lines, the For governments overview intro). Proposals: `learn/nl-translation-open-for-governments-roles.md`. These pages therefore still show those English sentences on staging after import.
- **Transfer file:** `learn/nl-translations.json` now has 1119 entries (761 learn, 61 services, 109 shared, 35 start-receive, 153 training) + 4 gettext (was 936). `status` locally: add 0, same 1120, differs 0, new 0, stale 0. 12 old source-line rows ("Organisation · Title", no longer rendered as one string) dropped out of the export: they were stale already before this change. sha256 of the file: `69de9442...b354b26`. Replace the file in the package at step "Files for a translations-only update".
- **Seed change:** `learn/content/the-relying-party.html` (one sentence: the article "A" is now part of the verifier term, so it is no longer a lone fragment). On a site where nobody edited the page: one `would-updated`; an edited page is `skipped-edited` and keeps its text, and then the lone English fragment "A" before the term stays untranslated (harmless, the row "A verifier" simply does not match).
- **Import on staging:** as in the steps above (GET each route once under /nl/, dry run, apply twice). The 11 new routes are in the file, so `scope` grows to 1119 sources; `add` should equal the rows that exist on staging and are still empty; a row already translated differently on staging is kept and reported as `differs`. Nothing was run on staging.
- Links go only to destinations that exist in the pilot (use cases, credential types, wallets, organisations, existing Learn articles).

## Changes since package `20261112-083503-34b753ab` (third package, same day)

- **Terminology round 2:** 21 existing Dutch rows were corrected locally (no rows added or removed; export still 934 entries, 4 gettext):
  the heading with "vertrouwende partijen", "uitgever (issuer)" at the first mention per page and "uitgever(s)" instead of "issuer(s)",
  "wallethouder", "mandaten", "selectief gegevens delen", and "de workshop" for one repeated offering name. Full list (source, old,
  new, routes, reason): `learn/nl-translation-changes-2026-11-12-b.md`. Rules: `learn/nl-terminology.md`.
- The package folder name is timestamp based (newest under `staging-package/`, `latest`). The Dutch file is identified by its sha256:
  `seed/learn/nl-translations.json` = `026c802ddf970b17b3ec94b9c21ac548458c8d0cebc93e79e003cf26b0e06331`.
- The local-only correction mode (`nl-translations.php correct`) is in the package for traceability. **Do not run it on staging**: it
  refuses to write unless the site host is localhost, and staging corrections follow the procedure below.
- No content, plugin or seed change; the package differs from the previous one in `nl-translations.json`, `nl-translations.php`,
  the tests and the documents.

### Staging rows that may still hold the old value (not overwritten)

`import-apply` never overwrites. If staging holds the Dutch of an earlier package, these rows show up as `differs` in `status`:

- **This round: up to 21 rows**, all listed with old and new Dutch in `learn/nl-translation-changes-2026-11-12-b.md`
  (heading; "De issuer"/"Een issuer" openers; the 11 "(issuer)" first mentions; "issuers" rows; "(issuer-rol)"; "De walletgebruiker moet
  begrijpen ..."; "Organisatiegegevens, bevoegdheden ..."; the mDoc description; "Selectieve verstrekking ..."; "In de Wallet Readiness
  Workshop werkt ..."). Staging holding the package-2 Dutch has all 21 as `differs`; staging holding the package-1 Dutch also has
  the 18 rows below.
- **Previous round: up to 18 rows** "ontvangende partij" -> "vertrouwende partij" plus 2 added rows ("Houder + wallet", "Vertrouwende
  partij"; these come in as `add` if the rows are empty): `learn/nl-translation-changes-2026-11-12.md`.
- A row can appear in both lists (its value changed twice); apply the newest value of the b list.
- Expected `differs` for a staging site that holds the Dutch of the first package: up to 39 rows; of the second package: up to 21.
  Report the list to the owner; corrections are entered by the owner in the TranslatePress editor, or by a script only from a
  correction list the owner approved (take source and new Dutch from the changes files). Never add an overwrite option.

## Changes since package `20261112-071445-34b753ab` (second package, same day)

- **Terminology:** relying party is now "vertrouwende partij" (with "(relying party)" at the first explanation); 18 existing
  Dutch rows were corrected locally (old "ontvangende partij") and 2 rows were added ("Holder + wallet" -> "Houder + wallet",
  "Relying party" -> "Vertrouwende partij"). Export: 934 entries (was 932), 4 gettext. Full list (source, old, new):
  `learn/nl-translation-changes-2026-11-12.md`. Terminology agreements: `learn/nl-terminology.md`.
- No content, plugin or seed change. The package differs from the previous one in `nl-translations.json` and the documents.

### Deliberate behaviour: staging rows with the old term are NOT corrected

`import-apply` fills **empty** rows only. A staging row that already holds a translation (for example "Wat doet een ontvangende
partij?") is kept and shown as `differs` in `status`; the new Dutch from the file is never written over it. Consequences and steps:

1. `status` lists each such row under `differs`. Compare the list with the `changed` rows of
   `learn/nl-translation-changes-2026-11-12.md` (rows with an old value). Expected: up to 18 `differs` if staging holds the
   previous package's Dutch (the 2 added rows come in as `add` if the rows are empty).
2. Report the `differs` list to the owner. Do not overwrite on your own and do not add an overwrite option.
3. Corrections on staging are made by the owner, either in the TranslatePress editor, or from a **correction list that the owner
   approves**: take the `changed` rows of the changes file (source, new Dutch) and enter them in the editor one by one. Writing
   them with a script is only allowed on explicit approval of that list.
4. After the corrections run `status` again: `differs` must be 0 (or contain only rows the owner deliberately keeps).

## What changes compared with the previous staging state

- `plugins/fides-community-tools-tiles` 1.13.51 (zip) and the other catalog plugin zips, only if their version differs from
  what runs on staging (compare in step 3).
- `seed/learn/content/*.html` (26 files), `seed/learn/manifest.json`: eight Learn articles got the article inside the term, link
  or bold text (17 sentence openers; wording unchanged).
- `seed/learn/nl-translations.json` (936 entries + 4 gettext), `seed/learn/nl-translations-transfer.php`,
  `seed/learn/nl-translations.php`, `seed/create-learn-pages.php`.
- The glossary plugin and its bundled data stay as pinned (`glossary 1.12.2`, `a52a684`, plugin 1.1.16). No change.

## 1. Preconditions (read only)

1. `cd <pkg> && shasum -a 256 -c SHA256SUMS` (all OK) and compare the package sha256 with the one reported by the author.
2. `wp --path=<wp> core is-installed`, `wp --path=<wp> option get home` (must be `https://staging.fides.community/design-review`),
   `wp --path=<wp> plugin list --fields=name,status,version` (note the versions; TranslatePress must be active with `nl_NL`).
3. `WP="wp --path=<wp>" <pkg>/seed/seed.sh preflight` (read only; stops on FAIL).
4. Note which Learn pages were edited on staging since the last seed (these will be skipped, see "Limits"):
   `wp --path=<wp> post list --post_type=page --meta_key=_fides_learn_seed --fields=ID,post_name,post_modified`.

## 2. Backup (before anything is written)

Folder outside the web root, not in the repo, for example `/var/backups/fides-design-review/<yyyymmdd-hhmm>-nl-learn/`
(mode 700).

```
B=/var/backups/fides-design-review/$(date +%Y%m%d-%H%M)-nl-learn; mkdir -p "$B"; chmod 700 "$B"
wp --path=<wp> db export "$B/db-full.sql"                     # full dump (primary rollback source)
P=$(wp --path=<wp> db prefix)
wp --path=<wp> db export "$B/db-translatepress.sql" --tables="${P}trp_dictionary_en_us_nl_nl,${P}trp_gettext_nl_nl,${P}trp_original_strings,${P}trp_original_meta,${P}trp_gettext_original_strings,${P}trp_gettext_original_meta"   # skip tables that do not exist
wp --path=<wp> db export "$B/db-pages.sql" --tables="${P}posts,${P}postmeta"
wp --path=<wp> plugin list --format=json > "$B/plugins-before.json"
tar -czf "$B/files-before.tgz" -C <wp>/wp-content plugins/fides-community-tools-tiles plugins/fides-use-case-catalog plugins/fides-organization-catalog plugins/fides-wallet-catalog plugins/fides-credential-catalog plugins/fides-vocabulary-glossary mu-plugins/fides-design-review-config.php
( cd "$B" && shasum -a 256 * > SHA256SUMS )
```

Check that the dump files are non-empty (`ls -l "$B"`). Keep the folder until the update is accepted.

## 3. Install the package files (no database writes yet)

1. Unpack the package next to the site (not into the web root), e.g. `<pkg>`.
2. Compare versions: `unzip -p <pkg>/plugins/fides-community-tools-tiles-*.zip fides-community-tools-tiles/fides-community-tools-tiles.php | rg "Version:"`
   must say 1.13.51; do the same for the other zips and the glossary zip (`1.1.16`). Install a zip only where the staging version
   differs (`wp plugin install <zip> --force --activate`, tiles first). Copy `<pkg>/mu-plugins/fides-design-review-config.php` to
   `wp-content/mu-plugins/` only if its sha256 differs.
3. `wp --path=<wp> cache flush` (object cache); purge the page cache or CDN for `/design-review/` if one exists.

## 4. Open the Dutch pages first (creates TranslatePress rows)

TranslatePress only creates dictionary rows after the first visit of a page under `/nl/`. GET only, no cookies, no forms:

```
python3 -c "import json;print('\n'.join(sorted({r for e in json.load(open('<pkg>/seed/learn/nl-translations.json'))['entries'] for r in e['routes']})))" > /tmp/nl-routes.txt
while read r; do curl -s -o /dev/null -w "%{http_code} $r\n" "https://staging.fides.community/design-review/nl/$r/"; done < /tmp/nl-routes.txt
```

Do this **after** the real seed (step 8) as well: the eight changed articles produce new strings (the openers) only after the new
content is live. In step 5 and 6 (dry-run) some of those strings are reported as `pending`, that is expected.
Also open `/nl/`, `/nl/learn/`, `/nl/learn/sessions/`, `/nl/learn/sessions/request/` (shown, not submitted), `/nl/services/`, `/nl/start/`, `/nl/start/receive/`.

## 5. Dry-run of the seed

```
WP="wp --path=<wp>" <pkg>/seed/seed.sh dry-run            # PILOT_DRY_RUN=1 LEARN_DRY_RUN=1, writes nothing
```

Read the Learn lines of the output:

- `unchanged`: nothing to do.
- `would-updated`: the page is still identical to its last seed and will be updated. Expected: the eight articles
  (`what-is-a-digital-wallet`, `what-is-a-credential`, `how-credentials-connect`, `european-digital-identity-wallet`,
  `eudi-wallet-and-european-business-wallet`, `formats-and-protocols`, `trust-and-interoperability`,
  `issuing-credentials-for-wallets`), plus whatever else differs from the previous package.
- `skipped-edited` / `skipped-unmarked`: an editor changed the page (or it is not a seeded page). It is **not** touched. Write
  these down for the report (page, route).
- Any ERROR/FAIL line: stop.

## 6. Dry-run of the translation import, then the decision

```
wp --path=<wp> eval-file <pkg>/seed/learn/nl-translations-transfer.php status
wp --path=<wp> eval-file <pkg>/seed/learn/nl-translations-transfer.php import      # dry run as well, same output
```

(The tool makes no HTTP request; it reads the page hierarchy, the dictionary rows of the exported strings and four allowlisted gettext
strings, and writes nothing in these modes. See "Standalone review site" above for the stale/new lines.) Report these lines:

| Line | Meaning | Acceptable |
|---|---|---|
| `scope: 936 sources ...` | sources in the file, rows in scope | 936 sources |
| `add` | empty rows in scope that would be filled | any number |
| `same` | already identical | any number |
| `differs` | existing other translation, **kept** | list them in the report; no action needed |
| `pending` | no dictionary row yet | explained by the eight new openers before the seed; otherwise open that page under `/nl/` and repeat |
| `stale` | English source on staging differs from the file | skipped without HTTP (shows 0, not meaningful on staging) |
| `new` | English strings without a translation, not in the file | skipped without HTTP (shows 0); the 25 reviewed strings are in `learn/nl-remaining-strings-review.md` |
| `outside scope` | rows never read or touched | informational |
| `gettext (allowlist of 4)` | add / same / differs / no row | `differs` is kept; see the status-4 note below |

**Decision point.** Continue only if: preflight and dry-run have no FAIL/ERROR; the skipped pages are acceptable or will be
handled by the owner; the `differs` list contains nothing that must be replaced (it cannot be, the import never overwrites).
Otherwise stop and report; nothing has been written to the database yet.

## 7. Apply

1. Seed: `WP="wp --path=<wp>" <pkg>/seed/seed.sh apply`. **No `LEARN_FORCE`, no `PILOT_FORCE`.** Run `apply` a second time:
   every page must be `unchanged`.
2. `wp --path=<wp> rewrite flush`, then open the Dutch pages again (step 4) so the new opener strings get rows.
3. `wp --path=<wp> eval-file <pkg>/seed/learn/nl-translations-transfer.php status` again: `pending` must be 0 (`stale` is not checked without HTTP).
4. `wp --path=<wp> eval-file <pkg>/seed/learn/nl-translations-transfer.php import-apply` (fills empty rows in scope only; never
   overwrites; the second run reports `add 0`). Run it a second time and keep that output.
5. Do **not** run `nl-translations.php apply` on staging (it is the local authoring helper; it only touches the lone `A`/`An`/`The`
   rows on localhost, and everything else it holds is already in the transfer file).
6. `wp --path=<wp> cache flush`; purge page cache/CDN.

## 8. Verification

GET only:

- `/design-review/nl/learn/`, `/nl/learn/topics/`, `/nl/learn/topics/the-big-picture/what-is-a-digital-wallet/`,
  `/nl/learn/topics/the-big-picture/european-digital-identity-wallet/`, `/nl/learn/sessions/`, `/nl/learn/sessions/request/` (form
  visible, not submitted), `/nl/start/receive/`: 200, `<html lang="nl-NL">`, Dutch text.
- Openers (view the Dutch page): "Een wallet kan …", "De houder ontvangt …", "Een protocol beschrijft …" (no lone English
  "A"/"The" in front of the term).
- `/design-review/wp-sitemap.xml` valid XML; `/design-review/wp-admin/` without `_load_textdomain_just_in_time` notices.
- English route unchanged: `/design-review/learn/`, `/design-review/overview/` 200, English text, `noindex` header.
- Browser checks (optional, read only): `PILOT_URL=https://staging.fides.community PILOT_LAYOUT=standalone PILOT_BASE=design-review
  PLAYWRIGHT_MODULE=<path> node <pkg>/checks/rehearsal-checks.cjs`.

**Success** = steps 1 to 8 finished; second seed all `unchanged`; second `import-apply` reports `add 0`; the verification list is
green; the report names the skipped pages, the `differs` list, the gettext result and the 25 `new` strings.

## 9. Rollback

Use the backup folder `$B` from step 2. Decide by what went wrong:

1. **Pages or content wrong (seed):** restore the pages: `wp --path=<wp> db import "$B/db-pages.sql"` (this also reverts
   post meta). Or, for single pages, `wp post update <id> --post_content="$(...)"` from the dump; the full dump is the safe path.
2. **Translations wrong (import):** `wp --path=<wp> db import "$B/db-translatepress.sql"` (restores the dictionary and gettext
   tables to the state before the update; rows created by later page visits disappear and are recreated on the next visit).
3. **Everything:** `wp --path=<wp> db import "$B/db-full.sql"`.
4. **Plugin and mu-plugin files:** `tar -xzf "$B/files-before.tgz" -C <wp>/wp-content` (overwrites the folders listed), then
   `wp --path=<wp> plugin list` against `plugins-before.json`.
5. After any restore: `wp --path=<wp> cache flush`, `wp --path=<wp> rewrite flush`, purge page cache/CDN, repeat the GET checks.
6. A rollback never needs `LEARN_FORCE`; do not use it.

## Limits to keep in mind

- **Edited staging pages are skipped.** A Learn page that was edited on staging keeps its old content, including the old lone
  `A`/`The` before a term; the Dutch view then shows an English article fragment there. The seed reports it as `skipped-edited`.
  Re-seeding such a page on purpose (`LEARN_FORCE`) is **not part of this plan**; the owner decides separately.
- **Lone fragments are not transferred.** `A`, `An`, `The` are not in the file and are never cleared on staging; on staging they
  simply stay empty or absent.
- **Existing translations are never overwritten.** A different Dutch text on staging stays and is reported (`differs`).
- **Gettext:** the file carries four strings (Blocksy "Skip to content"; WPForms Lite JavaScript notice, "Form has not been
  submitted…", "This field is required."). The last two have status 4 locally; an empty row on staging gets the text with status 2
  (an editor-approved text); existing translations stay.
- **25 English strings** stay English on purpose or until the owner decides (`learn/nl-remaining-strings-review.md`; open: "readiness workshop", "Mandate").
- Staging keeps its write/mail block; no real mail is sent and the request form is only looked at.

## For you (12 November 2026, local only)

- **Seed:** four new Learn pages: `topics/for-you` (kind `section`, content `for-you.html`, menu order 1) and three articles below it (kind `article`, eyebrow
  "Explainer · For you", series `for-you` so Previous/Next appears): `receiving-information-in-a-wallet`, `sharing-information-from-a-wallet`,
  `choosing-and-managing-a-wallet`. Sources use the existing `Label | URL` field ("Organisation · Title").
- **Existing pages that changed (the seed skips them on staging when an editor changed them; then add by hand):**
  `topics` (the "For you" row is now a link to `/learn/topics/for-you/`), `what-is-a-digital-wallet` (Learn more: "Choosing and managing a wallet"),
  `what-is-a-credential` (Learn more: "Receiving information in a wallet") and `the-holder` (Learn more: "Sharing information from a wallet").
  Never use `LEARN_FORCE`. Local result on 12 November 2026: created 4, updated 4, nothing skipped.
- **Behaviour test:** `tests/for-you-seed.sh` (throwaway tree). Deviations and gaps: `learn/for-you-editorial-gaps.md`.
- **Dutch:** proposals only, in `learn/nl-translation-changes-for-you.md`; nothing is in `nl-translations.json`.

## Practice questions for organisations (12 November 2026, local only)

- **Seed:** three new Learn pages below `topics/for-businesses` (kind `article`, eyebrow "Explainer · For businesses", no series):
  `how-can-someone-act-for-an-organisation`, `how-can-an-organisation-prepare-a-wallet-use-case`,
  `what-should-a-service-check-when-receiving-a-credential`. Sources use the existing `Label | URL` field. The manifest has 44 pages and 44 content files.
- **Existing pages that changed (the seed skips them on staging when an editor changed them; then add by hand):**
  `topics/for-businesses` (three new rows; the unlinked row "Company identity and representation" is now the linked row "How can someone act for an organisation?"),
  `business-wallets-where-to-start` (Learn more: "How can someone act for an organisation?"),
  `accepting-information-from-a-wallet` (Learn more: "What should a service check when receiving a credential?") and
  `issuing-credentials-for-wallets` (Learn more: "How can an organisation prepare a wallet use case?").
  Never use `LEARN_FORCE`. Local result on 12 November 2026: created 3, updated 4, nothing skipped.
- **Behaviour test:** `tests/practice-questions-seed.sh` (throwaway tree). Sources, deviations, overlap and gaps: `learn/practice-questions-editorial-gaps.md`.
- **Dutch:** proposals only, in `learn/nl-translation-changes-practice-questions.md`; nothing is in `nl-translations.json`. The English row title "Company identity and representation" is gone (its Dutch row is unused; the description row stays valid).
- **Second pass (12 November 2026):** the practice article on preparing a wallet use case now describes one concrete exchange, "Business wallets: where to start" is sharpened on role and choice (heading "Check the whole interaction" is now "Compare wallets and providers"), the checking article is shorter, and the legal passages were checked (`learn/practice-questions-legal-check-2026-11-12.md`). Pages that changed and are skipped by the seed when edited on staging: the three practice articles, `business-wallets-where-to-start` and `european-business-wallet` (one Parliament sentence). Dutch proposals for the changed sentences: `learn/nl-translation-changes-practice-questions.md`, section "Second pass".
