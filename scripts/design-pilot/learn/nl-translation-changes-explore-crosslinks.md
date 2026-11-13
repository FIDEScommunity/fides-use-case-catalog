# Dutch proposals: cross links between Explore and Learn (not seeded)

Status (13 November 2026): proposals for review. Nothing here is in `nl-translations.json`, in the TranslatePress dictionary or in the seed.
Terminology follows `learn/nl-terminology.md` (formal "u", "uitgever", "vertrouwende partij", "wallet" and "credential" stay).
Do not overwrite existing human translations. Link labels that equal a Learn article title already show the Dutch article title
(the label is translated through the existing title row), for example "Een wallet kiezen en beheren".

Until these rows are entered, the Dutch routes show the new English strings. `tests/nl-route-checks.cjs` reports them as
"no untranslated English sentences" on the touched Learn routes; that is deliberate, as with the earlier rounds.
The same gap already exists for the Business wallets strip ("New to business wallets?"), so no rows were added to the dictionary here.

## Strings on the Explore pages (editorial links, `learn/editorial-links.json`)

- Choosing a wallet? -> Een wallet kiezen?
- Learn what to look for and how to manage it. -> Lees waar u op let en hoe u een wallet beheert.
- Ecosystem roles explained -> Ecosysteemrollen uitgelegd
- Organizations describe their own roles. -> Organisaties beschrijven zelf welke rollen zij hebben.
- QTSP certification is imported from trusted list data. It is separate from the roles organizations describe for themselves.
  -> QTSP-certificering wordt overgenomen uit trusted-lijstgegevens. Dit staat los van de rollen die organisaties zelf beschrijven.
- Credential formats and interoperability (label, line below Formats & identifiers) -> existing Dutch title of the article
- Formats are one way to compare credential types. -> Formaten zijn één manier om credential types te vergelijken.
- What is a digital wallet? / What is a credential? And what is an attestation? (intro links on Use cases) -> existing Dutch article titles

## Strings in the Learn articles

- Explore credential types that report **SD-JWT VC** / **ISO mDoc** -> Bekijk credential types die **SD-JWT VC** / **ISO mDoc** vermelden
- Explore personal wallets that report **SD-JWT VC** -> Bekijk persoonlijke wallets die **SD-JWT VC** vermelden
- Explore personal wallets that report **OpenID4VCI** for issuance -> Bekijk persoonlijke wallets die **OpenID4VCI** vermelden voor uitgifte
- Explore personal wallets that report **OpenID4VP** for presentation -> Bekijk persoonlijke wallets die **OpenID4VP** vermelden voor presentatie
- Explore use cases from **Germany** -> Bekijk use cases uit **Duitsland**
- Explore organisations in **Germany** -> Bekijk organisaties in **Duitsland**
- Explore personal wallets from **Germany** -> Bekijk persoonlijke wallets uit **Duitsland**
- Explore use cases from the **Netherlands** -> Bekijk use cases uit **Nederland**
- Explore organisations in the **Netherlands** -> Bekijk organisaties in **Nederland**
- Explore personal wallets from the **Netherlands** -> Bekijk persoonlijke wallets uit **Nederland**
- An issuer in practice -> Een uitgever in de praktijk
- This use case shows an organisation that issues a credential to a person, who keeps it in an app and can share it later with other organisations.
  -> Deze use case laat zien hoe een organisatie een credential uitgeeft aan een persoon, die het in een app bewaart en later met andere organisaties kan delen.
- A relying party in practice -> Een vertrouwende partij in de praktijk
- This use case shows a municipality acting as a relying party: it asks a person to share specific attributes to log in to a municipal account.
  -> Deze use case laat zien hoe een gemeente optreedt als vertrouwende partij: zij vraagt een persoon om specifieke attributen te delen om in te loggen op een gemeentelijk account.
- UNTP in a use case -> UNTP in een use case
- This use case describes a textile product passport that is issued as a verifiable credential based on UNTP.
  -> Deze use case beschrijft een paspoort voor een textielproduct dat als verifiable credential op basis van UNTP wordt uitgegeven.
- See it in practice -> Zie het in de praktijk
- Explore the Interac / Nijmegen / Reeco use case -> Bekijk de use case van Interac / Nijmegen / Reeco

The title, the organisation line and the production sentence of the cards come from the use case record and stay as in the record
(the record text is English; the glossary and record texts are outside this round).
