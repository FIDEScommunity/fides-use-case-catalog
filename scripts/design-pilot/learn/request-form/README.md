# WPForms request form (pilot prototype)

One WPForms form, `fides-request-form`, for requests from trainings, workshops and services. The existing
request pages (`/learn/sessions/request/`, `/services/enquiry/`) stay as they are and remain the reference.

## Files

| File | Purpose |
| --- | --- |
| `fides-request-form.json` | Form definition (WPForms export format, also importable in the builder). Eight fields, two notifications, one confirmation. |
| `../../seed-request-form.sh` / `.php` | Idempotent seed: finds the form by slug, creates or updates it, creates the page `request-wpforms` under Training & workshops. A form edited in the builder is skipped unless `REQUEST_FORM_FORCE=1`. |
| tiles `includes/class-fides-ds-request-form.php` | Choices from the Learn offerings, prefill from the link, server checks, Dutch texts, send-failure message, routing switch. |
| tiles `assets/request-form.css`, `request-form.js` | Load only on the request page. Tokens from `design-system.css`; the submit button is the shared `fides-ds-button`. |
| `../../tests/run-wpforms-request-checks.sh` | Server and browser checks (`WITH_EXISTING=1` adds the services and sessions checks for the old flow). |

## Settings

- Routing of the existing request links to this page: off by default. `define('FIDES_DS_REQUEST_FORM_ROUTE', true)`,
  `update_option('fides_ds_request_form_route', '1')` or the filter `fides_ds_request_form_route`.
- Recipient of the FIDES notification: placeholder `request@example.invalid` until set. `FIDES_DS_REQUEST_FORM_RECIPIENT`,
  option `fides_ds_request_form_recipient` or filter `fides_ds_request_form_recipient`. An invalid value falls back to the placeholder.
- Alternative contact in the failure message: filter `fides_ds_request_form_alternative_contact` (placeholder by default).
- Mails per address and hour: filter `fides_ds_request_form_hourly_limit` (3; per visitor address 9).

## Dutch

- Form labels, descriptions, notice, button: TranslatePress dictionary rows. Add them with `learn/nl-translations.php apply`
  after the page has been opened once under `/nl/`.
- Mail texts, confirmation, script validation messages, server messages: Dutch text in the class, chosen by the hidden
  language field. TranslatePress does not translate mail bodies or the AJAX confirmation.
- The notice and the privacy text are plain strings, not `__()` calls. TranslatePress handles gettext strings in a separate
  table, so they would not get dictionary rows like the rest of the page.
- The WPForms noscript message is inside `<noscript>`, which TranslatePress skips; it stays English.
