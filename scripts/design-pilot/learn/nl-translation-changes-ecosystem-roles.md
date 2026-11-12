# Dutch proposals: Ecosystem roles overview (12 November 2026)

**Entered 12-13 Nov 2026 (local pilot):** the rows of this proposal that match the current English were entered in `learn/nl-translations.php` and exported (see `learn/nl-translation-changes-roles-governments-2026-11-12.md` for the entered Dutch and its source tag, and `learn/nl-translation-open-for-governments-roles.md` for what is still a proposal). The status line below describes the state before entry.

**Status: proposal only.** Nothing here is seeded, imported or written to `learn/nl-translations.json` / `nl-translations.php`.
Existing translations are not changed. Translate in the TranslatePress editor
(`/nl/fides-design-pilot/learn/topics/ecosystem-roles/?trp-edit-translation=true`) after review, then export
(`wp eval-file learn/nl-translations-transfer.php export`). Terms follow `learn/nl-terminology.md`: "vertrouwende partij" (relying party),
"uitgever (issuer)" at the first prose mention per page, "houder", "walletaanbieder", "credential" and "wallet" unchanged, and "trust framework" kept in English, explained once with "afsprakenstelsel" where that is clearer
(agreement of 12 November 2026, see `learn/nl-terminology.md`; the context decides which term is clearest).

Fragment note: sentences with inline links are split by TranslatePress into fragments (text before the link, link text, text after).
The fragments in the last table are the likely splits; confirm them in the editor, and decide the article ("De houder", "Een uitgever")
per phrase as described in `learn/README.md`, "Fragments".

## New strings (no row exists yet)

| # | English source | Proposed Dutch | Route | Note |
|---|---|---|---|---|
| 1 | A wallet interaction involves several parties. One provides information, another holds it, and a service requests and checks it. Providers and trust services may support the process. | Bij een wallet-interactie zijn meerdere partijen betrokken. De ene partij verstrekt gegevens, een andere bewaart ze en een dienst vraagt ze op en controleert ze. Aanbieders en vertrouwensdiensten kunnen het proces ondersteunen. | learn/topics/ecosystem-roles (intro under the title) | Wording taken from the editorial outline. |
| 2 | Who does what when information moves through a wallet? | Wie doet wat wanneer gegevens via een wallet worden gedeeld? | learn/topics/ecosystem-roles | Panel heading. |
| 3 | A role describes what a party does in one interaction, not what kind of organisation it is. Start with the roles, then follow them through an example. | Een rol beschrijft wat een partij in één uitwisseling doet, niet wat voor soort organisatie het is. Begin met de rollen en volg ze daarna in een voorbeeld. | learn/topics/ecosystem-roles | |
| 4 | One example | Een voorbeeld | learn/topics/ecosystem-roles | Heading. |
| 5 | A training provider confirms that you completed a course. You keep that confirmation in a wallet. When you apply for a role, the employer asks to see it and checks it. The wallet software comes from a wallet provider, and agreements or registers can help the employer decide which issuers to recognise. | Een opleider bevestigt dat u een cursus hebt afgerond. U bewaart die bevestiging in een wallet. Wanneer u solliciteert naar een functie, vraagt de werkgever om de bevestiging te zien en controleert die. De wallet is software van een walletaanbieder, en afspraken of registers kunnen de werkgever helpen te bepalen welke uitgevers (issuers) hij erkent. | learn/topics/ecosystem-roles | First prose mention of the issuer on this page, so "uitgevers (issuers)". Check "opleider" against the existing "Training provider" row on How credentials connect. |
| 6 | The roles at a glance | De rollen in één oogopslag | learn/topics/ecosystem-roles | Heading. |
| 7 | Start with the first article. Where a separate article about a role is not available yet, the row points to the closest existing explanation. | Begin met het eerste artikel. Waar nog geen apart artikel over een rol bestaat, verwijst de regel naar de dichtstbijzijnde bestaande uitleg. | learn/topics/ecosystem-roles | Remove or reword this paragraph when the role articles exist. |
| 8 | Wallet providers and other service providers | Walletaanbieders en andere dienstverleners | learn/topics/ecosystem-roles | Row title. |
| 9 | Trust services and trust frameworks | Vertrouwensdiensten en trust frameworks (afsprakenstelsels) | learn/topics/ecosystem-roles | Row title. Agreed term: "trust frameworks", explained with "afsprakenstelsels" where it fits (`learn/nl-terminology.md`). In a title the gloss is optional: if it reads too heavy, use "Vertrouwensdiensten en trust frameworks" and put "afsprakenstelsels" in the row text. If the English title is changed to "Trust service providers and trust frameworks" (the role articles in progress), adapt the first half to "Aanbieders van vertrouwensdiensten". |
| 10 | Receives information, keeps it in a wallet and chooses what to share. | Ontvangt gegevens, bewaart ze in een wallet en kiest wat wordt gedeeld. | learn/topics/ecosystem-roles | Holder row. |
| 11 | Provides a credential and is responsible for what it confirms. | Verstrekt een credential en is verantwoordelijk voor wat het bevestigt. | learn/topics/ecosystem-roles | Issuer row; the heading "The issuer" already has a row. |
| 12 | Asks for information for a purpose and decides what to do with the result. | Vraagt gegevens op voor een doel en beslist wat er met het resultaat gebeurt. | learn/topics/ecosystem-roles | Relying party row. |
| 13 | Supply software and services that can support an interaction. Responsibilities differ per setup. | Leveren software en diensten die een uitwisseling kunnen ondersteunen. De verantwoordelijkheden verschillen per inrichting. | learn/topics/ecosystem-roles | |
| 14 | Agreements, registers and services that help parties decide what to recognise. | Afspraken, registers en diensten die partijen helpen te bepalen wat zij erkennen. | learn/topics/ecosystem-roles | Keep "afspraken" here: the sentence names agreements in general, not a specific trust framework. Do not add "trust framework" that the English does not contain. |
| 15 | Roles can overlap | Rollen kunnen samenvallen | learn/topics/ecosystem-roles | Heading. |
| 16 | One organisation can take more than one role. It may issue credentials in one service and receive them in another. A wallet provider is not automatically the issuer of a credential, and the party that receives information is not in every context the same as the software that checks it. | Een organisatie kan meer dan één rol vervullen. Ze kan in de ene dienst credentials uitgeven en in een andere ontvangen. Een walletaanbieder is niet automatisch de uitgever van een credential, en de partij die gegevens ontvangt is niet in elke context dezelfde als de software die ze controleert. | learn/topics/ecosystem-roles | Follows the agreement "A wallet provider is not automatically the issuer"; the checking software is the verifier (kept English elsewhere). |
| 17 | The EUDI Wallet and the European Business Wallet each have their own purpose and legal framework, so their roles should not be treated as the same. | De EUDI Wallet en de European Business Wallet hebben elk een eigen doel en juridisch kader, dus hun rollen moeten niet als gelijk worden behandeld. | learn/topics/ecosystem-roles | Names stay English. |
| 18 | compares them. | vergelijkt ze. | learn/topics/ecosystem-roles | Fragment after the link. |
| 19 | Look up the parties behind the roles: browse | Zoek de partijen achter de rollen op: bekijk | learn/topics/ecosystem-roles | Fragment before four links. |
| 20 | organisations | organisaties | learn/topics/ecosystem-roles | Link text; the other three link texts already have rows ("credential types", "personal wallets", "business wallets"). |
| 21 | Read | Lees | learn/topics/ecosystem-roles | Check: a row "Read" may exist; fragment before link in rows 2, 3, 4 and 6. |
| 22 | for now. | voorlopig. | learn/topics/ecosystem-roles | Fragment after the link in four rows ("Lees Issuing credentials for wallets voorlopig."); reword if the order reads awkwardly. |

## Rows that already exist and are reused unchanged

"Ecosystem roles" (Topics row title, now also link text on the Topics page and in five "Learn more" lists), "The holder", "The issuer",
"The relying party", "Terms you will meet", "Open the glossary →", "Issuer", "Holder + wallet", "Relying party", "Training provider",
"Recipient", "Employer", "The example is illustrative.", "Explore in the catalogs", "See the roles in practice",
"Explore real-world use cases →", "Connect the explanation to existing examples in the FIDES ecosystem.",
"How credentials connect issuers, wallets and services", "What is a digital wallet?" and the other article titles used as link text.
Their current Dutch is not touched. Check in the editor that the existing Dutch of "The holder", "The issuer" and "The relying party"
(taken from the EUDI article) fits as a row title here; if not, correct it there from a reviewed list, never by seed.

## Not proposed

The glossary chips ("Holder", "Issuer", "Relying Party", "Wallet Provider") and their popups come from the glossary data and are out of scope.
