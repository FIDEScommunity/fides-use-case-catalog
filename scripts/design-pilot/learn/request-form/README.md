# WPForms request form (pilot prototype)

One WPForms form, `fides-request-form`, for requests from trainings, workshops and services. The existing
request pages (`/learn/sessions/request/`, `/services/enquiry/`) stay as they are and remain the reference.
The switch that routes the existing request links to this form is OFF by default.

Tested locally on WPForms **Lite 1.9.5.2**. The shielded staging review site runs WPForms 1.10.2.1 with the paid plugin code
(licence said to be Plus); that trial is prepared in `STAGING-PLUS-TRIAL.md` and has **not** been run. Everything marked "Plus" below is
**not verified locally**: it comes from the WPForms documentation and the read-only Pro build 1.9.7.3 in `~/Downloads`.

## Files

| File | Purpose |
| --- | --- |
| `fides-request-form.json` | Form definition (importable in the builder): offering, date, name, email, organisation, message, hidden language. Two notifications, one confirmation. |
| `../../seed-request-form.sh` / `.php` | Idempotent seed of the form and the page `request-wpforms`. A form edited in the builder is skipped unless `REQUEST_FORM_FORCE=1`. |
| tiles `includes/class-fides-ds-request-form.php` | The custom code (list below). |
| tiles `assets/request-form.css`, `request-form.js` | Page-only styling with shared tokens; date filter per offering, "Your request" summary with remove button. |
| `../../tests/run-wpforms-request-checks.sh` | Local server and browser checks (1440 and 390) with the mail capture. `ONLY=click,en,nl,outcomes,ctx` and `WIDTHS=1440` narrow a run. |
| `../../tests/staging-plus-checks.cjs` | Checks against a review site: GET only by default, sending behind two env switches. |
| `STAGING-PLUS-TRIAL.md` | Steps, files with sha256, safety checks, clean-up and roll-back for the staging trial. |

## Settings

- Routing: `define('FIDES_DS_REQUEST_FORM_ROUTE', true)`, option `fides_ds_request_form_route`, or filter `fides_ds_request_form_route`.
- FIDES recipient: placeholder `request@example.invalid` until `FIDES_DS_REQUEST_FORM_RECIPIENT`, option `fides_ds_request_form_recipient` or the filter is set.
- Alternative contact in messages: filter `fides_ds_request_form_alternative_contact` (placeholder).
- Retention sentence in the privacy text: filter `fides_ds_request_form_retention` (placeholder text until decided).
- Visitor mails per address and hour: filter `fides_ds_request_form_hourly_limit` (3).

## What WPForms does itself, and what stays custom

| Need | WPForms itself? | Custom hook and why it stays |
| --- | --- | --- |
| Fields, required, email format, AJAX, antispam token and time limit | Yes (Lite) | none |
| Prefill from `?offering=`, `?session=` | `{query_var}` smart tag or dynamic population can prefill, but cannot check a value against the known list | `wpforms_frontend_form_data` builds the choices from the Learn pages (WPForms has no source for them) and preselects only known values |
| Date list per offering | No (Plus conditional logic can show or hide fields, but the options still come from Learn) | `request-form.js` filters dates; `wpforms_process_before_form_data` rebuilds the same choices on submit; `wpforms_process` rejects unknown offering/date |
| Per-language mail and confirmation | No. Plus conditional logic could pick a notification per language, but the texts still come from here | `wpforms_process_before_form_data` sets recipient, subjects and bodies per language (hidden language field, because TranslatePress does not translate mail) |
| Confirmation that states only what happened | No mail result is available to WPForms | `pre_wp_mail`, `wp_mail_succeeded`, `wp_mail_failed` record results; `wpforms_process_complete` stores the outcome; `wpforms_frontend_confirmation_message` writes the text |
| One visitor mail per address and hour | No | inside `wpforms_process` |
| Dutch validation and server messages | No (TranslatePress does not reach script or server strings) | `wpforms_frontend_strings`, `wpforms_ajax_submit_before_processing` |
| Notice, summary, privacy text | Plus has an HTML field; Lite has not | `wpforms_frontend_output`, `wpforms_display_submit_before`. In Plus these two hooks can become HTML fields. |
| GDPR agreement field | Yes (Lite and Plus, when "GDPR Enhancements" is on) | not used, see Privacy |

Removed in this round: the `wpforms_process_filter` hook (the date is now validated, not silently dropped), the
name check that blocked URLs and `@`, the per-IP limit, and the required consent checkbox.

## Storage and what administrators see

- **Lite** stores no entries: no Entries screen, no `wpforms_entries` table, no IP, user agent or UUID cookie (WPForms documents this for Lite). The only record of a request is the notification mail. `wpforms_logs` only holds log lines, not submitted fields (27 rows in the pilot, none with test text).
- **Plus/Pro (not verified locally)**: entries in `wpforms_entries` (form id, IP, user agent, user id, user UUID, dates), field values in `wpforms_entry_fields`, notes and meta in their own tables. Administrators see them under WPForms » Entries (search, filter, trash, restore, delete, print, export), in the dashboard widget (counts and chart per form), in notification mails and in the CSV export. A mail-log plugin (WP Mail SMTP, Post SMTP, ...) would keep sent mails separately, including the visitor's message in the FIDES notification; that is a second place to clean.
- **Settings that limit storage** (WPForms documentation): per form, Settings » General » Advanced » "Disable storing entry information in WordPress" (all license levels; then the mail is the only record); per form "Disable storing user details (IP address and user agent)"; site-wide WPForms » Settings » General » GDPR: "GDPR Enhancements", "Disable User Cookies" (no UUID) and "Disable User Details".
- **Deleting (Plus)**: per entry or in bulk from the Entries list (trash first, then delete permanently; "Delete All" for a form). The WordPress "Erase personal data" tool does **not** remove WPForms entries: the Pro 1.9.7.3 source registers no WordPress privacy exporter or eraser. A data-deletion request therefore means searching the Entries list by email address and deleting by hand, plus the mail archive and any mail-log plugin.
- **No automatic retention** was found in the Pro build (only entry-email meta and export cleanup). No retention job was added here. This stays an open decision.

## Behaviour when saving or mailing fails

| Stored (Plus) | FIDES mail | Visitor mail | What the visitor sees |
| --- | --- | --- | --- |
| n/a (Lite) | sent | sent | "We received your request and sent a confirmation to your email address..." |
| n/a (Lite) | sent | failed | "We received your request, but we could not send a confirmation... keep this page" |
| n/a (Lite) | failed | any | error with alternative contact, no promise of follow-up, entered data stays in the form |
| yes (Plus) | failed | any | "Your request is saved, but we could not notify the team right now, so we cannot say when we will reply..." |
| yes (Plus) | sent | failed | same as Lite with a failed visitor mail |
| failed (Plus) | sent | any | like a successful request: the notification is the record (not testable on Lite; stored state is read from the entry id) |

A mail counts as sent only when `wp_mail` reported success. In Lite the lost-mail case is the weak point: there is no stored copy to fall back on. The Plus rows are logic read from the code path, not exercised locally.

## Names and abuse

Names are not blocked. Anything is accepted (apostrophes, hyphens, diacritics, non-Latin scripts, one or several words, very short names). WPForms `antispam_v3` (token and minimum fill time) stays on; there is no external captcha. The visitor mail only contains the name, offering and date. The name is plain text: tags, braces and line breaks are removed, it is cut at 80 characters, HTML-escaped, and a name that looks like a link or an address is not repeated (the greeting becomes "Hello,"/"Goedendag,").
One limit stays: 3 visitor mails per address and hour. `antispam_v3` slows bots but does not stop one person from typing someone else's address repeatedly, which would make FIDES send that person mail. The per-IP limit was dropped (shared networks at events would be blocked, and the per-address limit already protects the mailbox).

## Privacy

The consent checkbox was removed. A request for contact about a training or service is handled on the basis of the visitor's own request (pre-contractual steps or legitimate interest), not consent, and a required "I agree" box suggests a choice the visitor does not have. The text above the button now gives the purpose, a retention placeholder and the privacy link (`Fides_DS_Site_Shell::url('/privacy/')`, no production URL in code) and asks visitors to leave out sensitive data. The legal basis and the real retention period belong in the privacy statement; both are open decisions. If a consent record is wanted later, use the WPForms GDPR Agreement field (always required, never pre-checked).

## Dutch

Labels, notice and privacy text come from TranslatePress rows (`learn/nl-translations.php apply`, after a first visit under `/nl/`). Mail, confirmation, script validation messages and server messages are Dutch text in the class, chosen by the hidden language field. The WPForms noscript message sits in `<noscript>`, which TranslatePress skips.

## Separate test page

`REQUEST_FORM_PAGE=test seed-request-form.sh` (locally) or `... wp eval-file seed/seed-request-form.php` (staging, with `PILOT_STANDALONE=1`)
creates the form (stable slug `fides-request-form`) and a second page `request-wpforms-test`: at the site root of a standalone site
(`/design-review/request-wpforms-test/`, `/design-review/nl/request-wpforms-test/`), below the pilot base page locally. The page carries the meta keys
`_fides_ds_request_form` and `_fides_ds_request_form_test`, is noindex, is linked from nowhere and is never the target of the routing switch
(`page_id()` skips it). The seed is idempotent, uses no network and never changes the routing option. The existing request pages and routes are not touched.

## Plus path (written against the Pro 1.9.7.3 source, not run on Plus)

- Hooks: all hooks used here exist in Pro with the same arguments (`wpforms_process_complete` gets the entry id as 4th argument; the confirmation filter runs after the mails). The code reads the WPForms process object through one guarded helper and returns quietly when it is missing, so a version difference cannot cause a fatal.
- Storing: in Pro `entry_save()` skips storing when the key `disable_entries` **exists** in the form settings, even with an empty value. The form JSON therefore does not contain that key. `disable_ip: "1"` is set ("Disable storing user details"); it only works when "GDPR Enhancements" is on (`wpforms_is_collecting_ip_allowed()`). Lite ignores both. Verify both in the builder on Plus.
- Confirmation: an entry id above 0 in `wpforms_process_complete` counts as "stored". The outcome table above applies as written. When WPForms does not complete a submission (for example a stored spam entry) no outcome exists and the neutral base confirmation shows, which claims no mail.
- The hidden Language field is rendered by Plus (Lite does not render it); its default value is set per page language, so mail language follows the page. On Lite the language comes from TranslatePress.
- Locally the stored/mail matrix is tested by calling the hooks with a simulated entry id and mail results (`tests/wpforms-request-behaviour.php`). Production code has no test flag.

## The lost Send click after a validation error

**Cause.** After a failed submit the error messages stay visible. When the visitor then fills the last field and presses Send with the mouse, mouse down moves focus to the button, the field blurs, jQuery Validate removes that field's error message, and the form shifts up. Measured at 1440 px: the button moved 24 px between mouse down and mouse up, so mouse up landed outside the button and no click (no submit) happened. It is WPForms core behaviour. At 390 px the same test failed before the fix.

**Fix** (`assets/request-form.js`, 8 lines): a `mousedown` handler on the Send button calls `preventDefault()`. Focus stays in the field, nothing blurs, nothing shifts (0 px measured), and the click still submits; the submit validates all fields and WPForms shows and focuses the errors as before. Keyboard use is unchanged (Tab to the button, Enter or Space), so error announcements and `aria-live` still work. Reserving fixed space for errors was rejected (the layout would show gaps), and switching off validate-on-blur would remove helpful feedback.

**Test.** `tests/wpforms-request-checks.cjs` (section `click`) uses a real mouse (move, down, 150 ms, up). Before the fix both widths failed; after it both pass.

## Local tests (1440 and 390 only)

`tests/run-wpforms-request-checks.sh` (about 3 minutes): 121 checks passed in the last run. `ONLY=click` runs the click test alone. The staging script ran locally in read-only mode against the Lite pilot: everything passed except the expected "paid plugin folder at 1.10.2.1" check.

