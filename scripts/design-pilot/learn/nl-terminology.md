# Dutch terminology for the Learn route

Working agreements of 12 November 2026 (source: the owner's terminology note, kept outside the repo). The English source text
stays leading; check every term in its context. The glossary itself is **not** revised yet and is out of scope for this
document.

## Terms

| English | Dutch in Learn | Use |
|---|---|---|
| relying party | vertrouwende partij (relying party) | Give both terms at the first explanation, afterwards "vertrouwende partij". A party that receives information is not in every context a relying party; where it fits use "ontvangende organisatie" or "dienst". |
| issuer | uitgever (issuer) | "uitgever (issuer)" at the first explanation per page (the first prose mention; headings, titles, diagram labels, cards and glossary popups do not count), afterwards "uitgever". Never "de issuer", "een issuer", "issuers" or "issuer-rol" in running Dutch text. Proper names stay English: Issuer Catalog, "Credential Issuer" in OpenID4VCI terms, offering names. A wallet provider is not automatically the issuer of a credential. |
| holder | houder (holder) | Optionally add the English term at first use; otherwise "houder". "wallethouder" where the holder role of the credential model is meant (the party that receives and holds the credential). "walletgebruiker" where the person or organisation that uses a wallet is meant ("wallet user"). Decide per context. |
| verifier | verifier | Keep the common English term and explain whether the checking party or the software is meant. A verifier is not automatically the same party as the relying party. |
| credential | credential | Explain at first use as digital data or proof, depending on the context. Not every credential is an identity document. |
| attestation of attributes | attestatie van attributen | Keep EAA and QEAA; do not treat every credential as an EAA or QEAA. |
| wallet | wallet | At first use "digitale wallet" if needed. Keep "business wallet" and "EUDI Wallet" as common names. |
| wallet provider | walletaanbieder | Use when the provider of the wallet is meant. |
| verify | controleren (verify) | Editorial decision of 13 November 2026. First explanation: "controleren (verify)" (for example the label "Controleren (verify):" in the list on "Issuing public information to wallets", and "controledienst (verify)" in the Article 45e paragraph); as a short label "Controleren". Keep "(verify)" where it helps the link with the GBO design. A verifier (the checking party or software) stays "verifier". |
| retrieve | ophalen (retrieve) | Same decision. First explanation: "ophalen (retrieve)" (label "Ophalen (retrieve):"); short label "Ophalen". |
| EUDI Wallet | EUDI Wallet | The name stays as it is. |
| role chips | Houder, Vertrouwende partij, Walletaanbieder, Authentieke bron | The visible chips Holder, Relying Party, Wallet Provider and Authentic Source are Dutch since 13 November 2026 (the chip "Issuer" was already "Uitgever"). Global TranslatePress rows: see "Shared-row effects" in `nl-translation-changes-repair-round-2026-11-13.md`. The glossary definitions are unchanged. |
| mandate | mandaat | Use "mandaat" where mandates (mandate credentials) are meant. "bevoegdheid" stays for authority or permission in general; the two are different concepts and are not replaced automatically. A sentence that could mean both is left and reported. The term chip "Mandate" stays English. |
| trust framework | trust framework | Use "trust framework" in Dutch running text, headings and row titles; it is the common term in this field and keeps the Dutch text aligned with the English source. Where it helps the reader, explain it once with "afsprakenstelsel" (for example "trust frameworks (afsprakenstelsels)"). The two terms overlap: an "afsprakenstelsel" can be more precise in a specific Dutch context (for example a national or sector scheme with agreed rules for participants), so let the context decide which term is clearest. Plural: "trust frameworks". Not "trustframeworks" or "vertrouwenskaders". Where the existing Dutch already says "afsprakenstelsel(s)", it is not changed automatically. |
| selective disclosure | selectief gegevens delen | For the function or concept. "geselecteerde gegevens" stays where the data that was chosen is meant. Explain the English term when it matters to the reader. |

Names of the offering stay English: **Wallet Introduction**, **Wallet Readiness Workshop** (also in titles, cards and catalogue records; in running text "de workshop" is allowed where repeating the name on the same page reads awkwardly; the lowercase link text "readiness workshop" stays English), **EUDI & Business Wallets in
Practice**. The topic name **EUDI Wallet Readiness** stays English for now. Do not translate these in the TranslatePress
editor.

## Working with the translations

- Translate or correct in the TranslatePress editor (`/nl/...?trp-edit-translation=true`), then run
  `wp eval-file learn/nl-translations-transfer.php export` and review `git diff learn/nl-translations.json`
  (see `learn/README.md`, "Dutch translations (TranslatePress)").
- A staging row that already holds an older term is **not** changed by `import-apply` (existing translations are never
  overwritten). Corrections there are made in the staging editor from a reviewed list; the changes of each package are listed in
  `learn/nl-translation-changes-2026-11-12.md` and `learn/nl-translation-changes-2026-11-12-b.md` (source, old, new).
- Sentence openers with an article ("De houder", "Een schema") are one string with the term, link or bold text; decide the
  article per phrase (see `learn/README.md`, "Fragments").
- `tests/nl-terminology-checks.cjs` checks the agreed terms on the Dutch route (1440 and 390 px).

## Terminology round 2 (12 November 2026, applied locally)

21 rows were corrected locally with `wp eval-file learn/nl-translations.php correct` (list `$corrections` in that file; a row is only
rewritten while it still holds the expected old Dutch; localhost only; a second run changes nothing). Source, old and new Dutch per
row, plus the routes and the reason: `learn/nl-translation-changes-2026-11-12-b.md`.

| Correction | Rows | Result |
|---|---|---|
| 1. Heading "What do recipients and relying parties need to know?" | 1 | "Wat moeten ontvangers en vertrouwende partijen weten?" |
| 2. Issuer | 15 | "uitgever (issuer)" at the first prose mention per page; "De issuer"/"Een issuer"/"issuers"/"issuer-rol" replaced by "uitgever(s)"/"uitgeversrol" |
| 3. Holder / user | 1 | "De wallethouder moet begrijpen ..." (holder role). "walletgebruiker" stays for "wallet user" |
| 4. Mandate | 1 | "Organisatiegegevens, mandaten, business wallets ..." (mandate credentials). All "bevoegdheid" for authority stay |
| 5. Selective disclosure | 2 | "selectief gegevens delen" for the concept; "geselecteerde gegevens" stays for the chosen data |
| 6. Readiness workshop | 1 | "In de workshop werkt uw team ..." (second mention on the page); the offering name is unchanged |

Left unchanged on purpose (glossary content is out of scope): the glossary-sourced definitions of mandate ("machtiging",
"bevoegdheid van een persoon"), "(holder-rol)" and "(de rol van verifier)" in the role definitions, and the glossary chips. Details
and the reasoning per place: "Reviewed and left unchanged" in the changes file.

"ontvangende organisatie" and "ontvangende dienst" remain on the route in the general sense (a service or organisation that
receives information, for example "De ontvangende dienst controleert de gegevens"); that matches the agreements.

## Terminology round 3 (13 November 2026, editorial review of the 26 "Tag C" rows)

Decisions (source: `learn-nl-review-26-zinnen.md`): "EUDI Wallet" stays; "controleren (verify)" and "ophalen (retrieve)" at the first
explanation, "Controleren" and "Ophalen" as short labels; the four role chips are Dutch (Houder, Vertrouwende partij, Walletaanbieder,
Authentieke bron); the For you article about sharing from a wallet is titled "Informatie delen vanuit een wallet" everywhere; the practice
question articles use the formal "u" (never "je/jij/jouw"). Row-by-row old and new Dutch, the shared-row effects and the Article 45e check:
`learn/nl-translation-changes-repair-round-2026-11-13.md`. Checks: `tests/nl-repair-round-checks.cjs`.

