# Dutch route: review of the 27 remaining English strings

Status: **proposal only (12 November 2026).** Nothing here is in `learn/nl-translations.json`, `learn/nl-translations.php` or the
database. The owner decides; then the chosen Dutch goes into the TranslatePress editor (or `nl-translations.php`), followed by
`export`.

Source: `wp eval-file learn/nl-translations-transfer.php status` lists them as **new** (a string on the Dutch route pages whose
dictionary row has no translation and is not in the transfer file). Context comes from the page links of each dictionary row
(`trp_original_meta`) and from `learn/content/*`. A string can sit on several pages; the dictionary row is global, so one
decision covers all of them.

Verdicts: **keep** = leave English on purpose (official name, abbreviation or standard term; nothing to do);
**decide** = a choice for the owner; **translate** = ordinary interface or running text that should be Dutch.

| # | String | Context (where, kind of text) | Verdict | Proposal |
|---|---|---|---|---|
| 1 | Holder + wallet | Learn "How credentials connect": role diagram step, bold label (next to "Issuer" = "Uitgever", "Recipient" = "Ontvanger") | **translate** | Houder + wallet |
| 2 | Relying party | Same diagram, third step, bold label | **translate** | Ontvangende partij (same as the existing row for `relying party`) |
| 3 | Digital Certificate of Good Conduct (VOG) as a Verifiable Credential | Title of a use case card from the catalog data (Learn start, overview, awards pages) | **keep** | Catalog data is English; not route text |
| 4 | End-to-End Digital Business Workflows: Transforming KYB-KYC-KYS via EU Business Wallet | Title of an awards entry (catalog data) | **keep** | Catalog data |
| 5 | SD-JWT VC | Format name in Learn "Formats and protocols", catalog filters | **keep** | Standard name |
| 6 | OpenID4VCI | Protocol name, same article and catalogs | **keep** | Standard name |
| 7 | OpenID4VP | Protocol name, same article and catalogs | **keep** | Standard name |
| 8 | mDoc | Format name (ISO/IEC 18013-5), Learn article and credential catalog | **keep** | Standard name |
| 9 | PID | Abbreviation, Learn "What is a credential?", credential catalog | **keep** | Abbreviation (Person Identification Data) |
| 10 | QEAA | Abbreviation, Learn "What is a credential?", wallet catalog | **keep** | Abbreviation |
| 11 | EAA | Abbreviation, Learn "What is a credential?" | **keep** | Abbreviation |
| 12 | European Digital Identity Wallet | Link text and glossary term name on many pages (Learn articles, glossary) | **decide** | Keep English as a product name (current behaviour). The official Dutch name is "Europese digitale identiteitsportemonnee" (EUDI-portemonnee); use it only if the owner wants the formal name in running text |
| 13 | European Business Wallet | Same: term and product name on Learn pages and glossary | **keep** | Proposed name of the EU instrument; no settled Dutch name |
| 14 | EUDI Wallet Readiness | Training topic list item on `learn/sessions` (neighbouring items are Dutch: "Walletconnectors en integratie", "Uitgifte van credentials en authentieke bronnen") | **translate** | EUDI Wallet-gereedheid |
| 15 | Wallet Introduction | Name of an inhouse session (cards on Learn and Training & workshops, CTA texts) | **decide** | Offering name; keep English for recognisability, or "Wallet-introductie" |
| 16 | Wallet Readiness Workshop | Name of an inhouse workshop (cards, CTA texts) | **decide** | Keep English, or "Wallet readiness-workshop" |
| 17 | readiness workshop | Running text, Learn "Business wallets: where to start" (last step) and a CTA | **decide** | Follows #16: "readiness-workshop" if #16 is translated, otherwise unchanged |
| 18 | Wallet | Glossary term name shown as chip on Learn and on the glossary page | **keep** | Same word in Dutch usage; term name from the glossary data |
| 19 | Credential | Bold term name in "What is a credential?" and term chip; glossary term | **keep** | Same word in Dutch usage ("credential") |
| 20 | credential | Running text term label in "What is a digital wallet?" | **keep** | Same word in Dutch usage; the sentence around it is Dutch |
| 21 | Relying Party | Glossary term name (chip, glossary page, organisation catalog filter) | **keep** | Glossary data is English; the Dutch running text uses "ontvangende partij" (see #2) |
| 22 | Mandate | Glossary term name (chip on Learn "For businesses") | **decide** | Keep English (glossary data), or "Volmacht" in chips only; the running text already says "volmachten" |
| 23 | business wallet | Running text term label, "Business wallets: where to start" | **keep** | Established Dutch usage: "business wallet" |
| 24 | Business wallet | Glossary term name / chip (Learn, wallet catalog, organisation catalog) | **keep** | Same |
| 25 | business wallets | Running text term label in "For businesses" and "European Business Wallet" | **keep** | Same (plural "business wallets") |
| 26 | Credential Catalog | Link text (name of the FIDES catalog) in two Learn articles | **keep** | Product name |
| 27 | EUDI & Business Wallets in Practice | Name of the open training (cards on Learn and Training & workshops, breadcrumb, page title in the Learn bar) | **decide** | Offering name; keep English, or "EUDI- en Business Wallets in de praktijk" |

Notes for the owner:

- **Translate (3):** #1, #2, #14. These are plain interface or role labels of the Dutch route and are inconsistent with their
  Dutch neighbours today. They are not added to the export or the database. Say "ja" and they are added to `nl-translations.php`
  (three lines), applied locally and exported.
- **Decide (6):** #12, #15, #16, #17, #22 and #27 are naming choices (official Dutch names, offering names, glossary chip text). The
  glossary page and its popups are out of scope for this round.
- **Open observation:** the title-case term `Issuer` has the Dutch row "Uitgever", but the lowercase running-text label `issuer`
  stays "issuer" in the Dutch articles (the new openers read "De issuer", "Een issuer"). If the owner prefers "uitgever" in
  running text, change the rows `issuer`, `An issuer`, `The issuer` together.
- Entries that stay English need no action; `status` keeps listing them as **new** until a translation exists. The tool lists
  "Credential"/"credential" and "Business wallet"/"business wallet" separately because they are separate dictionary rows.
