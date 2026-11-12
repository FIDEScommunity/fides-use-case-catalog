# Dutch terminology for the Learn route

Working agreements of 12 November 2026 (source: the owner's terminology note, kept outside the repo). The English source text
stays leading; check every term in its context. The glossary itself is **not** revised yet and is out of scope for this
document.

## Terms

| English | Dutch in Learn | Use |
|---|---|---|
| relying party | vertrouwende partij (relying party) | Give both terms at the first explanation, afterwards "vertrouwende partij". A party that receives information is not in every context a relying party; where it fits use "ontvangende organisatie" or "dienst". |
| issuer | uitgever (issuer) | Add the English term at first use where useful, afterwards "uitgever". A wallet provider is not automatically the issuer of a credential. |
| holder | houder (holder) | Optionally add the English term at first use; otherwise "houder", or "wallethouder" where that clarifies the role. |
| verifier | verifier | Keep the common English term and explain whether the checking party or the software is meant. A verifier is not automatically the same party as the relying party. |
| credential | credential | Explain at first use as digital data or proof, depending on the context. Not every credential is an identity document. |
| attestation of attributes | attestatie van attributen | Keep EAA and QEAA; do not treat every credential as an EAA or QEAA. |
| wallet | wallet | At first use "digitale wallet" if needed. Keep "business wallet" and "EUDI Wallet" as common names. |
| wallet provider | walletaanbieder | Use when the provider of the wallet is meant. |
| mandate | mandaat | Use "mandaat" when it is about the authority to act on behalf of someone else; clarify the scope where needed. |
| selective disclosure | selectief gegevens delen | Explain the English term when it matters to the reader. |

Names of the offering stay English: **Wallet Introduction**, **Wallet Readiness Workshop**, **EUDI & Business Wallets in
Practice**. The topic name **EUDI Wallet Readiness** stays English for now. Do not translate these in the TranslatePress
editor.

## Working with the translations

- Translate or correct in the TranslatePress editor (`/nl/...?trp-edit-translation=true`), then run
  `wp eval-file learn/nl-translations-transfer.php export` and review `git diff learn/nl-translations.json`
  (see `learn/README.md`, "Dutch translations (TranslatePress)").
- A staging row that already holds an older term is **not** changed by `import-apply` (existing translations are never
  overwritten). Corrections there are made in the staging editor from a reviewed list; the changes of each package are listed in
  `learn/nl-translation-changes-2026-11-12.md` (source, old, new).
- Sentence openers with an article ("De houder", "Een schema") are one string with the term, link or bold text; decide the
  article per phrase (see `learn/README.md`, "Fragments").
- `tests/nl-terminology-checks.cjs` checks the agreed terms on the Dutch route (1440 and 390 px).

## Open deviations (found 12 November 2026, **not** changed, proposals only)

The author only found one kind of correction that follows unambiguously (relying party), and the owner had already made it
locally (18 rows changed, "ontvangende partij" no longer occurs on the route). What remains differs from the agreements:

| English source | Dutch now | Proposal | Why |
|---|---|---|---|
| What do recipients and relying parties need to know? | Wat moeten ontvangers weten? | Wat moeten ontvangers en vertrouwende partijen weten? | "relying parties" is missing in the Dutch sentence |
| The issuer / An issuer (sentence openers, "How credentials connect", "Issuing credentials") | De issuer / Een issuer | De uitgever / Een uitgever | "uitgever" after first use; the same articles say "uitgever" in running text. These two rows were authored by the pilot tooling, the owner decides |
| How credentials connect issuers, wallets and services; Browse use cases, then follow the connections to issuers, wallets and services.; Can create and issue new credentials ... (issuer role). | ... issuers ...; ... issuers ...; (issuer-rol) | uitgevers / (rol van uitgever) | mixed English and Dutch for the same role; first use may keep "(issuer)" |
| The wallet holder needs to understand what they are receiving and when they may use it. | De walletgebruiker moet begrijpen ... | De wallethouder ... | "holder" is "houder"/"wallethouder"; "walletgebruiker" is used elsewhere for "wallet user", a different role label |
| Organisation data, mandates, business wallets and data exchange. | Organisatiegegevens, bevoegdheden, business wallets ... | Organisatiegegevens, mandaten, business wallets ... | "mandate" is "mandaat" (the running text already uses "mandaten") |
| Mandate (term chip, row empty) | English | Mandaat | glossary term; the row is shared with the glossary page, so it is a decision for the owner |
| IETF SD-JWT..., ISO (18013-5) ..., "selectively reveal" | geselecteerde gegevens delen / tonen | selectief gegevens delen (term explained once) | agreed Dutch term for selective disclosure |
| Glossary page (out of scope) | uses "machtiging" for mandate, Relying Party chips stay English | align when the glossary is revised | not part of this round |

"ontvangende organisatie" and "ontvangende dienst" remain on the route in the general sense (a service or organisation that
receives information, for example "De ontvangende dienst controleert de gegevens"); that matches the agreements.
