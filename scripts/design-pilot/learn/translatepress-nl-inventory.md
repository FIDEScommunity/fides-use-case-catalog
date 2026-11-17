# TranslatePress inventory: first Dutch route (Learn)

Status (12 November 2026): **the inventory below is historic**, written before anything was translated. The Dutch route is now translated locally (Learn, Training & workshops, Services, start/receive); see `learn/README.md`, section "Dutch translations (TranslatePress): transfer, status and editing", and the transfer file `learn/nl-translations.json`. English is the source; translations are managed in TranslatePress and need a human content review (no unreviewed machine translation as final). Generated from `learn/manifest.json` and `learn/content/*.html` on 11 November 2026 (26 content files, 26 manifest pages); regenerate the per-page lists when content changes.

## Scope and order

1. Learn start page, Topics, The big picture (hub): navigation, introductory text, links.
2. What is a digital wallet? -> What is a credential? And what is an attestation? -> How credentials connect issuers, wallets and services.
3. Roles articles (Issuing credentials for wallets, Accepting information from a wallet): translate with the first route if the roles story is part of it, otherwise directly after.

Not in this inventory: the EUDI/EBW articles, Business wallets: where to start, Formats and protocols, Trust and interoperability, Sessions, Services.

## How the strings reach TranslatePress

- Page content (blocks): each paragraph, heading, list item, button label and link text is a separate string group in the dictionary (`wp_trp_dictionary_en_us_nl_nl`). A string only exists after the English page was opened once under `/nl/`.
- Learn fields from the page box "FIDES Learn page" (`_fides_learn_*`): headline, eyebrow, excerpt, sources, CTA title/text/label/URL. They are rendered as page text, so they are also strings; whether the excerpt is also output as a meta description has to be checked on the rendered page.
- Template strings (tiles `Fides_DS_Learn` and the site shell): Learn bar items, breadcrumb, "On this page", "Terms in this article", "Full definition", "Editorial sources" style labels, "Continue learning" group headings (these two are content), dialog labels. Check them on the first `/nl/` visit; they are shared by all Learn pages, so translate them once.
- Glossary popups: the term label comes from the page content; the definition text comes from the glossary data (`glossary-aggregated.json`) and stays English until the glossary has Dutch definitions (see "Glossary terms" below).
- Existing mechanism for hand-written Dutch: `learn/nl-translations.php apply|status` (currently covers Services and the Training pages only; it never overwrites an editor's translation; matching is case-sensitive, and `&` appears as `&amp;` or `&#038;` in stored originals).
- SEO/meta: no separate SEO fields are seeded; page title and excerpt are the only descriptive fields. Check the rendered `<title>` and meta description under `/nl/` after translation, and `hreflang`/alternate output of TranslatePress.

## Words that stay English or need care

- Product and proper names: FIDES, FIDES Explorer, EUDI Wallet, European Digital Identity Wallet, European Business Wallet (EBW), eIDAS, OpenID4VCI, OpenID4VP, SD-JWT VC, mDoc, W3C, VOG (Dutch name of a certificate; keep and explain).
- Legal and technical terms (EAA, QEAA, PID, vct, credential type, attestation, verifier, relying party): keep the English term where Dutch usage is the English term, with a short Dutch explanation at first mention; decide per term with a reviewer and use the same choice everywhere.
- "Credential", "wallet", "issuer", "holder": agree one Dutch house style before starting (for example "credential", "wallet" and "uitgever" or "issuer"); the glossary should follow the same choice.
- Legal uncertainty must survive translation: proposals ("proposed", "has not been adopted"), "can", "may" and "depends on" are deliberate. Do not firm up statements about the European Business Wallet, QEAA/EAA/PID categories or catalog metadata (TS11).
- Link labels that equal the target page title must match the Dutch page title once translated.

## Per page

### Learn start page

- Route: `(learn root)`; content file `learn/content/overview.html`; kind `overview`.
- Title: Learn; headline: Make sense of digital trust.
- Excerpt (138 characters): Explore wallets, credentials and the roles behind them. Follow a knowledge route at your own pace, or bring your team to a guided session.
- Body: 6 level-2 headings, 0 level-3 headings, 11 paragraphs, 9 list items.
- Headings: Start with the big picture.; How proof moves; Learn with your team; Find your perspective; Explore the concepts; Glossary
- Buttons: Explore topics →; Training & workshops →; Browse all topics →
- Links (tokens, resolved per site): `{{glossary}}`, `{{learn}}/sessions/`, `{{learn}}/sessions/eudi-business-wallets-in-practice/`, `{{learn}}/sessions/wallet-introduction/`, `{{learn}}/sessions/wallet-readiness-workshop/`, `{{learn}}/topics/`, `{{learn}}/topics/for-businesses/`, `{{learn}}/topics/the-big-picture/`, `{{learn}}/topics/the-big-picture/how-credentials-connect/`
- Glossary terms: terms box: Wallet|Verifiable credential=Verifiable Credential|Issuer
- Shortcodes in content: `[fides_learn_terms]`
- Notes: Contains the "How proof moves" flow (Issuer / Holder & wallet / Service with short captions) and three session rows with kickers (Open training, Inhouse session, Inhouse workshop). Ampersands (`&amp;`) in labels such as "Training & workshops" and "Holder & wallet" need the matching stored form.

### Topics

- Route: `topics`; content file `learn/content/topics.html`; kind `topics`.
- Title: Topics; headline: Choose what you want to understand.
- Excerpt (112 characters): Start with the big picture or go straight to a question. There is no required sequence and no account is needed.
- Body: 1 level-2 headings, 0 level-3 headings, 1 paragraphs, 8 list items.
- Headings: Prefer to learn together?
- Buttons: Training & workshops →
- Links (tokens, resolved per site): `{{learn}}/sessions/`, `{{learn}}/topics/for-businesses/`, `{{learn}}/topics/the-big-picture/`, `{{learn}}/topics/the-big-picture/formats-and-protocols/`, `{{learn}}/topics/the-big-picture/how-credentials-connect/`, `{{learn}}/topics/the-big-picture/trust-and-interoperability/`, `{{learn}}/topics/the-big-picture/what-is-a-credential/`, `{{learn}}/topics/the-big-picture/what-is-a-digital-wallet/`
- Glossary terms: none
- Notes: Wallets & credentials, Ecosystem roles and Technology rows link to their overviews and contain direct article links in the description. Keep the 'Start with' sentence pattern when translating.

### The big picture (hub)

- Route: `topics/the-big-picture`; content file `learn/content/the-big-picture.html`; kind `section`.
- Title: The big picture
- Excerpt (111 characters): Before choosing a wallet or a standard, understand what needs to be trusted — and who can provide the evidence.
- Body: 3 level-2 headings, 1 level-3 headings, 5 paragraphs, 9 list items.
- Headings: Why do we keep asking people to upload the same proof?; Explore this topic; See the components working together; (h3) Terms you will meet
- Buttons: Explore real-world use cases →
- Links (tokens, resolved per site): `{{glossary}}`, `{{learn}}/topics/the-big-picture/eudi-wallet-and-european-business-wallet/`, `{{learn}}/topics/the-big-picture/european-digital-identity-wallet/`, `{{learn}}/topics/the-big-picture/formats-and-protocols/`, `{{learn}}/topics/the-big-picture/how-credentials-connect/`, `{{learn}}/topics/the-big-picture/trust-and-interoperability/`, `{{learn}}/topics/the-big-picture/what-is-a-credential/`, `{{learn}}/topics/the-big-picture/what-is-a-digital-wallet/`, `{{pilot}}/overview/`
- Glossary terms: terms box: Credential|Issuer|Relying Party
- Shortcodes in content: `[fides_learn_terms]`
- Notes: Row descriptions are short and are shown in the hub list; two rows (verified vs judgement; documents vs reusable information) are previews without article. The 'Terms you will meet' box uses `[fides_learn_terms]`.

### What is a digital wallet?

- Route: `topics/the-big-picture/what-is-a-digital-wallet`; content file `learn/content/what-is-a-digital-wallet.html`; kind `article`.
- Title: What is a digital wallet?; eyebrow: Explainer · The big picture
- Excerpt (160 characters): A digital wallet can help a person or organisation receive, manage and share information. What it can do depends on the wallet and the services connected to it.
- Editorial sources (field `sources`, one `Label | URL` per line; translate the labels, never the URLs, keep percent-encoding): FIDES · Personal wallets; FIDES · Business wallets; European Commission · EUDI Regulation; European Commission · European Business Wallets
- Closing band: title "See wallets in use"; text "Browse use cases, then follow the connections to the wallets involved."; button "Explore use cases" -> `{{pilot}}/overview/`.
- Body: 6 level-2 headings, 2 level-3 headings, 14 paragraphs, 6 list items.
- Headings: What might a wallet hold?; How does sharing work?; Personal wallets and business wallets; Are all wallets compatible?; What about the EUDI Wallet and the European Business Wallet?; Continue learning; (h3) Learn more; (h3) Explore in the catalogs
- Links (tokens, resolved per site): `{{glossary}}`, `{{learn}}/topics/for-businesses/accepting-information-from-a-wallet/`, `{{learn}}/topics/for-businesses/business-wallets-where-to-start/`, `{{learn}}/topics/for-businesses/european-business-wallet/`, `{{learn}}/topics/for-businesses/issuing-credentials-for-wallets/`, `{{learn}}/topics/the-big-picture/eudi-wallet-and-european-business-wallet/`, `{{learn}}/topics/the-big-picture/european-digital-identity-wallet/`, `{{learn}}/topics/the-big-picture/formats-and-protocols/`, `{{learn}}/topics/the-big-picture/how-credentials-connect/`, `{{learn}}/topics/the-big-picture/what-is-a-credential/`, `{{pilot}}/business-wallets/`, `{{pilot}}/personal-wallets/`
- Glossary terms: inline terms: Wallet, Credential, Holder, Selective Disclosure, Relying Party, European Digital Identity Wallet, European Business Wallet
- Shortcodes in content: `[fides_learn_term]`
- Notes: Illustrative examples are marked as such in the text and in the closing note ("Content last checked: 11 November 2026"); translate the date format (11 november 2026) consistently. Source labels and bullet lists are separate strings.
- Popup note: "European Business Wallet" opens the glossary definition; pilot shows the cautious wording of glossary 1.12.2 (merged to main; live follows through the aggregate cache of about one hour). Translating the definition needs the glossary, not Learn.

### What is a credential? And what is an attestation?

- Route: `topics/the-big-picture/what-is-a-credential`; content file `learn/content/what-is-a-credential.html`; kind `article`.
- Title: What is a credential? And what is an attestation?; eyebrow: Explainer · The big picture
- Excerpt (160 characters): A credential can help someone provide information that another party can check. In Europe, some digital credentials are described as attestations of attributes.
- Editorial sources (field `sources`, one `Label | URL` per line; translate the labels, never the URLs, keep percent-encoding): W3C · Verifiable Credentials Data Model 2.0; Regulation (EU) 2024/1183 (EUR-Lex); European Commission · Questions and answers on trust services under the European digital identity regulation; FIDES · Credential Types; European Commission · European Business Wallets
- Closing band: title "See credential types in practice"; text "Browse the credential types listed in the FIDES Explorer."; button "Browse credential types" -> `{{pilot}}/credentials/`.
- Body: 8 level-2 headings, 2 level-3 headings, 22 paragraphs, 12 list items.
- Headings: An example; Credential, verifiable credential and credential type; What is an attribute?; What is an attestation of attributes?; What is PID?; Does every wallet credential have the same status?; Where do schemas and formats fit?; Continue learning; (h3) Learn more; (h3) Explore in the catalogs
- Links (tokens, resolved per site): `{{glossary}}`, `{{learn}}/topics/for-businesses/accepting-information-from-a-wallet/`, `{{learn}}/topics/for-businesses/european-business-wallet/`, `{{learn}}/topics/for-businesses/issuing-credentials-for-wallets/`, `{{learn}}/topics/the-big-picture/eudi-wallet-and-european-business-wallet/`, `{{learn}}/topics/the-big-picture/european-digital-identity-wallet/`, `{{learn}}/topics/the-big-picture/formats-and-protocols/`, `{{learn}}/topics/the-big-picture/how-credentials-connect/`, `{{learn}}/topics/the-big-picture/trust-and-interoperability/`, `{{learn}}/topics/the-big-picture/what-is-a-digital-wallet/`, `{{pilot}}/credentials/`, `{{pilot}}/overview/`, `{{start}}/receive/`
- Glossary terms: inline terms: Credential, Verifiable Credential, Credential Type, vct, Electronic Attestation of Attributes, Qualified Electronic Attestation of Attributes, Credential Format
- Shortcodes in content: `[fides_learn_term]`
- Notes: Illustrative examples are marked as such in the text and in the closing note ("Content last checked: 11 November 2026"); translate the date format (11 november 2026) consistently. Source labels and bullet lists are separate strings.

### How credentials connect issuers, wallets and services (roles)

- Route: `topics/the-big-picture/how-credentials-connect`; content file `learn/content/how-credentials-connect.html`; kind `article`.
- Title: How credentials connect issuers, wallets and services; eyebrow: Explainer · The big picture
- Excerpt (143 characters): A simple example explains the roles: a training provider issues a qualification, its recipient keeps it in a wallet, and an employer checks it.
- Editorial sources (field `sources`, one `Label | URL` per line; translate the labels, never the URLs, keep percent-encoding): FIDES · Verifiable Credentials; W3C · Verifiable Credentials Data Model 2.0; Germany · EUDI Wallet ecosystem
- Closing band: title "See the roles in practice"; text "Browse use cases, then follow the connections to issuers, wallets and services."; button "Explore use cases" -> `{{pilot}}/overview/`.
- Body: 7 level-2 headings, 2 level-3 headings, 11 paragraphs, 13 list items.
- Headings: Follow the information; The issuer provides the credential; The holder receives and presents it; The receiving service checks it; The roles can differ; Try it in your context; Continue learning; (h3) Learn more; (h3) Explore in the catalogs
- Links (tokens, resolved per site): `{{learn}}/topics/for-businesses/accepting-information-from-a-wallet/`, `{{learn}}/topics/for-businesses/business-wallets-where-to-start/`, `{{learn}}/topics/for-businesses/issuing-credentials-for-wallets/`, `{{learn}}/topics/the-big-picture/formats-and-protocols/`, `{{learn}}/topics/the-big-picture/trust-and-interoperability/`, `{{learn}}/topics/the-big-picture/what-is-a-credential/`, `{{learn}}/topics/the-big-picture/what-is-a-digital-wallet/`, `{{pilot}}/credentials/`, `{{pilot}}/personal-wallets/`, `{{start}}/receive/`
- Glossary terms: inline terms: Issuer, Holder, Relying Party
- Shortcodes in content: `[fides_learn_term]`, `[fides_learn_usecase]`
- Notes: Illustrative examples are marked as such in the text and in the closing note ("Content last checked: 11 November 2026"); translate the date format (11 november 2026) consistently. Source labels and bullet lists are separate strings.
- Contains a live use case card (`[fides_learn_usecase]`): title, organisation and production sentence come from the catalog record (English data; a Dutch card needs the record to be translated or the sentence accepted as English). The paragraph above the card is editorial text.

### Issuing credentials for wallets (roles, optional in first route)

- Route: `topics/for-businesses/issuing-credentials-for-wallets`; content file `learn/content/issuing-credentials-for-wallets.html`; kind `article`.
- Title: Issuing credentials for wallets; eyebrow: Explainer · For businesses
- Excerpt (161 characters): How can your organisation provide information that others can check and use? Start with a purpose, the source of the information and the parties that rely on it.
- Editorial sources (field `sources`, one `Label | URL` per line; translate the labels, never the URLs, keep percent-encoding): FIDES · Verifiable Credentials; European Commission · EUDI Regulation; Regulation (EU) 2024/1183 (EUR-Lex); Germany · EAA provider onboarding (developer guide)
- Closing band: title "See credential types in practice"; text "Browse the credential types listed in the FIDES Explorer to see what existing types describe."; button "Browse credential types" -> `{{pilot}}/credentials/`.
- Body: 7 level-2 headings, 2 level-3 headings, 17 paragraphs, 15 list items.
- Headings: What does an issuer do?; Start with a purpose; Where does the information come from?; What do recipients and relying parties need to know?; What about EUDI Wallets?; Build, use existing software or work with a provider?; Continue learning; (h3) Learn more; (h3) Explore in the catalogs
- Links (tokens, resolved per site): `{{glossary}}`, `{{learn}}/topics/for-businesses/accepting-information-from-a-wallet/`, `{{learn}}/topics/the-big-picture/european-digital-identity-wallet/`, `{{learn}}/topics/the-big-picture/formats-and-protocols/`, `{{learn}}/topics/the-big-picture/how-credentials-connect/`, `{{learn}}/topics/the-big-picture/what-is-a-credential/`, `{{learn}}/topics/the-big-picture/what-is-a-digital-wallet/`, `{{pilot}}/business-wallets/`, `{{pilot}}/overview/`, `{{pilot}}/personal-wallets/`
- Glossary terms: inline terms: Issuer, Holder, Relying Party, Electronic Attestation of Attributes
- Shortcodes in content: `[fides_learn_term]`
- Notes: Illustrative examples are marked as such in the text and in the closing note ("Content last checked: 11 November 2026"); translate the date format (11 november 2026) consistently. Source labels and bullet lists are separate strings.

### Accepting information from a wallet (roles, optional in first route)

- Route: `topics/for-businesses/accepting-information-from-a-wallet`; content file `learn/content/accepting-information-from-a-wallet.html`; kind `article`.
- Title: Accepting information from a wallet; eyebrow: Explainer · For businesses
- Excerpt (152 characters): What does your organisation need to receive and check? What a relying party asks for, what to check and where the decision stays with your organisation.
- Editorial sources (field `sources`, one `Label | URL` per line; translate the labels, never the URLs, keep percent-encoding): European Commission · EUDI Regulation; Regulation (EU) 2024/1183 (EUR-Lex); Germany · Relying-party onboarding (developer guide)
- Closing band: title "Look at your own service"; text "Work through one process with your team in the Wallet Readiness Workshop."; button "View the workshop" -> `{{learn}}/sessions/wallet-readiness-workshop/`.
- Body: 7 level-2 headings, 2 level-3 headings, 19 paragraphs, 20 list items.
- Headings: Start with the service; What does a relying party do?; What needs to be checked?; How does the person share the information?; What about the EUDI Wallet?; Prepare for a first discussion; Continue learning; (h3) Learn more; (h3) Explore in the catalogs
- Links (tokens, resolved per site): `{{learn}}/topics/for-businesses/issuing-credentials-for-wallets/`, `{{learn}}/topics/the-big-picture/european-digital-identity-wallet/`, `{{learn}}/topics/the-big-picture/formats-and-protocols/`, `{{learn}}/topics/the-big-picture/how-credentials-connect/`, `{{learn}}/topics/the-big-picture/what-is-a-credential/`, `{{learn}}/topics/the-big-picture/what-is-a-digital-wallet/`, `{{pilot}}/business-wallets/`, `{{pilot}}/credentials/`, `{{pilot}}/overview/`, `{{pilot}}/personal-wallets/`, `{{start}}/receive/`
- Glossary terms: inline terms: Relying Party, Verifier, Credential Status
- Shortcodes in content: `[fides_learn_term]`
- Notes: Illustrative examples are marked as such in the text and in the closing note ("Content last checked: 11 November 2026"); translate the date format (11 november 2026) consistently. Source labels and bullet lists are separate strings.

## Glossary terms used by the first route

Wallet, Credential, Verifiable Credential, Credential Type, vct, Credential Format, Holder, Issuer, Relying Party, Verifier, Credential Status, Selective Disclosure, Electronic Attestation of Attributes (EAA), Qualified Electronic Attestation of Attributes (QEAA), European Digital Identity Wallet, European Business Wallet. All ids are from glossary 1.12.0/1.12.1. The popup label is a string in the page; the definition is data and is English only. Decision of 14 November 2026: definitions stay English for now and the glossary translation round is parked (see `nl-known-english-remains.md`); the alternative, Dutch definitions in the glossary data, is a data and plugin change outside Learn.

## Checks after translating

- `/nl/` and the anchors of each page answer 200; the language switcher keeps the route (see `tests/run-nl-links-checks.sh`).
- Links inside translated paragraphs keep their tokens and `/nl/` base; no `localhost` or port in stored content.
- Source URLs keep `%3A`-style encoding; sources and CTA fields are translated field by field.
- The popup, "On this page" and "Terms in this article" blocks work in Dutch; no horizontal overflow at 1440 and 390.
- Hash protection: translation rows live in the TranslatePress dictionary, not in the seeded page content, so seeding an updated English page does not overwrite them, but changed English strings create new untranslated rows.
