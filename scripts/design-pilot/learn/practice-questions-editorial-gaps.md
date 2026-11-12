# Practice questions for organisations: sources, deviations and open points for the editors (12 November 2026)

Three articles under `topics/for-businesses/` (no series, so no Previous/Next): source is the concept text
"Learn - vervolg: praktijkvragen voor organisaties" (Codex project, `learn-vervolg-praktijkvragen.md`). All source URLs below were
fetched or requested on **12 November 2026** (`curl`, status below 400 unless stated). The checks in
`tests/practice-questions-checks.cjs` repeat the status test for every source and content link (403/429 would be a warning; none
occurred).

## Placement

| Article | Place | Reason |
|---|---|---|
| How can someone act for an organisation? | `topics/for-businesses/how-can-someone-act-for-an-organisation` (menu order 6) | The For businesses overview already named "Company identity and representation" as an unlinked placeholder row with the description "Separate the organisation, its representatives and their authority." This article fills that row. |
| How can an organisation prepare a wallet use case? | `topics/for-businesses/how-can-an-organisation-prepare-a-wallet-use-case` (menu order 4) | It is process preparation for an organisation, next to "Business wallets: where to start" and the Readiness Workshop. The concept note asks whether it adds value next to existing pages: it does so only as a general (not business-wallet specific) preparation guide; see the overlap table. |
| What should a service check when receiving a credential? | `topics/for-businesses/what-should-a-service-check-when-receiving-a-credential` (menu order 5) | It follows "Accepting information from a wallet" (acceptance side of For businesses). The Big picture holds generic explainers; this one is an organisational practice question. |

All three are findable from the For businesses overview (row list, one row each) and from one existing article each (back links below).
No new series; the Topics page already links to For businesses and needed no change.

## Article 1: How can someone act for an organisation?

### Sources used

| Source | URL | Used for |
|---|---|---|
| Regulation (EU) 2024/1183 (eIDAS 2), Art. 3(1) and 3(3) as inserted, Annex VI point 9, recital on attestations of attributes | https://eur-lex.europa.eu/eli/reg/2024/1183/oj | Electronic identification can concern "a natural person representing another natural person or a legal person"; "powers and mandates to represent natural or legal persons" is in the Annex VI minimum list (Member States ensure measures so that qualified providers of attestations can verify those attributes against the relevant public-sector authentic source); a recital names them as an example attestation. |
| W3C Verifiable Credentials Data Model 2.0, section 5.9 "Authorization" and the verification/validation terms | https://www.w3.org/TR/vc-data-model-2.0/ | Credentials are meant for reliably identifying subjects; authorisation is not an appropriate use of the data model without an accompanying authorisation framework. |
| Directive (EU) 2025/25, recitals on the digital EU power of attorney and legal representatives in business registers | https://eur-lex.europa.eu/eli/dir/2025/25/oj | Common multilingual template, to authorise a person to represent a company in specific cross-border procedures within the scope of the directive; drawn up under national legal requirements; without prejudice to national rules on powers of attorney; Member States choose whether a specific one must be filed; information on legal representatives is disclosed in business registers. |
| Commission proposal COM(2025) 838 (European Business Wallets), Art. 2 definitions (18) authorised representative and (19) mandate, recital 18, financial statement | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025PC0838 | The proposal defines "mandate" narrowly (authorisation by the wallet owner to an authorised representative to act for the owner in operating the functions of a designated wallet) and aims at compatibility with the digital EU power of attorney. |
| European Commission, European Business Wallets | https://digital-strategy.ec.europa.eu/en/policies/business-wallets | Status page of the proposal (the existing Learn article "European Business Wallet" tracks the legislative status; this page only links to it). |
| EUDI Wallet Architecture and Reference Framework (main chapters 2 and 3, discussion topic I) | https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework | Section 2.6.5 describes a dedicated representation attestation for a natural person representing another natural person; chapter 3 states that wallet units for legal persons were removed in view of a separate business wallet; discussion topic I covers only natural-to-natural representation. |

### Identity, authority, mandate: how the article separates them

- **Identity**: who the person or organisation is. The Regulation lets electronic identification cover a natural person representing a legal person, and the article says only that; it does not claim identification proves authority.
- **Authority (bevoegdheid)**: what the person may do for the organisation. The article names possible origins only as examples ("the rules on a company's legal representatives, the organisation's own rules, a decision of the organisation"), each hedged with "depending on the organisation and the applicable law". The legal-representatives example rests on the Directive 2025/25 recital (representatives are disclosed in business registers).
- **Mandate (mandaat)**: "an authorisation given to someone to act ... can be recorded as a document or as a credential". The article points out that the Business Wallet proposal defines the word more narrowly, and tells the reader to check which meaning a credential or rulebook uses. Consistent with the glossary entry "Power of Representation" ("Not the same as a European Business Wallet Power of Attorney (PoA) or mandate"), no equivalence between the terms is claimed.

### Claims softened, added or left out

| Concept text | What was done | Reason |
|---|---|---|
| "A mandate can describe an authority granted to someone." | Kept, but the new section "Identity, authority and mandate" explains the different uses of the word. | The EBW proposal definition is narrower than a general "authority to represent". |
| "Depending on the arrangement, the relevant information might be provided in a credential or checked through another service." | Kept word for word. | Consistent with Annex VI and the Directive; no source says a credential is required. |
| Nothing in the concept on European sources. | New section "What do European sources say today?" with four bullets, and a closing sentence that acceptance is for the service to decide. | The brief asks to check against primary sources; the article shows what they do and do not say. No statement that a mandate is valid, accepted or sufficient. |
| (not in the concept) | Not stated: that a mandate is "always valid", that a service must accept any attestation, which register is competent, or who may sign in a particular country. | Not supported by the sources; depends on national law. |
| The Directive 2025/25 power of attorney | Limited to "specific procedures with a cross-border dimension" within the directive. | The recital limits it so; a wider reading would be a legal claim. |
| The EBW proposal | Marked "a proposal that is still in the legislative process". Status details stay on the existing European Business Wallet article. | Avoids a second status statement that can go out of date. |
| Page note | "This page does not give legal advice and does not state who may act for an organisation in a given country." | Brief: avoid general legal claims. |

### Not verified or not used

- The ARF discussion text for relying-party registration quotes a draft implementing act with "the power of attorney of a representative of the wallet-relying party". Draft text; not used.
- There is no public EU source that defines "authority to act for an organisation" generally; the article does not try to.
- The Directive page was fetched from EUR-Lex HTML (`CELEX:32025L0025`); the short link `https://eur-lex.europa.eu/eli/dir/2025/25/oj` is what the page shows.

## Article 2: How can an organisation prepare a wallet use case?

### Sources used

| Source | URL | Used for |
|---|---|---|
| W3C Verifiable Credentials Data Model 2.0 (roles issuer, holder, verifier; section 5.11 on format compatibility) | https://www.w3.org/TR/vc-data-model-2.0/ | Roles in an interaction can be performed by different parties; several credential formats exist, so "a shared format alone does not establish that two products will work together" is a cautious reading, not a quotation. |
| Regulation (EU) 2024/1183, recital on private services | https://eur-lex.europa.eu/eli/reg/2024/1183/oj | "Users should be under no obligation to use a European Digital Identity Wallet to access private services" (recital); used for the sentence on people who cannot or do not want to use a wallet. Stated as a recital of the Regulation and for private services only. |
| FIDES, Verifiable Credentials | https://fides.community/topics/verifiable-credentials/ | Background for the roles (existing source on neighbouring Learn pages). |

### Changes

| Concept text | What was done | Reason |
|---|---|---|
| Intro paragraph | Used unchanged as the manifest excerpt (the lead under the title). | Template: the excerpt is the single lead. |
| "Consider people who cannot or do not want to use a wallet ..." | Kept, plus one sentence with the recital. | Source for the statement. |
| (not in the concept) | One added paragraph in "Choose one interaction": this article is about preparing any wallet use case; a business starting from its own wallet goes to "Business wallets: where to start"; an organisation that mainly receives information goes to "Accepting information from a wallet". | Overlap with those articles (see table), so the reader can choose. |
| "Continue learning" | Concept list kept: five Learn pages (including "Wallet Readiness Workshop" under Learn more, since it is a Learn page) and "Explore use cases" under the catalogs. | Template groups. |
| Call to action | "Look at your own process" button to the Wallet Readiness Workshop, as on "Accepting information from a wallet". | Existing pattern; the concept links the workshop. |

## Article 3: What should a service check when receiving a credential?

### Sources used

| Source | URL | Used for |
|---|---|---|
| W3C Verifiable Credentials Data Model 2.0: terms verification and validation, 4.9 Validity Period, 4.10 Status, Appendix on presenter/subject | https://www.w3.org/TR/vc-data-model-2.0/ | Verification: authentic and current statement of the issuer; securing mechanism satisfied; status check succeeds "if present"; validity period (`validFrom`/`validUntil`); verifying a credential does not imply the claims are true; the verifier validates against its own rules after evaluating issuer, proof, subject and claims; checks that the presenter is the subject depend on the securing mechanism. |
| Regulation (EU) 2024/1183: Art. 5b (relying parties), qualified attestations of attributes (revocation) | https://eur-lex.europa.eu/eli/reg/2024/1183/oj | A relying party that relies on EUDI Wallets registers in its Member State, states the intended use incl. the data it will request, may not request other data, identifies itself to the user and is responsible for authenticating and validating the data (Art. 5b(1), (2), (3), (8), (9)); a revoked qualified attestation loses validity from revocation. |
| European Commission, Selective disclosure of attributes in the EUDI Wallet | https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/949256476/What%2Bis%2Bselective%2Bdisclosure%2Bof%2Battributes | Selective disclosure of attributes (already used on the holder and sharing articles). |

### Changes

| Concept text | What was done | Reason |
|---|---|---|
| "Check the credential" paragraphs | Kept word for word; two sentences added: the W3C definition of verification (with the glossary chip Credential Status) and the Regulation rule on revoked qualified attestations. | Primary sources; kept hedged ("where a status mechanism is provided"). |
| "Decide whether the information is enough" | Kept; one added sentence that W3C draws the same distinction. | Source for the claim "a valid credential can contain information that does not meet requirements". |
| "A service may also need to determine whether the person presenting is entitled to use it" | Kept; one added sentence that acting for an organisation is a separate question, linking article 1. | Prevents the reader from mixing holder binding with authority. |
| "Make the request clear" | Kept; one added paragraph on the EUDI relying-party rules (Art. 5b). | Concrete, source-backed; stated only for European Digital Identity Wallets. |
| ARF status lists | Not stated on the page. | The ARF trust model says relying parties can use trust anchors to verify status/revocation lists for PIDs and (Q)EAAs; the page keeps the format-neutral W3C wording to avoid implying one mechanism. Available if the editors want it. |

## Overlap with existing Learn content

### Article 1 (acting for an organisation)

| Existing page | Overlap | Contradiction |
|---|---|---|
| Business wallets: where to start | Section "Separate identity from authority" says the same in one paragraph and links the glossary terms Representation rights and Mandate. The new article is the full treatment; where-to-start now links to it (back link). | None. |
| For businesses overview | The panel "Who is allowed to act for your organisation?" frames the same question. | None. |
| European Business Wallet | Mentions mandates only as a topic of the proposal. The new article explains that the proposal uses the word narrowly. | None; the new article refers to that page for status. |
| The relying party (Ecosystem roles) and For governments articles | The relying party checks and decides; no statement on representation. | None. |
| Readiness Workshop | The workshop can discuss roles and governance; nothing on representation. | None. |

### Article 2 (preparing a wallet use case)

| Existing page | Overlap | Contradiction |
|---|---|---|
| Business wallets: where to start | Strong: "Start with one transaction", "Identify the roles", "Prepare a small first step" repeat the idea. The new article is general (not business-wallet specific), has the employer qualification example and the "practical arrangements" section. | None; the article tells the reader which to read first. |
| Accepting information from a wallet | "Start with the service" and "Prepare for a first discussion" overlap with the "Choose one interaction" section. | None. |
| Issuing credentials for wallets | "Start with a purpose" and the closing paragraph (one credential, one use, discuss with a holder and a relying party) overlap. This page links to the new article (back link). | None. |
| Wallet Readiness Workshop | The "Discuss" and "Test assumptions" parts are what the workshop does with a team. Called out by the CTA, not repeated. | None. |
| Editorial recommendation | The article overlaps a lot with where-to-start. Editors may decide to merge the practical-arrangements section into where-to-start and drop this page; the page is kept because the user asked for it. | n/a |

### Article 3 (checking a received credential)

| Existing page | Overlap | Contradiction |
|---|---|---|
| Accepting information from a wallet | Strong: "What needs to be checked?" lists the same checks (issuer accepted, altered, validity, status, presenter, sufficiency). The new article shows the checks in the language of the specification, adds the Art. 5b rules and the "valid is not enough" example; accepting now links to it (back link). | None. |
| The relying party (Ecosystem roles; **dirty in the working tree from the translation agent, not touched**) | "Verifier performs technical checks, relying party uses the information". | None. |
| For governments: accepting information in public services | Same checks in a public-service context. | None. |
| Trust and interoperability | Trust anchors and trust framework. The new article does not cover trust anchors. | None. |
| What is a credential? | Validity and status as concepts. | None. |

## Links and destinations

- Existing destinations used: Learn articles (business wallets, European Business Wallet, how credentials connect, accepting, issuing, formats and protocols, trust and interoperability, what is a credential, the relying party), Wallet Readiness Workshop session page, catalogs `/fides-design-pilot/overview/` (use cases), `/credentials/`, `/business-wallets/`. All answer 200 (checked in `tests/practice-questions-checks.cjs`).
- Not linked, no destination in the pilot: Browse issuers, Browse relying parties (`/issuer-catalog/`, `/relying-party-websites/` exist only on the full site), interop profiles and matrix (404 in the pilot). The concept names none of them except "Browse business wallets" and "Browse credential types", which exist.
- Organisation catalog: the concept names none; no link added.
- The article "Browse business wallets" is only on article 1; articles 2 and 3 use "Explore use cases" and "Browse credential types" as in the concept.

## Existing pages changed (staging risk)

| Page | Change | If staging holds an edited copy |
|---|---|---|
| `topics/for-businesses` | Three new rows; the unlinked row "Company identity and representation" became the linked row "How can someone act for an organisation?" (same description). | The seed skips an edited page: add the three rows by hand. |
| `topics/for-businesses/business-wallets-where-to-start` | Learn more: "How can someone act for an organisation?" | Add by hand. |
| `topics/for-businesses/accepting-information-from-a-wallet` | Learn more: "What should a service check when receiving a credential?" | Add by hand. |
| `topics/for-businesses/issuing-credentials-for-wallets` | Learn more: "How can an organisation prepare a wallet use case?" | Add by hand. |

Not changed on purpose: Ecosystem roles and For governments pages (including the working-copy edit of `the-relying-party.html` by the
translation agent), Topics, the glossary, tiles, interop profiles.

## Dutch

- Proposals only, `learn/nl-translation-changes-practice-questions.md`; nothing is seeded or entered in TranslatePress.
- The overview row title "Company identity and representation" no longer exists in English (the row now carries the article title). The existing Dutch row in `nl-translations.json` for that string is now unused; it can stay. The row description is unchanged, so its translation still applies.
- Terminology: "mandaat" for mandate, "bevoegdheid" for authority (see `learn/nl-terminology.md`); the proposal keeps these apart.

## Open points

- Recheck the European Business Wallet proposal status and the national situation before staging; the article only says "still in the legislative process".
- Legal review of the section "What do European sources say today?" is advisable before publishing on the live site (four sources, no legal conclusion).
- Menu order 4 to 6 is only used for lists; the overview row order is: where to start, European Business Wallet, prepare, accepting, issuing, check, act.
