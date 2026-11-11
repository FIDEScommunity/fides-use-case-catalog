# WPForms request form (pilot prototype)

One WPForms form, `fides-request-form`, for requests from trainings, workshops and services. In the **local pilot this is the
request route**: every existing request link (offering pages, session dates, services, assessment) opens the WPForms page, and the old
request URLs (`/learn/sessions/request/`, `/services/enquiry/`, also under `/nl/`) redirect to it with the query string kept
(`?offering=…&session=…`). The old form stays as fallback (see Settings). The built-in default in the plugin is still OFF, so a site
without the pilot guard (staging, production) keeps the old routes until the switch is set.

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
| `../../tests/run-wpforms-request-checks.sh` | Local server and browser checks (1440 and 390) with the mail capture. `ONLY=routes,contacts,service,switch,a11y,click,en,nl,outcomes,ctx` and `WIDTHS=1440` narrow a run. |
| `../../tests/staging-plus-checks.cjs` | Checks against a review site: GET only by default, sending behind two env switches. |
| `STAGING-PLUS-TRIAL.md` | Steps, files with sha256, safety checks, clean-up and roll-back for the staging trial. |

## Settings

- Routing, in order of precedence: `define('FIDES_DS_REQUEST_FORM_ROUTE', true|false)`; option `fides_ds_request_form_route` (`1` on, `0` off); filter `fides_ds_request_form_route_default` (the local pilot guard `fides-design-pilot-guard.php` returns true; built-in false); filter `fides_ds_request_form_route`.
- Fall back to the old form: `wp option update fides_ds_request_form_route 0` (or the constant set to false), or per visit `?fides_legacy_form=1` on an old request URL (links on that page then stay old too).
- Follow-up sentence after "we received your request": filter `fides_ds_request_form_followup` (empty by default, so no promised reply time). It is only added when the team was notified.
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

## Routes and back link

| Route | Result with the switch ON |
| --- | --- |
| Training page, date link | WPForms page with `offering` and `session`/`date`, both visible and changeable |
| Sessions overview, workshop, partnerships | WPForms page with the offering |
| Services page, assessment | WPForms page with the offering |
| Old `/learn/sessions/request/…`, `/services/enquiry/…` (EN and `/nl/`) | 302 to the WPForms page, query and language prefix kept |
| `?fides_legacy_form=1` on an old URL | the old form, for comparison or fallback |

The back link on the form page goes to the chosen offering (like the old form) and otherwise to the section. The form page is a separate page, so the services enquiry no longer has its own wording per context; the choice in the form carries it.

## Contact routes and contexts

CTAs that ask for a service, training or workshop open the form. The form has three contexts, and the context is the **kind of the chosen offering**
(training or workshop, service, or none = general). The entry link only preselects: `?context=service` without an offering preselects the choice
"General service question" (a real offering of kind service), so the server never needs a separate hint. Unknown offerings, dates and contexts are ignored
and never printed.

Live switching: when a visitor changes or removes the choice, `request-form.js` updates heading, eyebrow, intro, notice, offering description, message
label and description, the date field and the back links from `FidesRequestForm.copy`, `.kinds` and `.back` (all already in the page language). Only text
changes, so focus stays on the offering select; the summary above the fields (`role=status`, `aria-live=polite`) announces the new choice. The new text goes
into spans with `data-no-translation`, because TranslatePress otherwise blanks changed text for a moment in Dutch. A date that belongs to another offering is
cleared in the page and dropped again on the server.

| Context | Page | Mail subject (team / visitor) | Confirmation |
| --- | --- | --- | --- |
| training or workshop | "Tell us what you need." | `New FIDES request: <offering (date)>` / `Your request to FIDES: …` | "…received your request…" |
| service | "Tell us about your question or project." Eyebrow "Services / Enquiry", label "Your question or project", no date field | `New FIDES service enquiry: <service or General service question>` / `Your enquiry to FIDES: …` | "…received your enquiry…" |
| general (no offering) | as training | `New FIDES request: General question` / `Your request to FIDES: General question` | as training |

Services without a page of their own, and the general service question, are rows of the Services page whose link ends in `/services/enquiry/?offering=<slug>` (slug = title in
lower case with hyphens, for example `use-case-and-business-case`). The form reads those rows, so a new row needs no code change. Hero action
"Discuss your question" uses `?context=service`. About FIDES "Discuss your project" uses `Fides_DS_Request_Form::service_url()`, which is
empty (and falls back to the Contact page) while the routing switch is off.

Not changed: the general Contact links (header, footer, other pages) and organisation contact actions. They all point to the site Contact page.

## Stored but not notified

On Plus, when the entry is stored but the FIDES mail failed, `note_entry()` adds a note ("The notification mail to the FIDES team could not be sent...") to the entry through `wpforms()->obj('entry_meta')->add(..., 'note')` so an administrator can see it in the entry. This follows the Pro 1.9.7.3 source and is silent on Lite or when the API differs. **Not verified on Plus.**

## Local tests (1440 and 390 only)

`tests/run-wpforms-request-checks.sh` (about 3 minutes; the OFF phase sets the option to 0, the ON phase uses the default; sections `routes` and `a11y` cover redirects, links per route in EN and NL, the legacy bypass, focus on the first invalid field, aria, Enter-submit and tab order after a validation error): all checks passed in the last run. The services and sessions checks (`run-services-checks.sh`, `run-sessions-checks.sh`) check the WPForms route by default; `LEGACY=1` sets option 0 for the run, checks the old form and removes the option again. `WITH_EXISTING=1` runs all four. The sections `switch` (live context while switching, removing, keyboard type-ahead, and four submissions that must agree with the live choice, EN and NL), `contacts` (every CTA, EN and NL, destination without redirect hop, preselection, heading, back link, invalid context, general Contact links as info) and `service` (wording, subjects, confirmation, EN/NL, 1440 and 390) cover the contact routes. `ONLY=click` runs the click test alone. The staging script ran locally in read-only mode against the Lite pilot: everything passed except the expected "paid plugin folder at 1.10.2.1" check.

