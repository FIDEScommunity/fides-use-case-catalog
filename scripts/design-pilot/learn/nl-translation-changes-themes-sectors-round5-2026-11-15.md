# NL changes: Themes & Sectors round 5, sector and theme filters on Issuers and Relying parties (2026-11-15)

Terminology: `nl-terminology.md` (uitgever, vertrouwende partij, credentialtype, u-form not needed: labels and status sentences without direct address). Catalog content stays English.

## Dictionary rows (TranslatePress, `nl-translations.php apply`, empty rows only; human rows kept: 918, corrected 0)

| English | Dutch | Where |
|---|---|---|
| Sector of organization | Sector van de organisatie | issuer filter label |
| Theme of credentials | Thema van de credentials | issuer filter label |
| Theme of accepted credentials | Thema van geaccepteerde credentials | relying party filter label |
| All sectors | Alle sectoren | both overviews (popover value) |
| All themes | Alle thema’s | both overviews |

"Sector" (relying party label) is the same word in Dutch.

## PHP side (travels with the plugins: `Fides_Issuer_Design::NL`, `Fides_RP_Design::NL`)

Pills, popover values and the four sentences under the pills are built from names, so they are translated in PHP (like the counts), and the elements carry `data-no-translation`:

- Sectorfilter: uitgevers waarvan de organisatie in de sector %s staat. De uitgever zelf heeft geen sector.
- Themafilter: uitgevers die minstens één credentialtype in het thema %s aanbieden.
- Sectorfilter: vertrouwende partijen die zelf de sector %s vermelden.
- Themafilter: vertrouwende partijen die minstens één credentialtype in het thema %s accepteren.
- Sector names and theme bundle titles use the same words as the Explore pages (Onderwijs, Financiën, Publieke sector; Bedrijven en mandaten, Identiteit en toegang, ...).

## Transfer file

`nl-translations-transfer.php export`: 1554 -> 1570 entries (+16, none removed, no translation changed). New or moved rows: the five above plus sector names and bundle titles that the issuer and relying party pages now show (Education, Finance, Public Sector, Trade, Mobility, the six bundle titles). Some rows moved between the groups `issuers`, `relying-parties` and `shared`; the translations are unchanged. `import-apply` on another site still fills empty rows only.
