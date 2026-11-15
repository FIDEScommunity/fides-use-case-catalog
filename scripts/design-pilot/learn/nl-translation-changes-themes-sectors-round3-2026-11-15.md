# Dutch changes: Explore Themes and Sectors, round 3 (15 November 2026)

Source: `learn/nl-translations-explore.php` (`apply` fills only untranslated rows; human rows are never overwritten: `corrected: 0`, 81 dictionary rows kept). Terminology: `learn/nl-terminology.md`; the message is a short status sentence without direct address, so the u-form does not come into play.

## New rows (gettext, domain `fides-use-case-catalog`)

| English | Dutch | Where | Type |
|---|---|---|---|
| %s selected | %s geselecteerd | Screen reader status message (`role="status"`, `aria-live="polite"`) after choosing a theme or sector without a page load. `%s` is the chosen name, for example "Identiteit en toegang geselecteerd" | gettext |
| No selection | Geen selectie | Same message when the new address has no valid choice | gettext |

The templates are rendered by the server as `data-live-selected` / `data-live-none` on the explore root, so the Dutch page produces the Dutch message (before this round the script always said "<name> selected"). Notices for an unknown slug are still the existing translated rows.

## Applied

`wp eval-file learn/nl-translations-explore.php apply` on the local pilot: `gettext filled: 2`. Not part of `nl-translations.json` (Explore rows travel through the same script, as in earlier rounds).

## Verified

`tests/explore-themes-sectors-checks.cjs` (`ONLY_ROUND3=1`): after switching, the live region reads "<name> selected" on `/fides-design-pilot/` and "<naam> geselecteerd" on `/nl/fides-design-pilot/`, at 1440 and 390 px, for the theme and the sector page, also after Back.
