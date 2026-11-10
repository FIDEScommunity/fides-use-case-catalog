# Staging trial of the WPForms request form on WPForms 1.10.2.1 (Plus)

For Codex. The form was built and tested locally on WPForms Lite 1.9.5.2. This trial checks it on the shielded review
site, which runs WPForms 1.10.2.1 with the paid plugin code (licence said to be Plus). Do **one training request in EN and NL**, on a
separate test page, with test data only.

Rules: no real email addresses, no production URLs, no licence keys (not in commands, logs, screenshots or this repo).
Do not change the existing request routes. The routing switch stays OFF. Do not send mail: `wp_mail` must be blocked first (step 2).

## 1. Files

All paths are relative to the plugin or the package. Check the "base" hash of the tiles files **before** copying; if it differs, stop and ask.

| Target on staging | Source in repo | sha256 of the new file | sha256 of the file now on staging (package 1.13.44) |
| --- | --- | --- | --- |
| `wp-content/plugins/fides-community-tools-tiles/fides-community-tools-tiles.php` | tiles `fides-community-tools-tiles.php` | `1dce26b42ec77fbf152f41893d38fc2a94dc0e5e445f36d0e5ee29bb58484cec` | `1a2a8bd4b09bf1bb70d332ad76f35806e4ce3d67c1d038b2937082eec1404565` |
| `.../includes/class-fides-ds-learn.php` | tiles `includes/class-fides-ds-learn.php` | `41dacecda4b96f2bbce1f4ec3f1e0abdb0ba88b4efb0bd07875ad3a5e92d7cc0` | `b39d5ac9ed282ed2bffa4901e1b8452f63bf12d3dc0066145464a66ea33bea42` |
| `.../includes/class-fides-ds-request-form.php` (new) | tiles `includes/class-fides-ds-request-form.php` | `f5b24d3937ccb0f0328b77ff683fb9814e5c5aa3619c8a0b052152412bad5f28` | not present |
| `.../assets/request-form.css` (new) | tiles `assets/request-form.css` | `9a002c3ede28001f4c173a732d7f15892f7caa8c5946c2ab864691a1b841a72f` | not present |
| `.../assets/request-form.js` (new) | tiles `assets/request-form.js` | `360d9e21300e730a39ecfe318715ef59f7cfea646fa9eef4915dc496b3966b6d` | not present |
| `seed/seed-request-form.php` (new, next to `create-pages.php`) | use-case-catalog `scripts/design-pilot/seed-request-form.php` | `3a2d2b8b60a8ed0a3976d94fa5861947de55297b65fd459f23097501cc2259ad` | not present |
| `seed/learn/request-form/fides-request-form.json` (new) | `.../learn/request-form/fides-request-form.json` | `8376d0eac330f14c2106f41b0d7ebb326a9872366ab4cfb34e0b540df11b0805` | not present |
| `seed/learn/nl-translations.php` | `.../learn/nl-translations.php` | `98fd18ca7e6b2293941460bbac443e88b61ff4c5519ce61f44b1aebf1137f0ce` | `534a091b5132be49d456e8ab60d218ccbf1957da30704b2006a606db2be56519` |
| not deployed; run from your machine | `.../tests/staging-plus-checks.cjs` | `3b2ba12901067dd257e03ab72e17d75c01ed3aaa298c93681b88651e4cd8b160` | not present |

The tiles files differ from package 1.13.44 only by the request form changes (a `require_once`, a wrapper and a branch in `class-fides-ds-learn.php`).
Without the seeded form and page the code does nothing. The seed needs only WordPress and the JSON file (no network).

## 2. Safety checks before anything is sent

1. **Back up.** Database export (`wp db export`), a copy of `wp-content/plugins/fides-community-tools-tiles/`, and `wp post list --post_type=wpforms --fields=ID,post_name,post_title` (the Manifesto form must stay untouched).
2. **Verify that mail is blocked** (WP-CLI on the server, nothing is sent by these commands):
   - `wp eval 'var_export(defined("FIDES_DESIGN_REVIEW_ALLOW_MAIL") && FIDES_DESIGN_REVIEW_ALLOW_MAIL);'` must print `false`.
   - `wp eval 'var_export(apply_filters("pre_wp_mail", null, array("to"=>"block-check@example.invalid","subject"=>"x","message"=>"x","headers"=>"","attachments"=>array())));'` must print `false` (the review-site guard short-circuits `wp_mail`). `NULL` means mail is **not** blocked: stop, do not enable sending.
   - If you have no shell access, you cannot verify this: run only the read-only checks (step 5, default mode).
3. **WPForms facts** (Plugins screen and WPForms » Settings; no key): version `1.10.2.1`; licence status only "active" or "inactive"; WPForms » Settings » General » GDPR: "GDPR Enhancements" is ON (otherwise the per-form "Disable storing user details" option is not shown and not applied).
4. **Switch is OFF:** `wp option get fides_ds_request_form_route` prints nothing or an error, and `FIDES_DS_REQUEST_FORM_ROUTE` is not defined.

## 3. Install

1. Copy the five tiles files (compare the base hashes first), then `php -l` each PHP file and confirm the site still loads.
2. Copy the seed files into the package's `seed/` folder (layout above).
3. Dry run, then apply (standalone layout, test page at the site root):
   ```
   PILOT_STANDALONE=1 PILOT_HOME_PATH=/design-review REQUEST_FORM_PAGE=test REQUEST_FORM_DRY_RUN=1 wp eval-file seed/seed-request-form.php
   PILOT_STANDALONE=1 PILOT_HOME_PATH=/design-review REQUEST_FORM_PAGE=test wp eval-file seed/seed-request-form.php
   ```
   Expect `form: create` and `page: create test page request-wpforms-test at the site root`. Running it again says `up to date` and `exists`. A form edited in the builder is skipped (`REQUEST_FORM_FORCE=1` replaces it).
4. Dutch strings: open `/design-review/nl/request-wpforms-test/` once (GET), then `wp eval-file seed/learn/nl-translations.php status` and `... apply`.
5. Test page: `/design-review/request-wpforms-test/` and `/design-review/nl/request-wpforms-test/`. It is noindex and linked from nowhere.

**Setting in the form JSON (verify in the builder):** `disable_ip: "1"` (Settings » General » Advanced » "Disable storing user details (IP address and user agent)" ON). The key `disable_entries` is deliberately absent: Plus treats the key as "do not store" even when it is empty, so entry storing stays on by default. Check that "Disable storing entry information in WordPress" is **off**.

## 4. Checks in the WPForms builder (form "FIDES request form")

- Fields: Offering, Preferred date, Name, Email, Organisation (optional), Message, hidden Language. No checkbox.
- Settings » General » Advanced: entry storing ON; user details storing OFF (toggle ON as described); AJAX submit ON; anti-spam (modern) ON; no captcha.
- Notifications: "FIDES team" to `request@example.invalid`, "Visitor confirmation" to the email field. Both are placeholders; the code rewrites subject, text and recipient per request.
- Confirmations: one message confirmation (neutral text; the code replaces it with the real outcome).
- Do not enable any entry-related add-on or spam-entry storing for this trial; if it is on, note it.

## 5. Read-only checks (default, GET only)

```
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
PLAYWRIGHT_MODULE=<path to playwright> \
REVIEW_URL=https://<review-host>/design-review \
REVIEW_USER=... REVIEW_PASS=... \        # only if the site is shielded; never print or store them
node scripts/design-pilot/tests/staging-plus-checks.cjs
```

It checks: existing routes untouched (no WPForms on them, date links still go to the old request page); on the test page (EN and NL, 1440 and 390): loads, no doubled path, one form, noindex, offering and date prefilled, date list, labels, no checkbox, privacy text with the retention placeholder, no overflow, no script errors; the WPForms asset URLs come from the paid plugin folder at 1.10.2.1; unknown link values are ignored. Every non-GET request is aborted by the script. Set `OLD_REQUEST_PATH`, `OLD_SERVICES_PATH`, `TRAINING_PATH`, `NL_URL_BASE` if the staging paths differ from the defaults (the script says so when a path is missing).

## 6. One request in EN and NL (only when mail is verified blocked)

By hand, or with the script: `STAGING_SEND=1 STAGING_MAIL_BLOCK_CONFIRMED=yes node .../staging-plus-checks.cjs` (both variables are needed; sending is off otherwise).
Use the test page with `?offering=eudi-business-wallets-in-practice&session=thursday-14-january-2027`. Test data only: name "Staging Test", an `@example.invalid` address, a message that says it is a test.

Expected on Plus with mail blocked: validation messages in the right language; after sending, an **entry exists** and the confirmation says the request **is saved** (NL: "is opgeslagen") and that the team could not be notified; it does **not** say a confirmation mail was sent. If you see an error instead of "saved", entry storing is off or failed: note it. After a failed send the form keeps the entered data.
Also try the Send button with a real mouse click right after a validation error (Send must work on the first click).

## 7. What to look at after sending

WPForms » Entries: one entry per send; fields Offering, Preferred date, Name, Email, Message, Language; the entry detail must **not** show IP address or user agent (setting step 3). Dashboard widget counts them. Note whether Entries shows a "Notification sent" state. No mail leaves the server: confirm in the mail log of the host if one exists.

## 8. Clean up and roll back

1. **Delete the test entries permanently:** WPForms » Entries » select all » Trash, then Trash view » Delete permanently (or "Delete All"). Check the Spam view and the dashboard widget are empty. Entries are not removed by WordPress "Erase personal data".
2. Remove the test page and the form (delete the entries first):
   ```
   wp post delete $(wp post list --post_type=page --meta_key=_fides_ds_request_form_test --post_status=any --format=ids) --force
   wp post delete $(wp post list --post_type=wpforms --name=fides-request-form --post_status=any --format=ids) --force
   ```
3. Restore the five tiles files from the backup (the base hashes in step 1 must match again), remove `seed/seed-request-form.php` and `seed/learn/request-form/`. TranslatePress rows for the form strings may stay (harmless).
4. Confirm `/design-review/request-wpforms-test/` is 404 and the existing request routes still work.

## 9. Report back

Per step: pass or fail, the confirmation texts seen in EN and NL, whether an entry was stored, whether IP and user agent are absent in the entry, the licence status (active/inactive only) and anything that differs from this document.

## Not yet tested with Plus

- The hooks on 1.10.2.1: `wpforms_frontend_form_data`, `wpforms_process_before_form_data`, `wpforms_process`, `wpforms_process_complete` (entry id as 4th argument), `wpforms_frontend_confirmation_message`, `wpforms_frontend_strings`. They exist with the same signature in Pro 1.9.7.3 (read-only source check); 1.10.x was not read.
- Saved-entry confirmation ("is saved") and the honest error with a real entry id. Locally only simulated by calling the hook with an id.
- `disable_ip` effect (needs GDPR Enhancements) and the absence of IP and user agent in the stored entry.
- Rendering and value of the hidden Language field (Lite does not render it; Plus does).
- Importing the form JSON in the Plus builder and the builder toggles named above.
- Entry fields, Entries screen, dashboard widget, export and deletion on Plus; spam entry storing.
- TranslatePress with the Plus markup, the email-typo suggestion, and the Send-click fix (`mousedown` handler) on Plus markup.
- Mail results from `wp_mail_succeeded` / `wp_mail_failed` with a real mail transport (staging blocks mail, so only the "blocked" path is seen).
