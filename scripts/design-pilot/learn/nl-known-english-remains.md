# Known English remains on Dutch Learn routes (13 November 2026)

Status after the two-article round. These sentences are found by `tests/nl-route-checks.cjs` ("no untranslated English sentences") and are **deliberately not hidden**: the route check still reports them as failures. List regenerated with `tests/nl-english-remains-report.cjs` (same filter, plus the element context).

Routes checked: the two articles, `around-the-world` and its country pages (india, canada, united-states, honduras, ethiopia, the-netherlands, germany, un-transparency-protocol).

| Route | Sentence | Classification |
|---|---|---|
| learn/topics/for-you/receiving-information-in-a-wallet | none | - |
| learn/topics/for-businesses/what-should-a-service-check-when-receiving-a-credential | none (the lead was entered in this round) | - |
| around-the-world, india, canada, honduras, ethiopia, germany | none | - |
| around-the-world/united-states | The California mDL and Its Growing Use and Ecosystem of Stakeholders | catalogue title (use case record title, h3 in the record box) |
| around-the-world/the-netherlands | A repository or system, under the responsibility of a public or private body, that is the primary or recognized source of attributes about a person or object. | glossary definition (Authentic Source) |
| around-the-world/the-netherlands | A cross-border data exchange system that enables competent authorities to retrieve evidence directly from authoritative sources, reducing the need for citizens and organizations to repeatedly submit the same information. | glossary definition (Once-Only Technical System) |
| around-the-world/un-transparency-protocol | Reeco Textile DPP : the supply chain verified independently of the brand's systems | catalogue title (use case record title) |
| around-the-world/un-transparency-protocol | A UN/CEFACT standard (UNTP) for interoperable digital credentials and discovery mechanisms that enable verifiable supply chain transparency at scale without a central data store. | glossary definition (UNTP) |
| around-the-world/un-transparency-protocol | A UNTP verifiable credential issued by a shipper carrying product identity, characteristics, and sustainability performance for serialised products or batches. Not the same as the EU regulatory Digital Product Passport (ESPR), though related in purpose. | glossary definition (Digital Product Passport) |
| ecosystem-roles/the-issuer (found by `nl-roles-governments-checks.cjs`) | From Repeated Verification to Reusable Trust: Re-imagining the Real Estate Purchasing Journey | catalogue title (use case record title) |

No sentence in the class "other" remains on these routes.

## Why out of scope
- Glossary definitions come from the glossary data, which is a separate Dutch round (decision: glossary stays English).
- Catalogue titles are the own titles of use case, credential, organisation and wallet records. They are catalogue data, not Learn content.

## How to resolve later
- Glossary definitions: a glossary translation round (rows in TranslatePress for the definitions, or the glossary i18n data in `tests/glossary-i18n-data.php`).
- Catalogue titles: give the records their own Dutch titles in the catalogue (or translate the record title rows); then the route check passes without changes.
