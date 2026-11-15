# Dutch for Issuers and Relying parties: repair round 15 November 2026

Local pilot only. The earlier round is `nl-translation-changes-issuers-rp-2026-11-14.md`. Terminology follows `nl-terminology.md`.

## The route

1. **Dictionary rows (TranslatePress)** for fixed texts: added to the `$nl` array in `learn/nl-translations.php` (block "Round 2026-11-15"), then `pilot_wp eval-file learn/nl-translations.php apply`. `apply` fills **empty** rows only and never overwrites a human translation (status 2). A row exists only after the page was opened once under `/nl/`; the 7 Learn pages and the 4 catalog pages were opened first. Result: `filled: 14`, later `filled: 2` for the two Learn link labels.
2. **PHP side (plugins)** for text with numbers, dates and names, which a dictionary cannot hold: `Fides_Issuer_Design::t()` / `n()` and `Fides_RP_Design::t()` / `n()` (counts, row meta line, pills, "n selected", pager "Page n of m", aria-labels, live regions, empty state, month names, country and language names via `Locale`). They switch on `determine_locale()` starting with `nl`. Dynamic output carries `data-no-translation` so TranslatePress does not translate it a second time.
3. **Document title:** TranslatePress did not translate the `<title>` of these pages. The plugins filter `document_title_parts` (`TITLES_NL`, priority 30).

## Transfer to staging

The four design-pilot page titles and the new texts are in `nl-translations.php` (a local authoring helper, not for staging). `nl-translations-transfer.php` and `nl-translations.json` cover only the Learn, services, start and training routes, so the issuer and relying party rows are **not** in the transfer file. Options: add the issuer and relying party routes to the transfer file (open decision), or enter the rows via the TranslatePress export/import of the staging site. The PHP-side Dutch (route 2 and 3) travels with the plugins and needs no import.

## Rows added

| English | Dutch |
|---|---|
| Share | Delen |
| Share on LinkedIn | Delen via LinkedIn |
| on LinkedIn (opens in a new tab) | via LinkedIn (opent in een nieuw tabblad) |
| Issuers (design pilot) | Uitgevers (designpilot) |
| Issuer detail (design pilot) | Detail uitgever (designpilot) |
| Relying parties (design pilot) | Vertrouwende partijen (designpilot) |
| Relying party detail (design pilot) | Detail vertrouwende partij (designpilot) |
| Operational status | Operationele status |
| Production first | Productie eerst |
| Most credential configurations | Meeste credentialconfiguraties |
| Browse issuers | Bekijk uitgevers |
| Browse relying parties | Bekijk vertrouwende partijen |
| Production/Test legend, readiness legend, readiness/status note, configuration note | full sentences in `nl-translations.php` |

## Stays English on purpose

- "Ecosystem Explorer" (a product name, also in the live Dutch menu).
- Technical names: credential formats, protocols, algorithms, configuration ids.
- Catalog content (descriptions, names) and the use case card category and country text.

## Checked

`tests/run-issuer-rp-checks.sh`: document title, count, legend, sort option, Share, section navigation and breadcrumb in NL at 1440 and 390 px.
