# Dutch proposals: Learn > Topics > For governments (12 November 2026)

**Entered 12-13 Nov 2026 (local pilot):** the rows of this proposal that match the current English were entered in `learn/nl-translations.php` and exported (see `learn/nl-translation-changes-roles-governments-2026-11-12.md` for the entered Dutch and its source tag, and `learn/nl-translation-open-for-governments-roles.md` for what is still a proposal). The status line below describes the state before entry.

**Status: proposal only. None of these Dutch strings, including rows 24 and 25, is in `learn/nl-translations.json`, `nl-translations.php` or the local TranslatePress table (read-only check on 12 November 2026).** Nothing here is seeded, imported or written to `learn/nl-translations.json` / `nl-translations.php`. Translate in the
TranslatePress editor (`/nl/fides-design-pilot/learn/topics/for-governments/?trp-edit-translation=true`) after review, then export
(`wp eval-file learn/nl-translations-transfer.php export`). Terms follow `learn/nl-terminology.md`: "vertrouwende partij" (relying party),
"uitgever (issuer)" at the first prose mention per page, "houder", "walletaanbieder", "credential" and "wallet" unchanged, "trust framework"
kept (with "afsprakenstelsel" where clearer). Dutch terms for GBO: "Gemeenschappelijke Bronontsluiting (GBO)", "Globaal Ontwerp", "bronhouder"
(public body that holds a source; "source holder" in English), "afsprakenstelsel", "ter vaststelling". The English source stays leading. Sentences
with inline links are split into fragments by TranslatePress; confirm splits in the editor and decide the article per phrase (see `learn/README.md`, "Fragments").
The sentence that carries the GBO status now appears on article 4 only; translate it once. Rows 22 to 25 are new in the second pass.

## Key strings (headings, leads, status)

| # | English source | Proposed Dutch | Page |
|---|---|---|---|
| 1 | For governments | Voor overheden | overview, breadcrumb, Topics row |
| 2 | Public organisations meet wallets from two sides: they hold information people need to prove, and they run services that need to receive it. Start with the question closest to yours. | Overheidsorganisaties komen op twee manieren met wallets in aanraking: ze hebben gegevens die mensen moeten kunnen aantonen en ze bieden diensten die gegevens moeten ontvangen. Begin bij de vraag die het dichtst bij de uwe ligt. | overview lead |
| 3 | Four articles | Vier artikelen | overview (replaces the former heading and lead paragraph) |
| 4 | Start with a question | Begin met een vraag | overview |
| 5 | A Dutch example, still in development | Een Nederlands voorbeeld, nog in ontwikkeling | overview, ~4 articles ("A Dutch example" = "Een Nederlands voorbeeld") |
| 6 | The Dutch example is based on the Globaal Ontwerp (global design) of Gemeenschappelijke Bronontsluiting (GBO), version 0.9.5 (September 2026), a draft design submitted for adoption. Its arrangements are still in development and national arrangements can differ. | Het Nederlandse voorbeeld is gebaseerd op het Globaal Ontwerp van Gemeenschappelijke Bronontsluiting (GBO), versie 0.9.5 (september 2026), een conceptontwerp dat ter vaststelling is aangeboden. De inrichting is nog in ontwikkeling en nationale uitwerkingen kunnen verschillen. | article 4 only (articles 1 to 3 link to it) |
| 7 | Digital wallets and public services | Digitale wallets en publieke dienstverlening | article 1 title |
| 8 | Issuing public information to wallets | Publieke gegevens uitgeven aan wallets | article 2 title |
| 9 | Accepting information from wallets in public services | Gegevens uit wallets accepteren in publieke diensten | article 3 title |
| 10 | The EUDI Wallet and national implementation | De EUDI Wallet en nationale uitwerking | article 4 title |
| 11 | People regularly have to show public services information that a public body holds. Where could a wallet fit next to the ways they already do that? | Mensen moeten regelmatig gegevens die een overheidsorgaan bijhoudt aantonen bij publieke diensten. Waar past een wallet naast de manieren die ze nu al gebruiken? | article 1 lead |
| 12 | Which public information could people hold in a wallet? Start with the responsible body, the source of the information and what the credential should confirm. | Welke publieke gegevens zouden mensen in een wallet kunnen bewaren? Begin bij de verantwoordelijke organisatie, de bron van de gegevens en wat de credential moet bevestigen. | article 2 lead |
| 13 | What does a public service need to receive and check? Start with the decision the service makes, the information it needs and what happens when a wallet is not used. | Wat moet een publieke dienst ontvangen en controleren? Begin bij de beslissing die de dienst neemt, de gegevens die daarvoor nodig zijn en wat er gebeurt als geen wallet wordt gebruikt. | article 3 lead |
| 14 | What is set at European level, and what is decided nationally? A starting point for public organisations that want to see where national arrangements come in. | Wat ligt op Europees niveau vast en wat wordt nationaal bepaald? Een startpunt voor overheidsorganisaties die willen zien waar nationale afspraken een rol spelen. | article 4 lead |
| 15 | Questions to start with / Which question are you asking? | Vragen om mee te beginnen / Welke vraag stelt u? | articles 1 to 3 |
| 16 | Checking is not deciding | Controleren is niet beslissen | article 3 |
| 17 | What does Article 5f say about accepting wallets? | Wat zegt artikel 5f over het accepteren van wallets? | article 3 |
| 18 | What is decided nationally? | Wat wordt nationaal bepaald? | article 4 |
| 19 | Keep national information current | Houd nationale informatie actueel | article 4 |
| 20 | The register stays where it is | Het register blijft waar het is | article 2 |
| 21 | Wallets are one route among several | Wallets zijn één route naast andere | article 1 |
| 22 | Verify: the provider checks attribute values it has been given against the source before issuing. | Verify: de aanbieder controleert aangeleverde attributen bij de bron voordat hij uitgeeft. | article 2 |
| 23 | Retrieve: the provider fetches the attributes from the source, on behalf of the public body, and qualifies them. The draft calls this service optional. | Retrieve: de aanbieder haalt de attributen namens de overheidsorganisatie op bij de bron en kwalificeert ze. Het ontwerp noemt deze dienst optioneel. | article 2 |
| 24 | For public services, paragraph 1 provides that where Member States require electronic identification and authentication to access an online service provided by a public sector body, they shall also accept European Digital Identity Wallets that are provided in accordance with the Regulation. | Als een lidstaat elektronische identificatie en authenticatie vereist voor toegang tot een onlinedienst van een overheidsinstantie, moet die lidstaat ook EUDI Wallets accepteren die aan de verordening voldoen. | article 3 (wording supplied by the user, verbatim; the English matches in substance: Member State, public sector body, online service, EUDI Wallets that comply with the Regulation, "also") |
| 25 | The Regulation also contains rules for certain private parties and for very large online platforms. Their conditions are set out in Article 5f of Regulation (EU) 2024/1183; read them there, as some depend on implementing acts and on the type of service. | De verordening bevat ook regels voor bepaalde private partijen en voor zeer grote online platforms. De voorwaarden staan in artikel 5f van Verordening (EU) 2024/1183; lees ze daar, want sommige hangen af van uitvoeringshandelingen en van het soort dienst. | article 3 (shortened paragraphs 2 and 3) |

## GBO sentences that need a careful translation

| English source (summary of the draft design) | Proposed Dutch |
|---|---|
| The draft design describes each route as having its own parties, legal bases and protocols. Common source access therefore does not mean that all data travels the same way. | Het ontwerp beschrijft dat elke route eigen partijen, grondslagen en protocollen heeft. Een gemeenschappelijke bronontsluiting betekent dus niet dat alle gegevens op dezelfde manier worden gedeeld. |
| According to the draft, the parties involved are still deciding which route is preferred, and the governance for that choice sits outside GBO. | Volgens het ontwerp bepalen de betrokken partijen nog welke route de voorkeur heeft; de governance van die keuze valt buiten GBO. |
| The draft also says that GBO itself would not be the issuer of public attestations ... Which organisation could provide the shared facility is described as still to be decided. | Het ontwerp zegt ook dat GBO zelf geen uitgever van publieke attestaties is ... Welke organisatie de gedeelde voorziening zou kunnen aanbieden, moet nog worden bepaald. |
| The draft marks the issuing facility for the EUDI Wallet as still to be realised. It describes a plan and not a service that is available today. | Het ontwerp markeert de uitgiftevoorziening voor de EUDI Wallet als nog te realiseren. Het beschrijft een plan en geen voorziening die nu beschikbaar is. |
| The pages consulted do not state that the design has been adopted, and a newer version than 0.9.5 was not listed there. | In de geraadpleegde pagina's staat niet dat het ontwerp is vastgesteld en er wordt geen nieuwere versie dan 0.9.5 genoemd. |

The remaining body sentences follow the same terms; translate them in the editor and check the opener rule (no lone "A/An/The" directly before a link, term or bold text; the
article is part of the term or link text, as in the English source).

## Not proposed

Glossary chips and popups come from the glossary data and are out of scope. Source titles keep the original (Dutch) names of ICTU documents.
