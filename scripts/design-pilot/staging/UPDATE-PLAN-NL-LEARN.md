# Update plan: Dutch Learn route and translations on staging

For Codex. Written 12 November 2026. **Nothing in this plan was run on staging by the author**; the package and this plan were
prepared locally. Do not skip the dry-run decision point (step 6). Nothing is forced, nothing is overwritten.

Package: the newest folder under the local `staging-package/` (`latest` points to it; name `<yyyymmdd-hhmmss>-<hash8>`), checked
with `SHA256SUMS` and `verify-package.sh`. Replace `<wp>` with the WordPress path of the standalone staging site and `<pkg>` with the
unpacked package. Real mail and form submissions stay blocked on staging (the config mu-plugin disables external actions); do
not submit the request form, and do not change that block.

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

- `plugins/fides-community-tools-tiles` 1.13.46 (zip) and the other catalog plugin zips, only if their version differs from
  what runs on staging (compare in step 3).
- `seed/learn/content/*.html` (26 files), `seed/learn/manifest.json`: eight Learn articles got the article inside the term, link
  or bold text (17 sentence openers; wording unchanged).
- `seed/learn/nl-translations.json` (934 entries + 4 gettext), `seed/learn/nl-translations-transfer.php`,
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
   must say 1.13.46; do the same for the other zips and the glossary zip (`1.1.16`). Install a zip only where the staging version
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

(The tool reads only the route pages' public HTML, the dictionary rows of the exported strings and four allowlisted gettext
strings; it writes nothing in these modes.) Report these lines:

| Line | Meaning | Acceptable |
|---|---|---|
| `scope: 934 sources ...` | sources in the file, rows in scope | 934 sources |
| `add` | empty rows in scope that would be filled | any number |
| `same` | already identical | any number |
| `differs` | existing other translation, **kept** | list them in the report; no action needed |
| `pending` | no dictionary row yet | explained by the eight new openers before the seed; otherwise open that page under `/nl/` and repeat |
| `stale` | English source on staging differs from the file | 0 expected after the seed; before it, the old openers of the eight articles |
| `new` | English strings without a translation, not in the file | 25 (the reviewed list in `learn/nl-remaining-strings-review.md`) |
| `outside scope` | rows never read or touched | informational |
| `gettext (allowlist of 4)` | add / same / differs / no row | `differs` is kept; see the status-4 note below |

**Decision point.** Continue only if: preflight and dry-run have no FAIL/ERROR; the skipped pages are acceptable or will be
handled by the owner; the `differs` list contains nothing that must be replaced (it cannot be, the import never overwrites).
Otherwise stop and report; nothing has been written to the database yet.

## 7. Apply

1. Seed: `WP="wp --path=<wp>" <pkg>/seed/seed.sh apply`. **No `LEARN_FORCE`, no `PILOT_FORCE`.** Run `apply` a second time:
   every page must be `unchanged`.
2. `wp --path=<wp> rewrite flush`, then open the Dutch pages again (step 4) so the new opener strings get rows.
3. `wp --path=<wp> eval-file <pkg>/seed/learn/nl-translations-transfer.php status` again: `pending` and `stale` must be 0.
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
