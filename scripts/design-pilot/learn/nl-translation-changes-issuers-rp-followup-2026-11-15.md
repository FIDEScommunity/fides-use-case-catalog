# Dutch for Issuers and Relying parties: follow-up 15 November 2026

Local pilot only. Follows `nl-translation-changes-issuers-rp-repair-2026-11-15.md`. Terminology: `nl-terminology.md`.

## Transfer to another site (open decision of the repair round, now closed)

`nl-translations-transfer.php` now lists the issuer and relying party pages as routes (`issuers` and `issuer` form the group
`issuers`; `relying-parties` and `relying-party` the group `relying-parties`), next to Learn, Services, Training and start.
The tool is unchanged otherwise: the English source text is the key, `import-apply` fills **empty** rows only, a differing
(human) translation is kept and reported as "differs", rows outside the listed routes are never read or changed.

| Export | Before | After |
|---|---|---|
| Entries in `nl-translations.json` | 1461 | 1554 (+93, none removed, no existing translation changed) |
| Group `issuers` | not exported | 24 |
| Group `relying-parties` | not exported | 38 |
| Group `shared` (used by more than one group) | 111 | 149 (existing rows that these pages also use, e.g. Share, Production, Country) |
| Group `learn` (only Learn pages) | 1101 | 1094 (7 rows moved to `shared` because an issuer or relying party page uses them too; the translations are unchanged) |

`status` on the real table: add 0, same 1471, differs 0, pending 0 (no HTTP). `tests/nl-translations-transfer-behaviour.php`
(scratch copy `trp_test_nl_copy`, never the real table): all checks pass, including "issuer and relying party routes are in
the transfer file". Rows exist only after the page was opened once under `/nl/` ("pending" otherwise); the pages were opened first.

## Rows added in this round (`nl-translations.php`, filled by `apply`, empty rows only)

| English | Dutch |
|---|---|
| Credential issuer URL | URL van de credentialuitgever |
| OID4VCI metadata | OID4VCI-metadata |
| Last metadata check | Laatste metadatacontrole |

PHP side (`Fides_Issuer_Design::NL`, travels with the plugin): `Not specified` -> `Niet opgegeven`,
`Not specified: no environment is recorded.` -> `Niet opgegeven: er is geen omgeving vastgelegd.`

## Routes (local)

The Dutch routes carry the pilot prefix: `/nl/fides-design-pilot/issuers/`, `/nl/fides-design-pilot/issuer/?issuer=...`,
`/nl/fides-design-pilot/relying-parties/`, `/nl/fides-design-pilot/relying-party/?rp=...` (all 200, Dutch titles). The form
pages are site pages: `/nl/issuers-submit/`, `/nl/issuers-update/`, `/nl/relying-parties-submit/`, `/nl/relying-parties-update/`.

## Findings (not changed)

- The page titles of the four form pages are English on `/nl/` ("Issuer submit", "Issuer update", "Relying parties - submit", "Relying parties - update"). They belong to the existing site pages, not the pilot.
- `Could not be fetched (...). The credential list may be incomplete.` (issuer record, technical metadata, only for a record with a metadata fetch error) is a sentence with a dynamic part and stays English; no record in the data has the error.
- Site menu and footer items such as Learn, Explore, Updates, Awards are shared shell text and not part of this round.

## Checked

`tests/run-issuer-rp-checks.sh` with `CHECKS=env` (1440 and 390 px, EN and NL): legend, filter labels and counts, pills with a Dutch remove label, badges, and no English interface text in the dynamic output of the overviews and records.
