# Learn content update

Use this when a later round should ship a checked set of Learn routes from recorded commits. The package directory is built outside git. The concrete install commands and the expected dry-run and apply lines belong in that package's `UPDATING.md`, not here.

## Inputs

- Staging baseline. Read it from the latest rollout record, or from a public staging URL that shows the Learn and Tiles revisions. Do not open an SSH session. If the revision cannot be shown, mark the package as a concept in `UPDATING.md` and `SOURCE.txt` and say what was not read.
- Source commits. One content commit for the HTML, manifest, Dutch transfer file, media and route list. One Tiles commit when the pages need a Learn renderer or `learn.js` change. One commit for this procedure and the route check when those scripts change. `SOURCE.txt` names the full hashes.
- Route list. One path per line in `routes-update.txt`, taken from the content diff for that round. The wrapper checks the list against the manifest.
- Translations. The Dutch transfer file from the content commit. An ordinary import fills empty TranslatePress rows for those routes. A filled row that must change is written out with the old original, the old translation, the new original and the new translation, so the installer can see the conflict. Filled rows are not overwritten.
- Media. Images the changed pages reference, copied with the seeder. A dry-run does not create the upload directory.
- Tiles dependency. Include `includes/class-fides-ds-learn.php` and the `learn.js` the design pilot loads only when the content needs that renderer. Leave every other Tiles file out. Say in `UPDATING.md` whether Tiles is installed before the content.
- Checks. `git diff --check` in each repo that is committed. The Learn visitor suite, the Learn article suite, and the government suites when those pages are in the route list. A browser pass on the changed routes in English and Dutch, including keyboard behaviour when a control changed. The package dry-run on a local copy, confirmed to write no pages, uploads or settings.

## What the wrapper refuses

`validate-routes-update.py` stops on an empty list, a repeated route, a route that is not in the manifest, or the enquiry form. `seed-routes-update.sh` stops when `LEARN_IDS` is set to a different selection, and when `LEARN_FORCE` is set. In a built package, `seed-trial.sh` stops unless `LEARN_IDS` is exactly `routes-update.txt`. It also stops on production. Menus and the training form are not part of the seed.
