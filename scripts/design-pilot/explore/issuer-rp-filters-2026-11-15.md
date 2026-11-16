# Sector and theme filters on Issuers and Relying parties (2026-11-15, round 5)

Local design pilot only. Replaces the long `?credential[]=…` links of "View all issuers / relying parties" on Themes & Sectors (up to 36 pills) with one short parameter.

## Existing classifications that were used (nothing new, no text matching)

| Catalog | Own sector / theme? | Filter | Basis (identifier path) |
|---|---|---|---|
| Issuers | no | `?sector=<code>` | the issuing organisation (`orgId`) lists the sector in its record (same canonical codes as `organizations/?sector=`) |
| Issuers | no | `?theme=<bundle code>` | at least one credential type the issuer offers (configuration refs and own credential refs, canonical id) has a catalog `themes` value of the bundle (use-case theme map) |
| Relying parties | yes: `sectors` | `?sector=<code>` | the relying party lists the sector itself (legacy names mapped as in the organisation pilot; `other` never) |
| Relying parties | no | `?theme=<bundle code>` | at least one accepted credential type has a catalog `themes` value of the bundle |

`<code>` is a sector slug (`education`) and `<bundle code>` a theme bundle of the Explore pages (`business_authority`). Both are in the page as pills, the filter panel (a popover per group, with counts over the whole catalog, only values with data) and, under the pills, one plain sentence per active filter:

- Issuers, sector: "Sector filter: issuers whose organization is listed in the sector Education. The issuer itself has no sector." (label: "Sector of organization")
- Issuers, theme: "Theme filter: issuers that offer at least one credential type in the theme Business & Mandates." (label: "Theme of credentials")
- Relying parties, sector: "Sector filter: relying parties that list the sector Education themselves." (label: "Sector")
- Relying parties, theme: "Theme filter: relying parties that accept at least one credential type in the theme Business & Mandates." (label: "Theme of accepted credentials")

Direct versus derived stays visible on both sides: Explore shows the chip "Classified directly" (relying party sector) or "Derived from related records", the catalog page shows the sentence above.

## Actual URLs (local pilot, `/nl/` prefix for Dutch)

| Choice | Catalog | URL | Results | Origin |
|---|---|---|---|---|
| Education | Issuers | `/fides-design-pilot/issuers/?sector=education` | 6 of 75 | organisation sector |
| Education | Relying parties | `/fides-design-pilot/relying-parties/?sector=education` | 3 of 102 | own sectors |
| Education | Credential types | `/fides-design-pilot/credentials/?sector=education` | 22 of 118 | own sectors (existing) |
| Education | Organisations | `/fides-design-pilot/organizations/?sector=education` | no number on the link (see below) | own sectors (existing) |
| Business & Mandates | Issuers | `/fides-design-pilot/issuers/?theme=business_authority` | 21 of 75 | credential types |
| Business & Mandates | Relying parties | `/fides-design-pilot/relying-parties/?theme=business_authority` | 8 of 102 | accepted credential types |
| Business & Mandates | Credential types | `/fides-design-pilot/credentials/?theme=organizational_identity` | 36 of 118 | own themes (existing; this page names the catalog theme, not the bundle) |
| Business & Mandates | Organisations | no link | - | organisations have no theme |

The Explore block uses the same selection functions as the overview (`Fides_Issuer_Design::filter_items`, `Fides_RP_Design::filter_items`), so the number on "View all" is what the overview shows (checked in `tests/explore-themes-sectors-behaviour.php`, `ONLY_ROUND4=1`, and in the browser).

Behaviour: search, sort, paging, pill removal, Back / Forward and the record route keep the filter; both parameters combine with the existing groups (AND between groups, OR within one); `?sector=a,b` and `?sector[]=a&sector[]=b` both work. An unknown value (or `other`) shows the empty state with the pill and a way back. The older `credential[]` URLs still work.

## Data that is not enough (no "View all" promise, no part in the block)

Counts by sector (issuers by organisation sector / relying parties by own sector); `-` = no record:

| Sector | Issuers | Relying parties |
|---|---|---|
| digital | 58 | 70 |
| public_sector | 6 | 23 |
| education | 6 | 3 |
| mobility | 4 | 9 |
| finance | 1 | - |
| trade | - | 1 |
| agriculture, construction, energy, food, healthcare, manufacturing, retail, supply_chain | - | - |

- The eight sectors in the last row have neither issuers nor relying parties: Explore shows no issuer or relying party part there (the block lists credential types, organisations and use cases only).
- Finance has no relying party and trade no issuer by sector although use cases of these sectors link to some: use case links mostly carry no reference id and are not used.
- `digital` is a catch-all: 58 issuers and 70 relying parties (the legacy sector names telecom, employment and other map to it), so it separates little. `finance` (1 issuer) and `trade` (1 relying party) are thin.
- Themes: every bundle has issuers and relying parties through credential types; thin is Products, Trade & Supply Chains for relying parties (1 of 102). Counts per bundle (issuers / relying parties): identity_access 31 / 64, business_authority 21 / 8, payments_commerce 15 / 21, work_qualifications 14 / 21, products_trade_supply_chains 11 / 1, government_compliance 16 / 10.
- Open choice: hide "View all" when the filter has no more records than the cards already shown (now it is shown whenever at least one record exists).
- Wallets: no filter (they carry neither sector nor theme).

## Organisation numbers: why they differ and a proposal

Findings (checked now): the pilot page and Explore (PHP) read `organization-catalog/data/aggregated.json` on a local host (`Fides_Catalog_Source`, local-dev rule): **826** organisations, `lastUpdated` 2026-10-15. The organisation overview script fetches `loadCatalogAggregatedJson` with GitHub first: **832** (`lastUpdated` 2026-11-15T13:11Z, console: "Loaded 832 organizations from GitHub"). The REST cache `/wp-json/fides-catalog/v1/aggregated/organization` held a third snapshot: 447 (2026-07-05, stale transient). On a production host the PHP side reads the transient (stale-while-revalidate) and the script reads GitHub or the cache first, so a mismatch is possible there too.

Not built (the work touches the shared tiles loader and the organisation script). Proposal, smallest first:
1. **Same source for both sides.** Server renders the snapshot identity (`lastUpdated` and count) into the page; the script loads through the REST cache first (`cacheDataUrl`) and uses GitHub only when the REST snapshot is older, never a newer one than the server rendered. Both then show the same number until the next refresh of the transient.
2. **Or compare before claiming.** Explore adds the number to "View all organizations" only when the snapshot date it saw equals the one the script reports (the script already knows `snapshotDate`); otherwise no number, as now.
3. Either way refresh the stale transient (447) and re-sync the local file before comparing numbers again.

Until then "View all organizations" has no number and Explore does not show "Showing N of M" next to it.

## Tests and files

`tests/explore-themes-sectors-behaviour.php` (`ONLY_ROUND4=1`): short link, parity of the filter and the block. `tests/explore-themes-sectors-checks.cjs` (`ONLY_ROUND4=1` also runs round 5; `ONLY_ROUND5=1` runs only round 5): per catalog and for Education, Business & Mandates, Identity & Access (issuers over 30: paging) and Digital (relying parties over 60: paging): counts equal the block, pill, sentence, checked option, search / sort / paging / Back / record and back / pill removal, Filters dialog at 390 px, NL texts and routes, empty state for unknown values, combined filters.
