# Catalog links inventory for Themes & Sectors (2026-11-15)

Generated from `scripts/design-pilot/tests/explore-catalog-links-inventory.php` (read-only; JSON in `tests/output/explore-catalog-links-inventory.json`, not committed). Local pilot data: 118 credential types, 826 organisations (local file; the browser snapshot has 832), 75 issuers, 102 relying parties, 134 wallets, 101 use cases.

Definitions
- **Direct**: the record itself carries the sector or theme (credential types: `sectors`, `themes`; organisations: sector list).
- **Via all use cases**: the record is linked (by identifier) from any use case that matches the choice.
- **Via 4 featured**: same, but only for the 4 featured use cases on the page.
- **Indirect**: derived through another record: issuers through the credential types they issue (theme) or the organisation sector; relying parties through the credential types they accept. No text matching.

## 1. The two examples

**sector:education** — use cases: 6 matching, 4 featured.

| Catalog | Direct | Via all use cases | Via 4 featured | Direct ∩ all | Direct ∪ all | Indirect | Indirect basis |
|---|---|---|---|---|---|---|---|
| Credential types | 22 | 1 | 1 | 1 | 22 | 0 | - |
| Organisations | 13 | 14 | 10 | 7 | 20 | 0 | - |
| Issuers | 0 | 1 | 1 | 0 | 1 | 6 | issuers-org-sector |
| Relying parties | 3 | 1 | 1 | 0 | 4 | 0 | - |
| Wallets | 0 | 4 | 3 | 0 | 4 | 0 | - |

**theme:business_authority** — use cases: 25 matching, 4 featured.

| Catalog | Direct | Via all use cases | Via 4 featured | Direct ∩ all | Direct ∪ all | Indirect | Indirect basis |
|---|---|---|---|---|---|---|---|
| Credential types | 36 | 29 | 1 | 14 | 51 | 0 | - |
| Organisations | 0 | 63 | 6 | 0 | 63 | 0 | - |
| Issuers | 0 | 17 | 0 | 0 | 17 | 21 | issuers-credentials-theme |
| Relying parties | 0 | 8 | 0 | 0 | 8 | 8 | rps-credentials-theme |
| Wallets | 0 | 29 | 3 | 0 | 29 | 0 | - |

Observations
- Featured use cases cover only a small part of what matches: the broader selection is several times larger for every catalog.
- Organisations have a sector but no theme: a theme page can only reach organisations through use cases.
- Issuers and relying parties have neither sector nor theme; they are reached through credential types (derived) or use cases.
- Wallets have no sector or theme; they stay reachable only through use cases (no wallet block on the page).

## 2. Theme bundle mapping

| Bundle | Title | Credential catalog theme codes (types) |
|---|---|---|
| `identity_access` | Identity & Access | person_identity (33) |
| `business_authority` | Business & Mandates | organizational_identity (36) |
| `payments_commerce` | Payments & Commerce | payments (22) |
| `work_qualifications` | Work & Qualifications | education (12) |
| `products_trade_supply_chains` | Products, Trade & Supply Chains | trade_documents (25), digital_product_passports (9), dataspaces (10) |
| `government_compliance` | Government & Compliance | compliance_reporting (27) |

Catalog theme codes without a bundle: {"agentic_ai": 7} (agentic_ai: no bundle on the pages, so it is never shown).

## 3. All choices (summary)

| Choice | Use cases | Credentials direct / via all | Orgs direct / via all | Issuers via all / indirect | RPs via all / indirect | Wallets via all |
|---|---|---|---|---|---|---|
| theme:identity_access | 66 (4) | 33 / 29 | 0 / 114 | 21 / 31 | 25 / 64 | 43 |
| theme:business_authority | 25 (4) | 36 / 29 | 0 / 63 | 17 / 21 | 8 / 8 | 29 |
| theme:payments_commerce | 8 (4) | 22 / 1 | 0 / 19 | 2 / 15 | 2 / 21 | 7 |
| theme:work_qualifications | 12 (4) | 12 / 2 | 0 / 27 | 2 / 14 | 1 / 21 | 7 |
| theme:products_trade_supply_chains | 20 (4) | 35 / 6 | 0 / 40 | 0 / 11 | 0 / 1 | 8 |
| theme:government_compliance | 31 (4) | 27 / 15 | 0 / 74 | 16 / 16 | 9 / 10 | 32 |
| sector:agriculture | 1 (1) | 22 / 0 | 0 / 3 | 1 / 0 | 1 / 0 | 1 |
| sector:construction | 3 (3) | 19 / 0 | 5 / 9 | 0 / 0 | 0 / 0 | 1 |
| sector:digital | 24 (4) | 66 / 6 | 652 / 44 | 2 / 58 | 0 / 0 | 13 |
| sector:education | 6 (4) | 22 / 1 | 13 / 14 | 1 / 6 | 1 / 0 | 4 |
| sector:energy | 1 (1) | 23 / 0 | 5 / 3 | 0 / 0 | 0 / 0 | 0 |
| sector:finance | 14 (4) | 45 / 21 | 32 / 42 | 8 / 1 | 6 / 0 | 25 |
| sector:food | 1 (1) | 21 / 1 | 0 / 2 | 0 / 0 | 0 / 0 | 2 |
| sector:healthcare | 5 (4) | 18 / 2 | 8 / 10 | 0 / 0 | 0 / 0 | 3 |
| sector:manufacturing | 5 (4) | 27 / 5 | 7 / 8 | 8 / 0 | 1 / 0 | 15 |
| sector:mobility | 10 (4) | 21 / 8 | 24 / 27 | 4 / 4 | 10 / 0 | 16 |
| sector:public_sector | 17 (4) | 60 / 14 | 103 / 52 | 13 / 6 | 12 / 0 | 33 |
| sector:retail | 4 (4) | 31 / 2 | 6 / 2 | 0 / 0 | 1 / 0 | 2 |
| sector:supply_chain | 6 (4) | 41 / 5 | 8 / 17 | 0 / 0 | 0 / 0 | 4 |
| sector:trade | 4 (4) | 52 / 0 | 4 / 12 | 0 / 0 | 0 / 0 | 3 |

## 4. Filters and shareable URLs (tested in a real browser)

| URL | Result |
|---|---|
| `credentials/?sector=education` | works, visible pill "Sector: Education" |
| `credentials/?sector=education,finance` | works, two pills, 53 credential types |
| `credentials/?theme=<catalog theme>` | works (catalog codes such as `organizational_identity`, comma list) |
| `credentials/?theme=business_authority` | bundle code is ignored: no pill, all 118 shown |
| `organizations/?sector=…` | works, visible pill |
| `organizations/?theme=…` | not supported (ignored) |
| `issuers/?country[]=NL` | works (16 of 75) |
| `issuers/?credential[]=<id>` | works, pill per credential; used for derived issuer links |
| `relying-parties/?country[]=NL` | works (20 of 102) |
| `relying-parties/?credential[]=<id>` | works; used for derived RP links |
| `relying-parties/?sector[]=education` | not supported (ignored, 102 shown) |
| `personal-wallets/` and `business-wallets/` `?country=NL` | works, but no sector or theme filter exists |

## 5. Gaps and ambiguities
1. No sector or theme filter on issuers, relying parties or wallets. Report to the Issuers/RP track; not built here.
2. Organisations have no theme data; no theme link for organisations.
3. 12 generic credential types carry all 14 sectors; they would crowd every sector. Ranking puts specific types first and the "view all" count stays exact.
4. Organisation counts differ between the local file (826) and the browser snapshot (832): organisations link without a count.
5. The credentials theme filter uses the narrow catalog theme (e.g. "Organizational identity"), not the bundle name "Business & Mandates". The basis sentence names the catalog theme so the visible pill is explained.
6. Derived issuer and RP links carry one `credential[]` parameter per credential type (long URLs, up to 36 pills). The filter works but is long; a theme filter on those catalogs would be cleaner.
7. Use case issuer and RP links mostly carry no reference id, so they cannot be matched to records with certainty; only linked records with an id are used.
8. `agentic_ai` has no bundle.

## 6. Chosen presentation
- Featured use cases stay on top; the existing "Related use case" details stay.
- New block "More from the catalog" below: per catalog a compact row of max 4 records, a chip "Classified directly" or "Derived from related records", a plain-language sentence, and "View all …" only when a working filter exists (count only when exact). Otherwise "Showing N of M." without link.
- Records that are also linked to a shown use case are marked "Also linked to a use case above:" and deduplicated by identifier.
- Empty parts are omitted; without any record the whole block and its "On this page" entry are left out.
