# Dutch route: review of the 27 remaining English strings

Status (12 November 2026, updated after the terminology agreements, see `learn/nl-terminology.md`): the owner decided in the
local TranslatePress editor and in the terminology agreements. Resolved items are marked **resolved**; the rest is still open.
The list below is the original review of 27 strings; `status` now lists 25 as **new** (#1 and #2 are translated).

Source: `wp eval-file learn/nl-translations-transfer.php status` lists them as **new** (a string on the Dutch route pages whose
dictionary row has no translation and is not in the transfer file). Context comes from the page links of each dictionary row
(`trp_original_meta`) and from `learn/content/*`. A string can sit on several pages; the dictionary row is global, so one
decision covers all of them.

Verdicts: **keep** = leave English on purpose (official name, abbreviation or standard term; nothing to do);
**decide** = a choice for the owner; **translate** = ordinary interface or running text that should be Dutch.

| # | String | Context (where, kind of text) | Verdict | Proposal |
|---|---|---|---|---|
| 1 | Holder + wallet | Learn "How credentials connect": role diagram step, bold label (next to "Issuer" = "Uitgever", "Recipient" = "Ontvanger") | **resolved** | Houder + wallet (translated locally, in the export) |
| 2 | Relying party | Same diagram, third step, bold label | **resolved** | Vertrouwende partij (terminology agreement; the earlier proposal "Ontvangende partij" is superseded) |
| 3 | Digital Certificate of Good Conduct (VOG) as a Verifiable Credential | Title of a use case card from the catalog data (Learn start, overview, awards pages) | **keep** | Catalog data is English; not route text |
| 4 | End-to-End Digital Business Workflows: Transforming KYB-KYC-KYS via EU Business Wallet | Title of an awards entry (catalog data) | **keep** | Catalog data |
| 5 | SD-JWT VC | Format name in Learn "Formats and protocols", catalog filters | **keep** | Standard name |
| 6 | OpenID4VCI | Protocol name, same article and catalogs | **keep** | Standard name |
| 7 | OpenID4VP | Protocol name, same article and catalogs | **keep** | Standard name |
| 8 | mDoc | Format name (ISO/IEC 18013-5), Learn article and credential catalog | **keep** | Standard name |
| 9 | PID | Abbreviation, Learn "What is a credential?", credential catalog | **keep** | Abbreviation (Person Identification Data) |
| 10 | QEAA | Abbreviation, Learn "What is a credential?", wallet catalog | **keep** | Abbreviation |
| 11 | EAA | Abbreviation, Learn "What is a credential?" | **keep** | Abbreviation |
| 12 | European Digital Identity Wallet | Link text and glossary term name on many pages (Learn articles, glossary) | **resolved: keep** | Stays English as product name; the terminology agreement keeps EUDI Wallet and business wallet as common names |
| 13 | European Business Wallet | Same: term and product name on Learn pages and glossary | **keep** | Proposed name of the EU instrument; no settled Dutch name |
| 14 | EUDI Wallet Readiness | Training topic list item on `learn/sessions` (neighbouring items are Dutch: "Walletconnectors en integratie", "Uitgifte van credentials en authentieke bronnen") | **resolved: keep** | Stays English as topic name for now (terminology agreement); the earlier proposal "EUDI Wallet-gereedheid" is dropped |
| 15 | Wallet Introduction | Name of an inhouse session (cards on Learn and Training & workshops, CTA texts) | **resolved: keep** | Offering name stays "Wallet Introduction" (terminology agreement) |
| 16 | Wallet Readiness Workshop | Name of an inhouse workshop (cards, CTA texts) | **resolved: keep** | Offering name stays "Wallet Readiness Workshop" (terminology agreement) |
| 17 | readiness workshop | Running text, Learn "Business wallets: where to start" (last step) and a CTA | **resolved: keep** | Lowercase link text to the Wallet Readiness Workshop offering; stays English like the offering name (terminology round 2). The repeated offering name on `learn/sessions/wallet-introduction` became "de workshop" (a translated row, not part of these 27) |
| 18 | Wallet | Glossary term name shown as chip on Learn and on the glossary page | **keep** | Same word in Dutch usage; term name from the glossary data |
| 19 | Credential | Bold term name in "What is a credential?" and term chip; glossary term | **keep** | Same word in Dutch usage ("credential") |
| 20 | credential | Running text term label in "What is a digital wallet?" | **keep** | Same word in Dutch usage; the sentence around it is Dutch |
| 21 | Relying Party | Glossary term name (chip, glossary page, organisation catalog filter) | **keep** | Glossary data is English; the Dutch running text uses "ontvangende partij" (see #2) |
| 22 | Mandate | Glossary term name (chip on Learn "For businesses") | **resolved: keep** | The term chip stays English (terminology round 2; glossary term, shared with the glossary page, out of scope). Running text uses "mandaat/mandaten" for mandate credentials |
| 23 | business wallet | Running text term label, "Business wallets: where to start" | **keep** | Established Dutch usage: "business wallet" |
| 24 | Business wallet | Glossary term name / chip (Learn, wallet catalog, organisation catalog) | **keep** | Same |
| 25 | business wallets | Running text term label in "For businesses" and "European Business Wallet" | **keep** | Same (plural "business wallets") |
| 26 | Credential Catalog | Link text (name of the FIDES catalog) in two Learn articles | **keep** | Product name |
| 27 | EUDI & Business Wallets in Practice | Name of the open training (cards on Learn and Training & workshops, breadcrumb, page title in the Learn bar) | **resolved: keep** | Offering name stays "EUDI & Business Wallets in Practice" (terminology agreement) |

Notes for the owner:

- **Resolved:** #1, #2 (translated by the owner locally), #12, #14, #15, #16, #17, #22, #27 (stay English by the agreements).
- **Open:** none. All other strings stay English on purpose (verdict **keep**) and need no action.
- **Terminology deviations found in the local translations** (applied in terminology round 2: `learn/nl-terminology.md`, `learn/nl-translation-changes-2026-11-12-b.md`).
- Entries that stay English need no action; `status` keeps listing them as **new** until a translation exists. The tool lists
  "Credential"/"credential" and "Business wallet"/"business wallet" separately because they are separate dictionary rows.
