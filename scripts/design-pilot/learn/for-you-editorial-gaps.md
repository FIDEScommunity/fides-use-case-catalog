# For you: deviations and open points for the editors (12 November 2026)

The overview `topics/for-you/` and three articles exist (series `for-you`, Previous/Next). Source: the concept texts "Learn - For you"
(Codex project, `learn-for-you-concepten.md`). The texts are taken over word for word, except for the points below.

## Deviations from the concepts

| Where | Deviation | Reason |
|---|---|---|
| Overview | The concept heading "A wallet for your digital information" is not shown; its paragraph is the manifest excerpt and appears as the lead under the page title "For you". | The Learn section template shows the excerpt as the one intro; repeating it with a heading would duplicate the text. |
| Overview | "Start with a question" and "Explore further" are headings with a row list and a plain list. The row for the existing article is titled "The European Digital Identity Wallet" (concept: bold item title) and links to `topics/the-big-picture/european-digital-identity-wallet`. | Template: rows are links with a description; the existing article is titled "European Digital Identity Wallet". |
| Overview | No "Terms you will meet" panel. | The concept names none; the glossary is not extended. |
| Articles | The concept subheadings (`###`) are H2 sections; the closing "Continue learning" list is split into "Learn more" (Learn articles) and "Explore in the catalogs" ("Browse personal wallets"). | Template used by the other articles; the checks expect these two groups. |
| Articles | Each article ends with the standard note: "The examples are illustrative. What a wallet can do differs per wallet and credential. Content last checked: 12 November 2026. ..." | The concept preface says examples are illustrative and functionality differs per wallet; the last-checked line follows the other Learn pages. |
| Article 1 and 2 | The first mention of "issuer" and "relying party" is a glossary term chip. | Existing glossary terms (Issuer, Relying Party); glossary not changed. |
| Article 3 | In "Compare available wallets", "personal wallet catalog" is a link to `/fides-design-pilot/personal-wallets/`. "Learn more" has only two items (What is a digital wallet?, European Digital Identity Wallet) plus "Browse personal wallets" under the catalogs. | The concept lists exactly these three links. |
| Sources | The concept lists three sources in one block. They are assigned per article in the form "Organisation · Title": W3C VC Data Model 2.0 to articles 1 and 2; EC Selective disclosure and EC European Digital Identity Wallet to article 2; EC European Digital Identity Wallet to article 3. The overview has no sources. | The sources field is per article. Titles follow the existing wording ("Selective disclosure of attributes in the EUDI Wallet" as on the holder article; the concept wrote "Selective disclosure of attributes"). Which source belongs to which article is an editorial choice. |
| Sources | The concept's closing note ("check provider-dependent functionality ... at publication") is not shown as page text; it is part of this file and of the page note ("Check the provider and the current European and national situation before relying on a feature."). | It was an instruction to editors, not reader text. |

## Destinations

- Linked: What is a digital wallet?, What is a credential? And what is an attestation?, How credentials connect issuers, wallets and services, European Digital Identity Wallet, The holder, The relying party, the personal wallet catalog.
- Not linked and not named in the concepts: Browse issuers, Browse relying parties, interop profiles and matrix (not available in the pilot).
- Missing as dedicated pages: nothing the concepts name is missing. Proposal for later: a page on wallet recovery and backup per provider, and a short page for the person who acts for someone else; the concept deliberately names no wallet products.

## To do

- Source URLs were checked on 12 November 2026 (all three answered 200). Recheck before staging, together with the current European and national situation.
- Statements about EUDI Wallet user control (article 2) follow the concept; they rest on the EC selective disclosure page and the EUDI Wallet factpage. No individual wallet functionality is stated.
- A staging page an editor changed is skipped by the seed (also in dry-run). Existing pages that gained a link: Topics (the For you row), What is a digital wallet?, What is a credential? and The holder; add the link by hand when staging holds an edited copy (see `staging/UPDATE-PLAN-NL-LEARN.md`).
- The personal wallet catalog page has no link back to Learn; this is outside the Learn seed and was not changed.
- Dutch proposals: `learn/nl-translation-changes-for-you.md` (not seeded).
