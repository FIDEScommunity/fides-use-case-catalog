# Dutch repair round, 13 November 2026 (local pilot only)

Editorial review of the 26 "Tag C" rows (written by Cursor) in `learn/nl-translation-changes-roles-governments-2026-11-12.md`, plus terminology, role chips,
the For you article title, the three route strings that failed `tests/nl-route-checks.cjs`, the u-form of the practice-question texts and a check of
Article 45e. Source of the editorial text: `learn-nl-review-26-zinnen.md` (kept outside the repo). Everything was entered locally in
`learn/nl-translations.php` (`correct` for replacements, `apply` for empty rows) and exported with `nl-translations-transfer.php export`
(1144 -> 1167 entries; afterwards `status`: add 0, differs 0). Nothing was run on staging or production.

How replacements were made: `wp eval-file learn/nl-translations.php correct` rewrites a row only while it still holds the expected old Dutch (the Tag C text), so a
translation that a person entered is never overwritten. All 11 replaced rows still held the Tag C text. Existing human translations were not touched.

## 1. Tag C rows replaced (11 rows; old = Tag C by Cursor, new = editorial text)

| Row id (not recorded; rows are keyed on English text) | Page | English (start) | Old Dutch | New Dutch |
|---|---|---|---|---|
| - | for-governments (overview) | The articles use one Dutch programme, Gemeenschappelijke Bronontsluiti... | De artikelen gebruiken één Nederlands programma, Gemeenschappelijke Bronontsluiting (GBO), als voorbeeld. Het ontwerp wordt beschreven als een concept dat nog in ontwikkeling is, en andere landen regelen dit anders. | In deze artikelen gebruiken we het Nederlandse programma Gemeenschappelijke Bronontsluiting (GBO) als voorbeeld. Het ontwerp is nog in ontwikkeling. Andere landen kunnen dit anders inrichten. |
| - | for-governments (overview) | Look at who issues and uses credentials today: browse... | Zoek op wie nu credentials uitgeeft en gebruikt: bekijk | Bekijk wie credentials uitgeeft en gebruikt: |
| - | digital-wallets-and-public-services | The catalog lists Kamer van Koophandel as the organisation. The catalo... | De catalogus noemt Kamer van Koophandel als organisatie. De catalogus markeert deze usecase niet als in productie. | De catalogus noemt de Kamer van Koophandel als betrokken organisatie. De catalogus vermeldt deze usecase niet als in productie. |
| - | issuing-public-information-to-wallets | The catalog lists TECH5 as the organisation. The catalog marks this us... | De catalogus noemt TECH5 als organisatie. De catalogus markeert deze usecase als in productie, volgens opgave van de organisatie. | De catalogus noemt TECH5 als betrokken organisatie. Volgens opgave van de organisatie is deze usecase in productie. |
| - | accepting-information-from-wallets-in-public-services | The catalog lists Gemeente Nijmegen as the organisation. The catalog m... | De catalogus noemt Gemeente Nijmegen als organisatie. De catalogus markeert deze usecase als in productie, volgens opgave van de organisatie. | De catalogus noemt Gemeente Nijmegen als betrokken organisatie. Volgens opgave van de organisatie is deze usecase in productie. |
| - | issuing-public-information-to-wallets | The draft presents the verify service as one way to meet the obligatio... | Het ontwerp presenteert de verify-dienst als één manier om te voldoen aan de verplichting, die het onderbrengt in artikel 45e van de gewijzigde eIDAS-verordening, dat gekwalificeerde aanbieders attributen bij authentieke bronnen kunnen verifiëren. Volgens het ontwerp beslissen de betrokken partijen nog welke route de voorkeur heeft. Het ontwerp zegt ook dat GBO zelf niet de uitgever van publieke attestaties zou zijn en dat het gebruik van de gedeelde voorziening optioneel is. | Het ontwerp beschrijft de controledienst (verify) als één manier om invulling te geven aan de verplichting voor lidstaten om maatregelen te nemen waarmee gekwalificeerde aanbieders van elektronische attestaties van attributen op verzoek van de gebruiker attributen elektronisch bij authentieke bronnen kunnen verifiëren, ten minste voor de attributen uit bijlage VI die op authentieke bronnen in de publieke sector berusten, binnen het toepasselijke recht. Het ontwerp verwijst daarbij naar artikel 45e van de gewijzigde eIDAS-verordening. Volgens het ontwerp bepalen de betrokken partijen nog welke uitgifteroute de voorkeur heeft. GBO zou zelf geen publieke attestaties uitgeven en gebruik van de gedeelde voorziening is optioneel. |
| - | accepting-information-from-wallets-in-public-services (5f point 2) | It says “also accept”. The wallet is added to the means a service acce... | Er staat “ook accepteren”. De wallet komt erbij als middel dat een dienst accepteert. Het lid zegt niet dat een dienst alleen wallets mag accepteren. | In lid 1 staat dat lidstaten de wallets ook moeten accepteren. Het lid bepaalt niet dat een dienst uitsluitend wallets mag accepteren. |
| - | accepting-information-from-wallets-in-public-services (5f point 5) | It concerns access and authentication. It does not say which attribute... | Het gaat om toegang en authenticatie. Het zegt niet welke attributen of credentials een dienst moet opvragen, hoe de dienst moet worden gebouwd of wat de dienst besluit op basis van het antwoord. | Het gaat om toegang en authenticatie. Lid 1 schrijft niet voor welke attributen of credentials een dienst moet opvragen, hoe de dienst moet worden ingericht of welke beslissing de dienst neemt. |
| - | accepting-information-from-wallets-in-public-services | The Dutch GBO draft design describes separate routes by which public d... | Het Nederlandse GBO-conceptontwerp beschrijft afzonderlijke routes waarlangs publieke gegevens een dienst kunnen bereiken: een presentatie vanuit een wallet na uitgifte, een grensoverschrijdend bewijsverzoek via OOTS en delen met private aanbieders op basis van toestemming. Een dienst moet er daarom niet van uitgaan dat een presentatie vanuit een wallet de enige manier is waarop informatie haar bereikt. Het ontwerp is nog in ontwikkeling. | Het Nederlandse GBO-ontwerp beschrijft verschillende routes waarlangs publieke gegevens een dienst kunnen bereiken: via een wallet nadat een attestatie is uitgegeven, via een grensoverschrijdend bewijsverzoek met OOTS en via gegevensdeling met private dienstverleners op basis van toestemming. Een dienst kan gegevens dus ook op andere manieren dan via een wallet ontvangen. Het ontwerp is nog in ontwikkeling. |
| - | the-eudi-wallet-and-national-implementation (OOTS item) | a public service in another Member State requests evidence, and the pe... | een publieke dienst in een andere lidstaat bewijs opvraagt, en de persoon wordt beschreven als iemand die dit bekijkt en ermee instemt voordat het wordt verstuurd. | een publieke dienst in een andere lidstaat bewijs opvraagt en de betrokkene dat volgens het ontwerp kan bekijken en ermee kan instemmen voordat het wordt verstuurd. |
| - | the-eudi-wallet-and-national-implementation (DvTP item) | the person gives consent for a specific purpose, recipient and data se... | de persoon toestemming geeft voor een specifiek doel, een specifieke ontvanger en een specifieke gegevensset, en de private aanbieder wordt beschreven als ontvanger van een partijspecifiek pseudoniem en niet van het burgerservicenummer. | de betrokkene toestemming geeft voor een specifiek doel, een specifieke ontvanger en een specifieke gegevensset. Volgens het ontwerp ontvangt de private dienstverlener een pseudoniem dat specifiek voor die partij is, en geen burgerservicenummer. |

Notes per row:

- Overview intro (GBO), catalog fragment: the English segment boundaries were checked in the rendered pages (`tests/nl-roles-governments-segments.php`): the fragment
  "Look at who issues and uses credentials today: browse" is followed by the links "use cases, credential types, personal wallets, business wallets and organisations" (separate
  segments) and a full stop, so the Dutch fragment ends with a colon: "Bekijk wie credentials uitgeeft en gebruikt:" and reads "... gebruikt: usecases, credentialtypen, persoonlijke wallets, business wallets en organisaties."
- Practice cards: the English sentence is one segment per card including the dynamic organisation name (`Fides_DS_Learn::usecase_status_text()` in tiles), so each organisation
  has its own row. TECH5 and Gemeente Nijmegen follow the same pattern (the "shared translation rule" is a pattern, not one row). Other cards keep their existing rows,
  entered by people and not changed: Credenco ("... als betrokken organisatie. Volgens de opgave van de organisatie is deze usecase in productie."), Hovi ("... Volgens de catalogus is deze usecase niet in productie."),
  Robert Bosch GmbH ("... en vermeldt deze usecase niet als in productie."). They differ slightly in wording from the new pattern; see open questions in the report.
  The meaning of the record status is kept: "does not mark ... as in production" (productionDeployment = no) is "vermeldt ... niet als in productie"; "marks ... as in production, as reported by the organisation" is "Volgens opgave van de organisatie is ... in productie".
- Article 45e: see section 4. The text differs from the editorial text on one point (conditions added) and that is intentional.
- Article 5f points 2 and 5, GBO paragraph, OOTS and DvTP fragments: editorial text as given. The OOTS and DvTP rows start with a lower-case fragment because they continue a list item
  after the English label "OOTS:" / "Consent-based sharing:" (the English fragment was compared: "is described as reviewing and agreeing" corresponds to "kan bekijken en ermee kan instemmen" in the editorial text; that is also how the OOTS preview step works).

## 2. Tag C rows checked and kept as they were (the other 15)

The other Tag C rows were kept as the basis, as the review says: the For governments intro question, the teaser of article 3, "Lees de context, versie en status", "Bekijk publieke diensten in de praktijk", the closing note,
the GBO sentence of article 1, "Meer over het Nederlandse voorbeeld, de versie en de status" (shared by three pages), 5f points 1, 3, 4 and the closing sentence, the long GBO sentence of article 4,
"Delen op basis van toestemming:", "Informatie delen vanuit een wallet" and the status passage.

- Status passage ("The draft separates what is described as available ..."): kept. It already says that the legislation and planning come from the draft and from the ICTU programme page. Checked against
  https://www.ictu.nl/projecten/gezamenlijke-aanpak-voor-uniform-delen-van-gegevens/ on 12/13 November 2026: development phase July-December 2026, realisation phase January-December 2027; the Globaal Ontwerp (v0.9.5, September 2026) is still marked as not final. No change needed.

## 3. Rows filled (were empty23 rows) and the shared-row effects

| Row id (not recorded; rows are keyed on English text) | English | New Dutch | Reason |
|---|---|---|---|
| - | What should a service check when receiving a credential? | Wat moet een dienst controleren bij ontvangst van een credential? | route check (task 5) |
| - | Take supplier onboarding as an example. ... Which role does your organisation play in it? (whole paragraph, one TranslatePress string) | Neem het aansluiten van een leverancier als voorbeeld. Een klant vraagt om bedrijfsgegevens, bewijs van een certificering en bevestiging dat een vertegenwoordiger namens de leverancier mag handelen. Welke rol speelt uw organisatie daarin? | route check; first two sentences taken from the an older row entered by people, last sentence as in the review |
| - | The European Commission published its proposal in 2025. The Council adopted its negotiating position on 9 June 2026, and in October 2026 the European Parliament decided ... | De Europese Commissie publiceerde haar voorstel in 2025. De Raad stelde zijn onderhandelingspositie vast op 9 juni 2026 en het Europees Parlement besloot in oktober 2026 onderhandelingen met de Raad te openen. De uiteindelijke regels en de uitvoering kunnen afwijken van het voorstel en de onderhandelingsposities. Uit het voorstel zelf volgt geen verplichting voor organisaties. | route check; status verified (section 5) |
| - | Holder | Houder | role chip |
| - | Relying Party | Vertrouwende partij | role chip |
| - | Wallet Provider | Walletaanbieder | role chip |
| - | Authentic Source | Authentieke bron | role chip |
| - | Verify: | Controleren (verify): | first explanation (label of the GBO list) |
| - | Retrieve: | Ophalen (retrieve): | first explanation (label of the GBO list) |
| - | How can someone act for an organisation? | Hoe kan iemand namens een organisatie handelen? | title, u-form article (proposal) |
| - | How can an organisation prepare a wallet use case? | Hoe kan een organisatie een wallet-toepassing voorbereiden? | title |
| - | Choose one interaction and settle the information and arrangements. | Kies één interactie en leg de informatie en afspraken vast. | overview teaser |
| - | Check the credential, then decide whether the information is enough. | Controleer de credential en beslis daarna of de informatie volstaat. | overview teaser |
| - | Look at your own exchange | Kijk naar uw eigen uitwisseling | CTA of the preparation article |
| - | Work through one exchange with your team in the Wallet Readiness Workshop. | Werk één uitwisseling met uw team uit in de Wallet Readiness Workshop. | CTA text |
| - | Which role does your organisation play, and how do you choose a business wallet? Start from one transaction, ... | Welke rol speelt uw organisatie, en hoe kiest u een business wallet? Begin bij één transactie en vergelijk daarna wallets en aanbieders. | still failing after the three strings (see below) |
| - | may help an organisation manage or present some of that information. Products differ, ... see | kan helpen om een deel van die gegevens te beheren of te tonen. Producten verschillen, dus de eerste vragen zijn welke rol uw organisatie speelt en welke interactie u wilt ondersteunen. Dit artikel helpt u een business wallet te kiezen. Hoe u één concrete uitwisseling in detail voorbereidt, leest u in | idem |
| - | Compare wallets and providers | Vergelijk wallets en aanbieders | idem (heading) |
| - | When comparing wallets and providers, consider the credential types, ... | Houd bij het vergelijken van wallets en aanbieders rekening met de credentialtypen, formaten en protocollen die elke partij ondersteunt en met de afspraken over vertrouwen voor het proces. Kijk ook naar toegangsbeheer, integratie met bestaande systemen, uitrol en ondersteuning. Een functie die in een catalogus staat, is een startpunt voor het gesprek. Het toont op zichzelf niet aan dat de hele uitwisseling werkt tussen de partijen die u op het oog hebt. | idem |
| - | Decide which role your organisation needs to play and shortlist ... | Bepaal welke rol uw organisatie moet spelen en maak een shortlist van één of twee wallets of aanbieders die daarbij passen. Beschrijf daarna één uitwisseling in detail: één transactie, één ontvangende dienst en het bewijs dat die nodig heeft. | idem |
| - | walks through it. A | loopt dat met u door. Een | idem (the link "readiness workshop" stays English by terminology) |
| - | The supplier example is illustrative. Content last checked: 12 November 2026. The status of the European Business Wallet proposal can change; ... | Het leveranciersvoorbeeld is bedoeld ter illustratie. Inhoud voor het laatst gecontroleerd op 12 november 2026. De stand van het voorstel voor de European Business Wallet kan veranderen; controleer die opnieuw voordat u op deze pagina vertrouwt. | idem (note; wording of the older row with the new date) |
| - | The supplier example is illustrative. Content last checked: 12 November 2026. The legislative status can change. | Het leveranciersvoorbeeld is bedoeld ter illustratie. Inhoud voor het laatst gecontroleerd op 12 november 2026. De stand van het wetsvoorstel kan veranderen. | European Business Wallet note (wording of the older row with the new date) |

Deviation: the assignment named three strings behind the 6 route-check failures. After translating them, `nl-route-checks.cjs` still reported 4 failures (2 pages x 2 widths): "Business wallets: where to start" and "European Business Wallet" had more English
second-pass sentences (the excerpt, the intro paragraph tail, the heading "Compare wallets and providers", the comparison paragraph, "Decide which role ...", the fragment before the workshop link, and two "Content last checked" notes). They were translated from the proposals
in `nl-translation-changes-practice-questions.md` (u-form) and the wording of the older rows, so the check reaches 0 failures. The title rows of the three practice articles are now Dutch; **the article bodies of the three practice-question articles and of For you
(overview, receiving, sharing, choosing) are still English** on /nl/ (no Dutch exists apart from the titles and the rows above).

### Shared-row effects of the four role chips (checked before entry with a scan of the /nl/ pages, and again after entry)

TranslatePress rows are global (exact English text), so the four chip rows act wherever the exact text "Holder", "Relying Party", "Wallet Provider" or "Authentic Source" is shown:

| Where | Before | After |
|---|---|---|
| Learn: ecosystem-roles overview, for-governments overview, the-big-picture overview (term chips) | English | Houder, Vertrouwende partij, Walletaanbieder, Authentieke bron |
| `/business-wallets/` catalog (role tags and the filter option "Holder") | Holder | Houder (the tag "Issuer" was already "Uitgever", "Verifier" stays English) |
| `/organizations/` catalog (tags and the filter option "Relying Party") | Relying Party | Vertrouwende partij (next to the existing "Uitgever") |
| English test pages `fides-template-test-eudi-wallet`, `fides-template-test-personal-wallets` | English | Dutch on their /nl/ view |
| `/glossary/` (term names) | English | **unchanged** (the glossary shows its own names; definitions untouched) |
| `/credential-catalog/` | not checked | not checked |

No layout change: no horizontal overflow on the catalog pages at 1440 and 390 px. Interactive filtering with the Dutch labels was not clicked through (visual check only); the existing "Uitgever" label works the same way.

Existing lower-case rows (holder, relying party, wallet provider, authentic source) were already Dutch and not touched.

## 4. Article 45e check (task 7)

Source: EUR-Lex consolidated text of Regulation (EU) No 910/2014 (EUR-Lex consolidated version).
Article 45e(1), "Verification of attributes against authentic sources": Member States shall ensure, within 24 months of the date of entry into force of the implementing acts referred to in Articles 5a(23) and 5c(6), that, at least for the attributes listed in Annex VI, wherever those attributes rely on authentic sources within the public sector, measures are taken to allow qualified trust service providers of electronic attestations of attributes to verify those attributes by electronic means at the request of the user, in accordance with Union or national law.

Result: the existing English sentence ("... the obligation, which it places in Article 45e of the amended eIDAS Regulation, that qualified providers can verify attributes against authentic sources") is a short summary of what the draft says. It is not factually wrong, but it is **too broad**: it leaves out that the duty is on Member States (measures), that the verification is at the user's request, that it concerns at least the Annex VI attributes that rely on public-sector authentic sources, and that it is subject to Union or national law. The editorial Dutch text ("relevante attributen") was equally broad. The Dutch text now reads: "... de verplichting voor lidstaten om maatregelen te nemen waarmee gekwalificeerde aanbieders van elektronische attestaties van attributen op verzoek van de gebruiker attributen elektronisch bij authentieke bronnen kunnen verifiëren, ten minste voor de attributen uit bijlage VI die op authentieke bronnen in de publieke sector berusten, binnen het toepasselijke recht." The English, the seed and the tests were **not** changed (hash protection respected, `LEARN_DRY_RUN` not needed).
Proposal for the English (not applied): "The draft presents the verify service as one way to meet the obligation of Member States, in Article 45e of the amended eIDAS Regulation, to take measures that allow qualified providers of electronic attestations of attributes to verify attributes against authentic sources at the user's request, at least for the Annex VI attributes that rely on public-sector authentic sources." Note that the Dutch text now says more than the English segment; the next English edit should align them.
Article 5f(1) was compared to the same consolidated text ("Where Member States require electronic identification and authentication to access an online service provided by a public sector body, they shall also accept European Digital Identity Wallets that are provided in accordance with this Regulation"); the 5f rows are consistent with it. Dutch article titles of 5f/45e were not verified on EUR-Lex NL.

## 5. European Business Wallet status (task 5)

Checked on 12/13 November 2026: Parliament Legislative Observatory procedure file,
and the Council press release of 9 June 2026 ("European business wallets: Council adopts negotiating position"). The English source sentence ("The Council adopted its negotiating position on 9 June 2026, and in October 2026 the European Parliament decided to open negotiations with the Council.") is accurate and not outdated; the Dutch sentence follows it. Parliament has not adopted its first-reading position yet, which the English does not claim.

## 6. For you article title (task 4)

"Sharing information from a wallet" -> "Informatie delen vanuit een wallet" is one global row (entered as Tag C row 26). It is used as H1, breadcrumb, teaser on `for-you`, link on `the-holder` ("Meer uitleg") and link on `receiving-information-in-a-wallet`.
Checked at 1440 and 390 px (`tests/nl-repair-round-checks.cjs`). Not changed: the HTML `<title>` of every /nl/ page is English on the pilot (TranslatePress does not translate it here), and the sibling For you rows ("Receiving information in a wallet", the overview lead, the teasers) have no Dutch yet.

## 7. u-form of the practice-question texts (task 6)

The three practice-question articles had no Dutch article text in TranslatePress (only proposals in `nl-translation-changes-practice-questions.md`, written with "je/jouw"). The proposals were converted to the formal "u" (also the superseded title proposal
"Waar moet een dienst op letten bij het ontvangen van een credential?" was replaced by the editorial title "Wat moet een dienst controleren bij ontvangst van een credential?"). The rows that were entered (titles, overview teasers, CTA) are in the u-form. No existing Dutch row on the route contained "je/jij/jouw/jullie".
`tests/nl-repair-round-checks.cjs` checks this on the rendered pages, the transfer file and the proposal file. The For you proposals (`nl-translation-changes-for-you.md`, "Voor jou ... je") were not part of this round and still use "je".
Visible titles of internal links use the Dutch page title: the title rows of the three articles are global, so the "Learn more" lists, teasers and breadcrumbs show the same Dutch title.

