# Learn content update

Use this when a later round should ship a checked set of Learn routes from recorded commits. The package directory is built outside git. The concrete install commands and the expected dry-run and apply lines belong in that package's `UPDATING.md`, not here.

## Inputs

- Installed Learn files. Record the plugin version and the SHA256 of `assets/learn.js` and `includes/class-fides-ds-learn.php` as they are installed. The next package is aligned to those hashes, not to the version number. Do not open an SSH session. If the hashes were not read, set `LEARN_PACKAGE_LABEL=-concept` and say so in `UPDATING.md` and `SOURCE.txt`. If the page bodies were not compared on the live site, mark `COMPARE.txt` as `source-baseline-not-live-staging`. That mark does not replace the hash gate.
- Source commits. One content commit for the HTML, manifest, Dutch transfer file, media and route list. One Tiles commit when the pages need a Learn renderer or `learn.js` change. One commit for this procedure and the route check when those scripts change. `SOURCE.txt` names the full hashes.
- Route list. One path per line in `routes-update.txt`, taken from the content diff for that round. The wrapper checks the list against the manifest.
- Translations. The Dutch transfer file from the content commit. An ordinary import fills empty TranslatePress rows for those routes. A filled row that must change is written out with the old original, the old translation, the new original and the new translation, so the installer can see the conflict. Filled rows are not overwritten.
- Media. Images the changed pages reference, copied with the seeder. A dry-run does not create the upload directory.
- Tiles dependency. Include `includes/class-fides-ds-learn.php` and the `learn.js` the design pilot loads only when the content needs that renderer. Leave every other Tiles file out. Say in `UPDATING.md` whether Tiles is installed before the content.
- Checks. `git diff --check` in each repo that is committed. The Learn visitor suite, the Learn article suite, and the government suites when those pages are in the route list. A browser pass on the changed routes in English and Dutch, including keyboard behaviour when a control changed. The package dry-run on a local copy, confirmed to write no pages, uploads or settings.

## What the wrapper refuses

`validate-routes-update.py` stops on an empty list, a repeated route, a route that is not in the manifest, or the enquiry form. `seed-routes-update.sh` stops when `LEARN_IDS` is set to a different selection, and when `LEARN_FORCE` is set. In a built package, `seed-trial.sh` stops unless `LEARN_IDS` is exactly `routes-update.txt`. It also stops on production. Menus and the training form are not part of the seed.

## Alignment to the installed files

The concrete commands and the expected dry-run and apply lines stay in that package's `UPDATING.md`.

- `installed-hashes.txt` holds the SHA256 of the two Learn files currently installed. `package-file-hashes.txt` holds the SHA256 of the two files the package would install. They are recorded separately when they differ.
- `preflight-installed-files.sh` runs before any copy or seed. It refuses when either installed file does not match `installed-hashes.txt`. It also refuses when the packaged files do not match `package-file-hashes.txt`, or when those packaged files no longer contain Show answer, Hide answer, the answer button's `aria-label`, and the training-form coupling. The plugin version is not a pass condition.
- `backup-before-apply.sh` runs after that preflight and before the copy. It writes a new directory, not the previous package directory: the two Learn files, and the content, SEO fields and seed markers of the routes in `routes-update.txt`.
- Dry-run the content update before apply. Apply only after that report matches `UPDATING.md`.
- `restore-backup.sh` puts the two files back. It restores a page only while that page still has the seed hash written by the apply. A later edit is left in place, and a later seed still skips edited pages. It unpublishes only the route this apply created.
- Translations: `status` first, then `import-apply`. That fills empty rows in scope and does not overwrite a filled row. A filled row that would have to change is listed in the package, with the old and new values, for a hand edit. If there is no such row, the package says so.
- Do not assign `LEARN_FORCE`. Do not change menus, forms, other plugins, or production.
