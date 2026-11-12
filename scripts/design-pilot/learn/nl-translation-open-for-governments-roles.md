# Open Dutch strings: Ecosystem roles and For governments (12-13 November 2026)

**Update 13 Nov 2026:** all 24 strings below are now entered as "written by Cursor, for review" (tag C in `learn/nl-translation-changes-roles-governments-2026-11-12.md`, final wording there; some wording differs from the first proposal here). Nothing is open any more except the points under "Out of scope or staying English". The text below is the history.

**Proposals, not entered.** These English segments exist on the pages, but the edited document has no Dutch text that matches the current English (the English changed, or the document does not cover the segment). Nothing here is in the dictionary. After approval, add the rows to `learn/nl-translations.php`, run `apply` and then `export`, and remove the string from `OPEN_ENGLISH` in `tests/nl-roles-governments-checks.cjs`.

Terms follow `learn/nl-terminology.md`. "GBO", "OOTS", "ICTU" and the names of programmes and documents stay as they are.

## For governments overview

| English | Proposal | Page |
|---|---|---|
| The questions are similar in different countries. The answers depend on national law, existing registers and the wallets that are available. | De vragen lijken in verschillende landen op elkaar. De antwoorden hangen af van nationale wetgeving, bestaande registers en de beschikbare wallets. | overview |
| What does a service need to receive and check, and what does Article 5f say? | Wat moet een dienst ontvangen en controleren, en wat zegt artikel 5f? | overview |
| The articles use one Dutch programme, Gemeenschappelijke Bronontsluiting (GBO), as an example. Its design is described as a draft that is still in development, and other countries organise this differently. | De artikelen gebruiken één Nederlands programma, Gemeenschappelijke Bronontsluiting (GBO), als voorbeeld. Het ontwerp wordt beschreven als een concept dat nog in ontwikkeling is, en andere landen regelen dit anders. | overview |
| Read the context, version and status | Lees de context, versie en status | overview (link) |
| Look at who issues and uses credentials today: browse | Bekijk wie nu credentials uitgeeft en gebruikt: bekijk | overview (fragment before the catalog links; the links follow) |
| See public services in practice | Bekijk publieke diensten in de praktijk | overview (catalog block heading) |
| Content last checked: 12 November 2026. Descriptions of the Dutch example follow a published draft and can change. | Inhoud voor het laatst gecontroleerd op 12 november 2026. Beschrijvingen van het Nederlandse voorbeeld volgen een gepubliceerd concept en kunnen veranderen. | overview |

## Dutch example (GBO)

| English | Proposal | Page |
|---|---|---|
| In the Netherlands, the programme Gemeenschappelijke Bronontsluiting (GBO), run by ICTU, is developing a shared way for public bodies to make source data available to the EUDI Wallet, to OOTS and, with a citizen’s consent, to private service providers. Its design is still in development. | In Nederland ontwikkelt het programma Gemeenschappelijke Bronontsluiting (GBO), uitgevoerd door ICTU, een gedeelde manier waarop overheidsorganisaties brongegevens beschikbaar maken voor de EUDI Wallet, voor OOTS en, met toestemming van de burger, voor private dienstverleners. Het ontwerp is nog in ontwikkeling. | digital-wallets-and-public-services |
| More on the Dutch example, its version and status | Meer over het Nederlandse voorbeeld, de versie en de status | three articles (link) |
| In the Netherlands, the programme ... (long version: bronhouders, afsprakenstelsels, NL Wallet) | not proposed: the sentence is long and legally framed; translate it together with the reviewer of the GBO text. Keep "bronhouders" and "afsprakenstelsels" as in the English. | the-eudi-wallet-and-national-implementation |
| The draft presents the verify service as one way to meet the obligation, which it places in Article 45e of the amended eIDAS Regulation, that qualified providers can verify attributes against authentic sources. According to the draft, the parties involved are still deciding which route is preferred. It also says that GBO itself would not be the issuer of public attestations and that using the shared facility is optional. | not proposed: the reference to Article 45e needs a check against the official Dutch text before translating. | issuing-public-information-to-wallets |
| The draft separates what is described as available from what is still to be realised. ... development phase runs until December 2026 and the realisation phase through 2027. | not proposed: dates and status; translate together with the reviewer of the GBO text. | the-eudi-wallet-and-national-implementation |
| The Dutch GBO draft design describes separate routes by which public data can reach a service: ... The design is still in development. | not proposed: depends on the final Dutch wording of the three routes (see the next table). | accepting-information-from-wallets-in-public-services |
| a public service in another Member State requests evidence, and the person is described as reviewing and agreeing before it is sent. | een publieke dienst in een andere lidstaat bewijsstukken opvraagt en de persoon naar verluidt controleert en akkoord geeft voordat ze worden verstuurd. | the-eudi-wallet-and-national-implementation (list item after "OOTS:") |
| the person gives consent for a specific purpose, recipient and data set, and the private provider is described as receiving a party-specific pseudonym and not the citizen service number. | de persoon toestemming geeft voor een specifiek doel, een specifieke ontvanger en een specifieke gegevensset, en de private aanbieder naar verluidt een partijspecifiek pseudoniem ontvangt en niet het burgerservicenummer. | the-eudi-wallet-and-national-implementation (list item after "Consent-based sharing:") |
| "EUDI Wallet:", "OOTS:", "Consent-based sharing:", "Verify:", "Retrieve:" | The labels stay English (names of routes and services). If a Dutch label is wanted: "Toestemmingsgebaseerd delen:". Decide in the joint review. | the-eudi-wallet-and-national-implementation, issuing-public-information-to-wallets |

## Article 5f questions and answers (accepting information)

The English was reworded after the document was written, so the Dutch text in the document does not match any more. Proposals, to be checked against the current English sentence by sentence. The literal paragraph 1 sentence is entered (see below).

| English | Proposal |
|---|---|
| It applies where a Member State requires electronic identification and authentication to access an online service of a public sector body. A service that does not require this is not covered by paragraph 1. | Het geldt wanneer een lidstaat elektronische identificatie en authenticatie vereist voor toegang tot een onlinedienst van een overheidsinstantie. Een dienst die dat niet vereist, valt niet onder lid 1. |
| It says “also accept”. The wallet is added to the means a service accepts. The paragraph does not say that a service may accept only wallets. | Er staat “ook accepteren”. De wallet komt erbij als middel dat een dienst accepteert. Het lid zegt niet dat een dienst alleen wallets mag accepteren. |
| It concerns wallets provided in accordance with the Regulation. It does not mention other kinds of wallets. | Het gaat om wallets die overeenkomstig de verordening worden verstrekt. Andere soorten wallets worden niet genoemd. |
| Paragraph 1 does not name a date of its own. When wallets are available follows from other provisions of the Regulation and its implementing acts. | Lid 1 noemt zelf geen datum. Wanneer wallets beschikbaar zijn, volgt uit andere bepalingen van de verordening en de uitvoeringshandelingen. |
| It concerns access and authentication. It does not say which attributes or credentials a service must ask for, how the service must be built or what it decides on the basis of the answer. | Het gaat om toegang en authenticatie. Het zegt niet welke attributen of credentials een dienst moet opvragen, hoe de dienst moet worden gebouwd of wat de dienst besluit op basis van het antwoord. |
| This is a summary of the text, not legal advice. Read the Regulation and the national rules that apply to your service. | Dit is een samenvatting van de tekst en geen juridisch advies. Lees de verordening en de nationale regels die voor uw dienst gelden. |

Official Dutch title of Article 5f: not verified (EUR-Lex did not answer). The page uses "artikel 5f" as in the document.

## Catalog cards and data

| English | Proposal | Note |
|---|---|---|
| The catalog lists Kamer van Koophandel as the organisation. The catalog does not mark this use case as in production. | De catalogus noemt Kamer van Koophandel als organisatie. De catalogus markeert deze usecase niet als in productie. | Same pattern for TECH5 and Gemeente Nijmegen: "... markeert deze usecase als in productie, volgens opgave van de organisatie." Use case titles and organisation names come from the catalog and stay English. |
| Sharing information from a wallet | Informatie delen vanuit een wallet | Link title to a For you article, shown in "Meer uitleg" on the-holder; check the title of that page first. |

## Out of scope or staying English

- Glossary definitions (for example "authentieke bron", "Een publieke attestatie", "gekwalificeerde vertrouwensdienstverlener"): content of `interop-profiles`, not changed.
- Source lines "Organisation · Title" (W3C, European Commission, ICTU, EDI-Stelsel Nederland, ...): stay English by agreement.
- Chips "Holder", "Relying Party", "Wallet Provider", "Authentic Source", "European Digital Identity Wallet", "eIDAS Trust Service Provider", "QTSP (eIDAS)": stay English; the chip "Issuer" already shows "Uitgever" (existing row, not changed).

## Entered as an exact sentence

Article 5f paragraph 1 (accepting-information-from-wallets-in-public-services): "Als een lidstaat elektronische identificatie en authenticatie vereist voor toegang tot een onlinedienst van een overheidsinstantie, moet die lidstaat ook EUDI Wallets accepteren die aan de verordening voldoen."
